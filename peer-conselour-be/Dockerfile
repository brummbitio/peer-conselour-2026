# Build Stage
FROM golang:1.22-alpine AS builder

# Set working directory
WORKDIR /app

# Install required packages
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the Go app
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o go-backend ./cmd/api/main.go

# Run Stage
FROM alpine:latest

# Install certificates and timezone data
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Jakarta

# Buat non-root user dan group demi keamanan
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy the Pre-built binary file from the previous stage
COPY --from=builder /app/go-backend .

# Ubah ownership binary ke user non-root
RUN chown appuser:appgroup go-backend

# Gunakan user non-root untuk menjalankan container
USER appuser

# Expose port 8080 to the outside world
EXPOSE 8080

# Command to run the executable
CMD ["./go-backend"]
