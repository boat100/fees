# Docker 部署指南

## 快速开始

### 方式一：使用 Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/boat100/fees.git
cd fees

# 2. 修改管理员密码（重要！）
# 编辑 docker-compose.yml，修改 ADMIN_PASSWORD 环境变量

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f

# 5. 访问应用
# 打开浏览器访问 http://localhost:5000
```

### 方式二：使用 Docker 命令

```bash
# 1. 构建镜像
docker build -t school-fees:latest .

# 2. 运行容器
docker run -d \
  --name school-fees \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -e ADMIN_PASSWORD=your_password \
  school-fees:latest

# 3. 查看日志
docker logs -f school-fees
```

## 数据持久化

数据库文件存储在 `./data` 目录下：
- `./data/school_fees.db` - SQLite 数据库文件

**重要**：请定期备份此目录！

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ADMIN_PASSWORD` | 管理员登录密码 | 需自行设置 |
| `NODE_ENV` | 运行环境 | production |
| `PORT` | 服务端口 | 5000 |

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

## 备份与恢复

### 备份数据库
```bash
# 方式一：复制数据目录
cp -r ./data ./data_backup_$(date +%Y%m%d)

# 方式二：在应用内使用"备份数据库"功能下载
```

### 恢复数据库
```bash
# 停止服务
docker-compose down

# 替换数据库文件
cp your_backup.db ./data/school_fees.db

# 重启服务
docker-compose up -d
```

## 更新应用

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker-compose build --no-cache
docker-compose up -d
```

## 注意事项

1. **首次部署**：请务必修改 `ADMIN_PASSWORD` 为强密码
2. **数据备份**：建议定期备份 `./data` 目录
3. **端口冲突**：如果 5000 端口被占用，请修改 `docker-compose.yml` 中的端口映射
4. **中国镜像**：Dockerfile 已配置阿里云镜像源加速

## 服务器要求

- Docker 20.10+
- Docker Compose 2.0+
- 内存：建议 1GB+
- 磁盘：根据数据量，建议预留 10GB+
