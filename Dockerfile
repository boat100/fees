# 使用 Node.js 20 LTS 作为基础镜像
FROM node:20-alpine AS base

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm 并安装依赖
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建
RUN corepack enable pnpm && pnpm run build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 创建数据目录并设置权限
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# 切换用户
USER nextjs

EXPOSE 5000

ENV PORT=5000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
