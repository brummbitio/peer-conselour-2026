package handler

import (
	"bytes"
	"context"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"peer-conselour-be/config"
	"peer-conselour-be/internal/model"
	"peer-conselour-be/pkg/media"
	"peer-conselour-be/pkg/storage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

func (h *UploadHandler) UploadFile(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File tidak ditemukan dalam request"})
		return
	}
	defer file.Close()

	// Validasi ukuran file maksimal 10 MB
	const maxFileSize = 10 * 1024 * 1024 // 10 MB
	if header.Size > maxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran file melebihi batas maksimal (10 MB)"})
		return
	}

	// 1. Detect MIME type using Magic Numbers (512 bytes)
	mimeType, fullData, err := media.DetectMimeType(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mendeteksi tipe file"})
		return
	}

	// 2. Validate MIME type
	if !media.AllowedMimeTypes[mimeType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipe file tidak diizinkan. Hanya mengizinkan PDF, Word, JPEG, PNG, dan WebP"})
		return
	}

	// 3. Process file (Convert & Resize if Image)
	var finalData []byte
	var finalMimeType = mimeType
	var finalFileName = header.Filename
	var ext = filepath.Ext(header.Filename)

	if strings.HasPrefix(mimeType, "image/") {
		// Convert and resize to WebP
		processed, err := media.ProcessImage(fullData, mimeType)
		if err != nil {
			log.Printf("Peringatan: Gagal memproses gambar ke WebP (%v), mengunggah gambar asli", err)
			finalData = fullData
		} else {
			finalData = processed
			finalMimeType = "image/webp"
			ext = ".webp"
			
			// Update file name extension to webp
			origNameWithoutExt := strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))
			finalFileName = origNameWithoutExt + ".webp"
		}
	} else {
		finalData = fullData
	}

	// 4. Generate unique MinIO object name (UUID)
	objectName := uuid.New().String() + ext

	// 5. Upload to MinIO
	ctx := context.Background()
	reader := bytes.NewReader(finalData)
	err = storage.UploadFile(ctx, objectName, reader, int64(len(finalData)), finalMimeType)
	if err != nil {
		log.Printf("Gagal mengunggah file ke storage: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengunggah file ke storage"})
		return
	}

	// Extract uploader ID from context
	userIDVal, exists := c.Get("userID")
	var uploaderID *uint
	if exists {
		uid := userIDVal.(uint)
		uploaderID = &uid
	}

	// 6. Save metadata to Database
	attachment := &model.Attachment{
		FileName:    finalFileName,
		MinioObject: objectName,
		MimeType:    finalMimeType,
		FileSize:    int64(len(finalData)),
		UploaderID:  uploaderID,
		CreatedAt:   time.Now(),
	}

	err = config.DB.Create(attachment).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan metadata file ke database"})
		return
	}

	// 7. Generate Temporary Presigned GET URL (15 minutes expiry)
	presignedURL, err := storage.GetPresignedURL(ctx, objectName, 15*time.Minute)
	if err != nil {
		log.Printf("Peringatan: Gagal generate presigned URL: %v", err)
	} else {
		attachment.URL = presignedURL
	}

	c.JSON(http.StatusCreated, attachment)
}
