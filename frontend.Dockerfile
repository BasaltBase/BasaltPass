FROM node:18-bullseye-slim AS builder
WORKDIR /app
ARG VITE_API_BASE
ARG VITE_CONSOLE_USER_URL
ARG VITE_CONSOLE_TENANT_URL
ARG VITE_CONSOLE_ADMIN_URL
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_CONSOLE_USER_URL=$VITE_CONSOLE_USER_URL
ENV VITE_CONSOLE_TENANT_URL=$VITE_CONSOLE_TENANT_URL
ENV VITE_CONSOLE_ADMIN_URL=$VITE_CONSOLE_ADMIN_URL
COPY basaltpass-frontend/package.json ./
COPY basaltpass-frontend/package-lock.json ./
RUN npm ci
COPY basaltpass-frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/user/dist /usr/share/nginx/html
RUN mkdir -p /usr/share/nginx/html/tenant /usr/share/nginx/html/admin
COPY --from=builder /app/apps/tenant/dist /usr/share/nginx/html/tenant
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html/admin
COPY basaltpass-frontend/nginx.default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 