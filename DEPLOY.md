# Docker 部署教程

本文档介绍如何将学校费用统计系统部署到个人服务器上。

## 前提条件

- 服务器已安装 Docker
- 服务器已安装 Docker Compose（可选，但推荐）
- 服务器防火墙已开放 5000 端口

## 方式一：使用 Docker Compose（推荐）

### 1. 上传项目文件

将整个项目上传到服务器，例如 `/opt/school-fees` 目录：

```bash
# 在服务器上创建目录
mkdir -p /opt/school-fees
cd /opt/school-fees

# 方式1：使用 scp 上传（在本地执行）
scp -r ./* user@your-server:/opt/school-fees/

# 方式2：使用 git clone（如果项目在 Git 仓库）
git clone <your-repo-url> .
```

### 2. 构建并启动

```bash
cd /opt/school-fees

# 构建镜像并启动容器
docker compose up -d --build
```

### 3. 查看状态

```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 4. 访问应用

打开浏览器访问：`http://your-server-ip:5000`

## 方式二：使用 Docker 命令

### 1. 构建镜像

```bash
cd /opt/school-fees
docker build -t school-fees:latest .
```

### 2. 启动容器

```bash
# 创建数据目录
mkdir -p ./data

# 启动容器
docker run -d \
  --name school-fees-app \
  --restart unless-stopped \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  school-fees:latest
```

### 3. 查看日志

```bash
docker logs -f school-fees-app
```

## 数据持久化

SQLite 数据库文件存储在 `./data/school_fees.db`，通过 Docker Volume 映射到宿主机，确保数据不会因容器删除而丢失。

### 备份数据

```bash
# 备份数据库文件
cp ./data/school_fees.db ./data/school_fees_$(date +%Y%m%d_%H%M%S).db

# 或导出到其他位置
docker cp school-fees-app:/app/data/school_fees.db ./backup/
```

### 恢复数据

```bash
# 停止容器
docker compose down

# 替换数据库文件
cp your_backup.db ./data/school_fees.db

# 重新启动
docker compose up -d
```

## 更新应用

### 方式一：Docker Compose

```bash
cd /opt/school-fees

# 拉取最新代码（如果使用 git）
git pull

# 重新构建并启动
docker compose up -d --build
```

### 方式二：手动更新

```bash
# 停止并删除旧容器
docker stop school-fees-app
docker rm school-fees-app

# 构建新镜像
docker build -t school-fees:latest .

# 启动新容器
docker run -d \
  --name school-fees-app \
  --restart unless-stopped \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  school-fees:latest
```

## 环境变量配置

可在 `docker-compose.yml` 中添加环境变量：

```yaml
environment:
  - NODE_ENV=production
  - LOGIN_PASSWORD=your_password_here  # 设置登录密码
```

或在启动命令中添加：

```bash
docker run -d \
  --name school-fees-app \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -e LOGIN_PASSWORD=your_password_here \
  school-fees:latest
```

## 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f

# 进入容器
docker exec -it school-fees-app sh

# 查看容器状态
docker compose ps

# 清理未使用的镜像
docker image prune -f
```

## 故障排查

### 1. 容器无法启动

```bash
# 查看详细日志
docker compose logs

# 检查端口占用
netstat -tlnp | grep 5000
```

### 2. 数据库文件权限问题

```bash
# 修改数据目录权限
sudo chown -R 1001:1001 ./data
```

### 3. 无法访问应用

- 检查防火墙是否开放 5000 端口
- 检查容器是否正常运行：`docker compose ps`
- 检查日志是否有错误：`docker compose logs`

## 安全建议

1. **修改默认端口**：在 `docker-compose.yml` 中修改端口映射，如 `"8080:5000"`

2. **设置登录密码**：通过环境变量 `LOGIN_PASSWORD` 设置访问密码

3. **配置 HTTPS**：推荐使用 Nginx 反向代理配置 SSL 证书

4. **定期备份**：定期备份 `./data/school_fees.db` 文件

## Nginx 反向代理配置（可选）

如果需要配置域名访问和 HTTPS，可使用 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 强制 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
