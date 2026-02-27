# 学校费用统计系统 Dockerfile
# 使用 Node.js 20 Alpine 版本

FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖（better-sqlite3 编译需要）
RUN apk add --no-cache python3 make g++ git bash

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制项目文件
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5000
ENV HOSTNAME="0.0.0.0"

# 构建项目
RUN pnpm run build

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000 || exit 1

# 启动服务
CMD ["pnpm", "start"]
