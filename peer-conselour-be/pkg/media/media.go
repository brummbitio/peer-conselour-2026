package media

import (
	"bytes"
	"errors"
	"image"
	_ "image/jpeg" // Register JPEG decoder
	_ "image/png"  // Register PNG decoder
	"io"
	"net/http"

	"github.com/chai2010/webp"
	"github.com/disintegration/imaging"
)

// Allowed MIME Types
var AllowedMimeTypes = map[string]bool{
	"image/jpeg":      true,
	"image/png":       true,
	"image/webp":      true,
	"application/pdf": true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true, // docx
}

// DetectMimeType reads the first 512 bytes of a reader to check the magic numbers.
// It returns the detected MIME type and a slice containing the full data.
func DetectMimeType(r io.Reader) (string, []byte, error) {
	// Read the first 512 bytes
	buffer := make([]byte, 512)
	n, err := io.ReadFull(r, buffer)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return "", nil, err
	}

	// Truncate the buffer if we read less than 512 bytes
	buffer = buffer[:n]

	// Detect content type
	mimeType := http.DetectContentType(buffer)

	// Combine the read buffer with the rest of the stream
	var fullData []byte
	restData, err := io.ReadAll(r)
	if err != nil {
		return "", nil, err
	}

	fullData = append(buffer, restData...)
	return mimeType, fullData, nil
}

// ProcessImage resizes the image if it exceeds 2048px and encodes it to WebP at 82% quality.
func ProcessImage(imgBytes []byte, mimeType string) ([]byte, error) {
	// 1. Decode original image
	img, _, err := image.Decode(bytes.NewReader(imgBytes))
	if err != nil {
		return nil, errors.New("gagal melakukan decode gambar: " + err.Error())
	}

	// 2. Resize image if either width or height exceeds 2048px
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	maxDim := 2048

	if width > maxDim || height > maxDim {
		if width > height {
			img = imaging.Resize(img, maxDim, 0, imaging.Lanczos)
		} else {
			img = imaging.Resize(img, 0, maxDim, imaging.Lanczos)
		}
	}

	// 3. Encode image to WebP with 82% quality
	var webpBuf bytes.Buffer
	err = webp.Encode(&webpBuf, img, &webp.Options{Lossless: false, Quality: 82})
	if err != nil {
		return nil, errors.New("gagal melakukan konversi gambar ke WebP: " + err.Error())
	}

	return webpBuf.Bytes(), nil
}
