package storage

import (
	"context"
	"io"
	"log"
	"net/url"
	"time"

	"peer-conselour-be/config"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var MinioClient *minio.Client

func InitMinio() {
	var err error
	MinioClient, err = minio.New(config.AppConfig.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(config.AppConfig.MinioAccessKey, config.AppConfig.MinioSecretKey, ""),
		Secure: config.AppConfig.MinioUseSSL,
	})
	if err != nil {
		log.Fatalf("Gagal inisialisasi MinIO client: %v", err)
	}

	// Buat bucket jika belum ada
	ctx := context.Background()
	bucketName := config.AppConfig.MinioBucketName
	exists, err := MinioClient.BucketExists(ctx, bucketName)
	if err != nil {
		log.Printf("Peringatan: Gagal memeriksa keberadaan bucket MinIO '%s': %v", bucketName, err)
		return
	}

	if !exists {
		err = MinioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			log.Fatalf("Gagal membuat bucket MinIO '%s': %v", bucketName, err)
		}
		log.Printf("Berhasil membuat bucket MinIO baru: '%s'", bucketName)
	} else {
		log.Printf("Bucket MinIO '%s' sudah tersedia.", bucketName)
	}
}

// UploadFile mengunggah file ke bucket MinIO
func UploadFile(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) error {
	_, err := MinioClient.PutObject(ctx, config.AppConfig.MinioBucketName, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

// GetPresignedURL membuat link akses berkas sementara (temporary link)
func GetPresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)
	presignedURL, err := MinioClient.PresignedGetObject(
		ctx,
		config.AppConfig.MinioBucketName,
		objectName,
		expiry,
		reqParams,
	)
	if err != nil {
		return "", err
	}
	return presignedURL.String(), nil
}
