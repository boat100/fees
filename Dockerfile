# 学校费用管理系统 Dockerfile
# 针对中国地区优化镜像源

# ==================== 构建阶段 ====================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 配置 Alpine 镜像源（中国地区加速）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装构建依赖（better-sqlite3 需要 python3 和编译工具）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    sqlite \
    bash \
    libc6-compat

# 安装 pnpm
RUN npm install -g pnpm@9.0.0

# 配置 pnpm 镜像源（中国地区加速）
RUN pnpm config set registry https://registry.npmmirror.com

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制项目文件
COPY . .

# 构建项目
RUN npx next build

# ==================== 运行阶段 ====================
FROM node:20-alpine AS runner

# 设置工作目录
WORKDIR /app

# 配置 Alpine 镜像源（中国地区加速）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装运行时依赖
RUN apk add --no-cache \
    sqlite \
    curl \
    libc6-compat

# 从构建阶段复制 standalone 输出
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 复制 node_modules（包含 better-sqlite3 原生模块）
COPY --from=builder /app/node_modules ./node_modules

# 创建数据目录并设置完全开放权限（确保可写入）
RUN mkdir -p /app/data && chmod 777 /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5000
ENV COZE_WORKSPACE_PATH=/app

# 暴露端口
EXPOSE 5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000 || exit 1

# 启动命令
CMD ["node", "server.js"]
