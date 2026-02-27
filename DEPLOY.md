# Docker 部署教程

本文档介绍如何将学校费用统计系统部署到个人服务器上。

---

## 前提条件

- 服务器已安装 Docker
- 服务器已安装 Docker Compose（推荐）
- 服务器防火墙已开放 5000 端口

---

## 快速部署（推荐）

### 第一步：上传项目

将整个项目上传到服务器 `/opt/school-fees` 目录：

```bash
# 在服务器上创建目录
mkdir -p /opt/school-fees

# 方式1：使用 scp 上传（在本地电脑执行）
scp -r ./* user@your-server-ip:/opt/school-fees/

# 方式2：使用 rsync 上传（推荐，支持增量同步）
rsync -avz --exclude 'node_modules' --exclude '.next' ./ user@your-server-ip:/opt/school-fees/
```

### 第二步：启动服务

```bash
# SSH 登录服务器
ssh user@your-server-ip

# 进入项目目录
cd /opt/school-fees

# 构建并启动（首次部署或代码更新后执行）
docker compose up -d --build
```

### 第三步：访问应用

打开浏览器访问：`http://your-server-ip:5000`

---

## 详细部署步骤

### 方式一：Docker Compose（推荐）

#### 1. 上传项目文件

```bash
# 在本地电脑执行
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'data' ./ user@your-server-ip:/opt/school-fees/
```

#### 2. 构建并启动

```bash
cd /opt/school-fees
docker compose up -d --build
```

#### 3. 查看状态

```bash
# 查看容器运行状态
docker compose ps

# 查看实时日志
docker compose logs -f
```

### 方式二：Docker 命令

#### 1. 构建镜像

```bash
cd /opt/school-fees
docker build -t school-fees:latest .
```

#### 2. 创建数据目录

```bash
mkdir -p ./data
```

#### 3. 启动容器

```bash
docker run -d \
  --name school-fees-app \
  --restart unless-stopped \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  school-fees:latest
```

---

## 数据管理

### 数据存储位置

数据库文件存储在 `./data/school_fees.db`

### 备份数据

```bash
# 方式1：直接复制数据库文件
cp ./data/school_fees.db ./data/school_fees_$(date +%Y%m%d).db

# 方式2：定时备份（添加到 crontab）
# 每天凌晨3点自动备份
0 3 * * * cp /opt/school-fees/data/school_fees.db /opt/school-fees/data/backup/school_fees_$(date +\%Y\%m\%d).db
```

### 恢复数据

```bash
# 1. 停止容器
docker compose down

# 2. 恢复数据库文件
cp /path/to/backup/school_fees.db ./data/school_fees.db

# 3. 重新启动
docker compose up -d
```

### 迁移数据到新服务器

```bash
# 在旧服务器上
cd /opt/school-fees
tar -czvf school-fees-data.tar.gz ./data

# 传输到新服务器
scp school-fees-data.tar.gz user@new-server:/opt/

# 在新服务器上
cd /opt/school-fees
tar -xzvf /opt/school-fees-data.tar.gz
```

---

## 更新应用

### 使用 deploy.sh 脚本（推荐）

```bash
# 启动服务
./deploy.sh start

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看日志
./deploy.sh logs

# 备份数据库
./deploy.sh backup

# 更新并重启（如果使用 git）
./deploy.sh update

# 查看状态
./deploy.sh status
```

### 手动更新

```bash
cd /opt/school-fees

# 1. 备份数据
cp ./data/school_fees.db ./data/school_fees_backup.db

# 2. 拉取最新代码（如果使用 git）
git pull

# 3. 重新构建并启动
docker compose down
docker compose up -d --build

# 4. 查看日志确认启动成功
docker compose logs -f
```

---

## 环境变量配置

### 设置登录密码

编辑 `docker-compose.yml`：

```yaml
services:
  school-fees:
    # ... 其他配置
    environment:
      - NODE_ENV=production
      - LOGIN_PASSWORD=your_secure_password  # 设置登录密码
```

或使用 `.env` 文件：

```bash
# 创建 .env 文件
echo "LOGIN_PASSWORD=your_secure_password" > .env

# 修改 docker-compose.yml
services:
  school-fees:
    env_file:
      - .env
```

### 修改端口

编辑 `docker-compose.yml`：

```yaml
ports:
  - "8080:5000"  # 将 8080 改为你想要的端口
```

---

## 常用命令速查

```bash
# ===== 容器管理 =====
docker compose up -d              # 后台启动
docker compose down               # 停止并删除容器
docker compose restart            # 重启容器
docker compose ps                 # 查看容器状态

# ===== 日志查看 =====
docker compose logs               # 查看所有日志
docker compose logs -f            # 实时查看日志
docker compose logs --tail 100    # 查看最近100行日志

# ===== 进入容器 =====
docker exec -it school-fees-app sh

# ===== 镜像管理 =====
docker images                     # 查看所有镜像
docker rmi school-fees:latest     # 删除镜像
docker image prune -f             # 清理未使用的镜像

# ===== 数据管理 =====
# 备份
docker cp school-fees-app:/app/data/school_fees.db ./backup.db

# 恢复
docker cp ./backup.db school-fees-app:/app/data/school_fees.db
docker compose restart
```

---

## 故障排查

### 容器无法启动

```bash
# 查看详细错误日志
docker compose logs

# 检查端口是否被占用
netstat -tlnp | grep 5000
# 或
ss -tlnp | grep 5000

# 如果端口被占用，杀掉占用进程或修改端口
```

### 权限问题

```bash
# 如果遇到权限错误，修改数据目录权限
sudo chown -R 1001:1001 ./data
```

### 容器内数据库问题

```bash
# 进入容器检查
docker exec -it school-fees-app sh

# 在容器内查看数据库
ls -la /app/data/

# 退出容器
exit
```

### 查看容器资源使用

```bash
docker stats school-fees-app
```

---

## Nginx 反向代理（可选）

如果需要使用域名访问和 HTTPS，可以配置 Nginx：

### 1. 安装 Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 2. 配置反向代理

创建 `/etc/nginx/sites-available/school-fees`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/school-fees /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 配置 HTTPS（使用 Let's Encrypt）

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo systemctl enable certbot.timer
```

---

## 安全建议

1. **设置登录密码**：通过环境变量 `LOGIN_PASSWORD` 设置访问密码

2. **修改默认端口**：不要使用默认的 5000 端口，改为其他端口

3. **配置 HTTPS**：使用 Nginx + Let's Encrypt 配置 SSL 证书

4. **定期备份**：设置定时任务自动备份数据库

5. **防火墙配置**：只开放必要的端口

```bash
# 使用 ufw 配置防火墙（Ubuntu）
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 完整部署示例

```bash
# ===== 在本地电脑 =====
# 1. 打包项目（排除不需要的文件）
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'data' ./ user@server:/opt/school-fees/

# ===== 在服务器上 =====
# 2. SSH 登录
ssh user@server

# 3. 进入目录
cd /opt/school-fees

# 4. 创建数据目录
mkdir -p data

# 5. 设置环境变量（可选）
echo "LOGIN_PASSWORD=your_password" > .env

# 6. 启动服务
docker compose up -d --build

# 7. 查看日志确认启动成功
docker compose logs -f

# 8. 访问测试
curl http://localhost:5000

# 9. 设置开机自启（docker compose 已配置 restart: unless-stopped）
# Docker 服务本身设置开机自启
sudo systemctl enable docker

# 完成！
```

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile` | Docker 镜像构建配置 |
| `docker-compose.yml` | Docker Compose 编排配置 |
| `.dockerignore` | Docker 构建时忽略的文件 |
| `deploy.sh` | 快速部署脚本 |
| `DEPLOY.md` | 本文档 |
