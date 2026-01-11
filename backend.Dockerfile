# syntax=docker/dockerfile:1
FROM golang:1.24.4 AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev && rm -rf /var/lib/apt/lists/*
COPY basaltpass-backend/go.mod basaltpass-backend/go.sum ./
RUN go mod download
COPY basaltpass-backend/ ./
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/basaltpass

FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=builder /app/server ./
EXPOSE 8080
ENTRYPOINT ["/app/server"] 