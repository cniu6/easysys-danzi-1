# Next.js 15 生产镜像（多阶段构建）
# 部署平台从 Git 拉代码时需要此文件

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 构建期占位；运行时以环境变量 / .env.local 为准
ENV ADMIN_PASSWORD=admin123
ENV AUTH_SECRET=daizi-studio-secret-change-me-in-production
ENV AUTH_SESSION_HOURS=12
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# 静态资源与 CMS 数据（后台会写 data / uploads / videos / .env.local）
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/.env.local ./.env.local

# standalone 产物（含 server.js）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 保证后台可写：内容、上传、改密码
RUN mkdir -p public/uploads public/videos \
  && chown -R nextjs:nodejs /app/data /app/public /app/.env.local

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
