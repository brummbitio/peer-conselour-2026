package main

import (
	"context"
	"fmt"
	"log"

	"peer-conselour-be/config"
	"peer-conselour-be/internal/handler"
	"peer-conselour-be/internal/repository"
	"peer-conselour-be/internal/model"
	"peer-conselour-be/internal/notification"
	"peer-conselour-be/internal/worker"
	"peer-conselour-be/pkg/email"
	"peer-conselour-be/pkg/storage"
	"peer-conselour-be/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load Konfigurasi
	config.LoadConfig()

	// 2. Konek ke Database PostgreSQL
	config.ConnectDatabase()

	// 2.3. Inisialisasi MinIO Object Storage
	storage.InitMinio()

	// 2.5. Buat PostgreSQL ENUM types sebelum AutoMigrate
	// GORM tidak otomatis membuat ENUM type, jadi harus dibuat manual
	log.Println("Membuat ENUM types PostgreSQL...")
	enumStatements := []string{
		"DO $$ BEGIN CREATE TYPE user_role AS ENUM ('student', 'admin', 'superadmin'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
		"DO $$ BEGIN CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
		"DO $$ BEGIN CREATE TYPE message_sender AS ENUM ('mahasiswa', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
		"DO $$ BEGIN CREATE TYPE schedule_status AS ENUM ('pending_confirmation', 'scheduled', 'reschedule', 'cancelled', 'completed'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
		"DO $$ BEGIN CREATE TYPE service_type AS ENUM ('tatap_muka', 'online'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
	}
	for _, stmt := range enumStatements {
		if result := config.DB.Exec(stmt); result.Error != nil {
			log.Printf("Peringatan saat membuat ENUM: %v", result.Error)
		}
	}
	log.Println("ENUM types siap.")

	// 2.6. Auto Migrasi Database
	log.Println("Menjalankan migrasi database...")
	err := config.DB.AutoMigrate(
		&model.User{},
		&model.Ticket{},
		&model.TicketMessage{},
		&model.CounselingSchedule{},
		&model.Attachment{},
	)
	if err != nil {
		log.Fatalf("Gagal melakukan auto-migrasi database: %v", err)
	}
	log.Println("Migrasi database berhasil.")

	// 2.7. Inisialisasi email notifikasi tiket
	mailer, err := email.NewMailer(email.Settings{
		Enabled:       config.AppConfig.EmailEnabled,
		Host:          config.AppConfig.SMTPHost,
		Port:          config.AppConfig.SMTPPort,
		Secure:        config.AppConfig.SMTPSecure,
		User:          config.AppConfig.SMTPUser,
		Password:      config.AppConfig.SMTPPassword,
		FromName:      config.AppConfig.SMTPFromName,
		FromEmail:     config.AppConfig.SMTPFromEmail,
		DevMode:       config.AppConfig.EmailDevMode,
		DevOverrideTo: config.AppConfig.EmailDevOverrideTo,
	})
	if err != nil {
		log.Fatalf("Konfigurasi email tidak valid: %v", err)
	}
	switch {
	case !mailer.Enabled():
		log.Println("Email notifikasi nonaktif (EMAIL_ENABLED=false).")
	case mailer.DevMode():
		log.Printf("Email notifikasi aktif (DEV MODE): semua email dialihkan ke %s.", mailer.DevOverrideTo())
	default:
		log.Println("PERHATIAN: Email notifikasi aktif (PRODUCTION): email dikirim ke mahasiswa asli.")
	}
	ticketNotifier := notification.NewTicketNotifier(mailer, config.AppConfig.EmailLinkBaseURL)

	// 3. Inisialisasi Repository & Handler
	userRepo := repository.NewUserRepository(config.DB)
	ticketRepo := repository.NewTicketRepository(config.DB)
	messageRepo := repository.NewMessageRepository(config.DB)
	scheduleRepo := repository.NewScheduleRepository(config.DB)

	authHandler := handler.NewAuthHandler(userRepo)
	ticketHandler := handler.NewTicketHandler(ticketRepo, messageRepo, userRepo, ticketNotifier)
	scheduleHandler := handler.NewScheduleHandler(scheduleRepo)
	userHandler := handler.NewUserHandler(userRepo, ticketRepo)
	uploadHandler := handler.NewUploadHandler()

	// 3.5. Background worker reminder email berjenjang (H+1, H+3, H+5, H+7)
	go worker.NewReminderWorker(ticketRepo, ticketNotifier).Start(context.Background())

	// 4. Setup router Gin
	router := gin.Default()

	// Terapkan CORS middleware ke semua route
	router.Use(middleware.CORSMiddleware())

	// Terapkan Rate Limiting middleware (20 request/detik, burst 40)
	router.Use(middleware.RateLimitMiddleware(20, 40))

	// Route uploads (dilindungi Auth token)
	router.POST("/api/uploads", middleware.AuthMiddleware(), uploadHandler.UploadFile)

	// Endpoint tes awal
	router.GET("/api/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
			"status":  "backend active",
		})
	})

	// 5. REGISTRASI ROUTE AUTHENTICATION
	authRoutes := router.Group("/api/auth")
	{
		authRoutes.GET("/sso", authHandler.SSOLogin)
		authRoutes.GET("/callback", authHandler.SSOCallback)
		
		// Hanya daftarkan dev-login di lingkungan development
		if config.AppConfig.Env == "development" {
			authRoutes.GET("/dev-login", authHandler.DevLogin)
		}
		authRoutes.POST("/logout", authHandler.Logout)

		// Endpoint yang dilindungi JWT
		protectedAuth := authRoutes.Group("")
		protectedAuth.Use(middleware.AuthMiddleware())
		{
			protectedAuth.GET("/me", authHandler.GetMe)
			protectedAuth.PUT("/profile", authHandler.UpdateProfile)
		}
	}

	// 6. REGISTRASI ROUTE TICKETS (MAHASISWA)
	ticketRoutes := router.Group("/api/tickets")
	ticketRoutes.Use(middleware.AuthMiddleware())
	{
		ticketRoutes.GET("", ticketHandler.GetMyTickets)
		ticketRoutes.POST("", ticketHandler.CreateTicket)
		ticketRoutes.GET("/:id", ticketHandler.GetTicketDetail)
		ticketRoutes.POST("/:id/messages", ticketHandler.ReplyTicket)
		ticketRoutes.PUT("/:id/messages/:messageId", ticketHandler.UpdateMessage)
		ticketRoutes.DELETE("/:id/messages/:messageId", ticketHandler.DeleteMessage)
		ticketRoutes.PUT("/:id/resolve", ticketHandler.StudentResolveTicket)
	}

	// 7. REGISTRASI ROUTE ADMIN (KONSULOR / STAFF)
	adminRoutes := router.Group("/api/admin")
	adminRoutes.Use(middleware.AuthMiddleware(), middleware.AdminOnly())
	{
		// Statistik Dashboard Admin
		adminRoutes.GET("/stats", ticketHandler.AdminGetStats)

		// Tiket & Chat Admin
		adminRoutes.GET("/tickets", ticketHandler.AdminGetAllTickets)
		adminRoutes.PUT("/tickets/:id", ticketHandler.AdminUpdateTicket)
		adminRoutes.GET("/tickets/:id", ticketHandler.GetTicketDetail)
		adminRoutes.POST("/tickets/:id/messages", ticketHandler.ReplyTicket)
		adminRoutes.PUT("/tickets/:id/messages/:messageId", ticketHandler.UpdateMessage)
		adminRoutes.DELETE("/tickets/:id/messages/:messageId", ticketHandler.DeleteMessage)

		// Penjadwalan (Kanban / Kalender) Admin
		adminRoutes.GET("/schedules", scheduleHandler.GetAllSchedules)
		adminRoutes.POST("/schedules", scheduleHandler.CreateSchedule)
		adminRoutes.PUT("/schedules/:id", scheduleHandler.UpdateSchedule)
		adminRoutes.DELETE("/schedules/:id", scheduleHandler.DeleteSchedule)

		// Manajemen Klien (Mahasiswa)
		adminRoutes.GET("/students", userHandler.AdminGetAllStudents)
		adminRoutes.GET("/students/:id", userHandler.AdminGetStudentDetail)

		// Manajemen Akun Admin / Peer Counselor
		adminRoutes.GET("/admins", userHandler.AdminGetAllAdmins)
		
		// Khusus Superadmin (Pembuatan, Edit, & Reset Password Admin)
		superAdminRoutes := adminRoutes.Group("")
		superAdminRoutes.Use(middleware.SuperAdminOnly())
		{
			superAdminRoutes.POST("/admins", userHandler.AdminCreateAdmin)
			superAdminRoutes.PUT("/admins/:id", userHandler.AdminUpdateAdmin)
			superAdminRoutes.POST("/admins/:id/reset-password", userHandler.AdminResetPassword)
		}
	}

	// 8. Jalankan server
	addr := fmt.Sprintf(":%s", config.AppConfig.Port)
	log.Printf("Server berjalan di port %s...", config.AppConfig.Port)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
