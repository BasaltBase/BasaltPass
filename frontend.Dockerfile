FROM node:18-alpine AS builder
WORKDIR /app
COPY basaltpass-frontend/package.json ./
COPY basaltpass-frontend/package-lock.json ./
RUN npm ci --omit=dev
COPY basaltpass-frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 