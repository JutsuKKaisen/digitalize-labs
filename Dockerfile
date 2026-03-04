FROM node:20-bookworm-slim AS base
# Thiết lập pnpm theo chuẩn của dự án (version 9.0.0)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS builder
# Cài đặt turbo
RUN npm install -g turbo@^2.4.0
WORKDIR /app
COPY . .
ARG APP_NAME
# Prune các package thừa, chỉ giữ lại scope của app cần build
RUN turbo prune @dl/${APP_NAME} --docker

FROM base AS installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# Cài đặt dependencies
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/out/full/ .
# Generate Prisma Client (bắt buộc)
RUN pnpm run db:generate

ARG APP_NAME
# Build ứng dụng Next.js
RUN pnpm turbo run build --filter=@dl/${APP_NAME}...

# Ép Docker tự tạo một thư mục public (nếu chưa có) để bước runner ở dưới không bị lỗi "not found"
RUN mkdir -p /app/apps/${APP_NAME}/public

FROM base AS runner
WORKDIR /app
ARG APP_NAME
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Lưu ARG thành ENV để lúc chạy container có thể đọc được tên app trong lệnh CMD
ENV APP=${APP_NAME}

# =========================================================
# Cài đặt thư viện OpenSSL cho Prisma Engine
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
# =========================================================

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Set up thư mục cho Next.js Standalone
COPY --from=installer /app/apps/${APP_NAME}/public ./apps/${APP_NAME}/public

# Phân quyền cho user nextjs (đảm bảo upload file không bị lỗi EACCES)
RUN mkdir -p /app/uploads/pdfs /app/public/mock && chown -R nextjs:nodejs /app/uploads /app/public
USER nextjs

# Copy các file của chế độ Standalone
COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static

# ==========================================================
# Fix lỗi Prisma Engine bị Next.js vứt bỏ
COPY --from=installer --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=nextjs:nodejs /app/packages/database ./packages/database
# ==========================================================

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Khởi chạy server Next.js từ file server.js nằm sâu bên trong thư mục của từng app
CMD node apps/${APP}/server.js