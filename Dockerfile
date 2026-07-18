# Next.js 15 生产镜像（多阶段构建）
# 部署平台从 Git 拉代码时需要此文件
#
# 持久化（请在云平台「存储卷」里手动挂载，不要依赖 Dockerfile VOLUME）：
#   /app/data              → content.json、path-map.json、.env.local（改密）
#   /app/public/uploads    → 后台上传图片
#   /app/public/videos     → 后台上传/演示视频
#
# 注意：不要在 Dockerfile 写 VOLUME —— 部分平台会挂空匿名卷盖住镜像内初始 data，导致首页 500。

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
# 强制官方源，避免 lock 里残留镜像站 tarball 触发 EALLOWREMOTE
COPY package.json package-lock.json .npmrc ./
RUN npm config set registry https://registry.npmjs.org/ \
  && npm ci --registry=https://registry.npmjs.org/

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 构建期占位；运行时以环境变量 / data/.env.local 为准
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
# runner 也带上默认密钥，避免平台未注入环境变量时后台鉴权异常
ENV ADMIN_PASSWORD=admin123
ENV AUTH_SECRET=daizi-studio-secret-change-me-in-production
ENV AUTH_SESSION_HOURS=12

RUN apk add --no-cache su-exec \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# 静态资源（图库 images 打进镜像；uploads/videos 可被卷覆盖）
COPY --from=builder /app/public ./public

# standalone 产物（含 server.js）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 初始数据种子：空持久卷 / entrypoint 未跑时，应用也会从 seed 读
COPY --from=builder /app/data /app/seed/data
COPY --from=builder /app/.env.local /app/seed/.env.local
COPY --from=builder /app/public/uploads /app/seed/public/uploads
COPY --from=builder /app/public/videos /app/seed/public/videos

# 运行时默认 data（未挂卷时直接可用；挂了空卷则靠 entrypoint / 应用自愈从 seed 恢复）
RUN mkdir -p /app/data /app/public/uploads /app/public/videos \
  && cp -a /app/seed/data/. /app/data/ \
  && cp /app/seed/.env.local /app/data/.env.local \
  && ln -sfn /app/data/.env.local /app/.env.local \
  && chown -R nextjs:nodejs /app/data /app/public /app/seed

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
# 以 root 跑入口做卷初始化与权限，再降权为 nextjs
USER root
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
