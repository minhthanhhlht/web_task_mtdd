# Image chạy ứng dụng Quản lý task (backend Express + giao diện React đã build). Dùng cho Coolify/Docker.

# --- Giai đoạn 1: build giao diện ---
FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Giai đoạn 2: cài thư viện backend (bản đầy đủ có sẵn công cụ build cho better-sqlite3 nếu thiếu bản dựng sẵn) ---
FROM node:22-bookworm AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# --- Giai đoạn 3: image chạy ---
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    DB_PATH=/data/tasks.db \
    TRUST_PROXY=1
WORKDIR /app/backend
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
# Database và bản sao lưu nằm ở /data (gắn volume lưu bền ở Coolify)
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 6021
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:6021/api/auth/me').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
