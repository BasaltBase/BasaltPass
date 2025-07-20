# syntax=docker/dockerfile:1
FROM golang:1.21 AS builder
WORKDIR /app
COPY basaltpass-backend/go.mod basaltpass-backend/go.sum ./
RUN go mod download
COPY basaltpass-backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/basaltpass

FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=builder /app/server ./
EXPOSE 8080
ENTRYPOINT ["/app/server"] 