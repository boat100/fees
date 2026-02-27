# 学校费用统计系统 - Docker 部署指南

## 环境要求

- Docker 20.10+
- Docker Compose 2.0+（可选）
- 至少 1GB 可用内存
- 至少 2GB 可用磁盘空间

## 快速部署

### 方式一：使用 Docker Compose（推荐）

1. **上传项目文件**

   将整个项目文件夹上传到服务器，例如：`/opt/school-fee-system`

2. **进入项目目录**
   ```bash
   cd /opt/school-fee-system
   ```

3. **启动服务**
   ```bash
   docker-compose up -d --build
   ```

4. **查看运行状态**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

5. **访问系统**
   
   打开浏览器访问：`http://你的服务器IP:5000`

### 方式二：使用 Docker 命令

1. **构建镜像**
   ```bash
   docker build -t school-fee-system:latest .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name school-fee-system \
     --restart unless-stopped \
     -p 5000:5000 \
     -v $(pwd)/data:/app/data \
     -v $(pwd)/school_fees.db:/app/school_fees.db \
     school-fee-system:latest
   ```

3. **查看日志**
   ```bash
   docker logs -f school-fee-system
   ```

## 数据持久化

系统使用 SQLite 数据库存储数据，默认数据库文件为 `school_fees.db`。

### 重要：数据备份

```bash
# 备份数据库
cp school_fees.db school_fees.db.backup.$(date +%Y%m%d_%H%M%S)

# 或者导出数据（进入容器执行）
docker exec -it school-fee-system sh
sqlite3 school_fees.db ".backup 'backup.db'"
```

## 常用命令

### 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 重新构建并启动
docker-compose up -d --build
```

### 进入容器

```bash
# 进入容器 shell
docker exec -it school-fee-system sh

# 查看数据库
docker exec -it school-fee-system sqlite3 school_fees.db
```

## 更新部署

当代码有更新时：

```bash
# 1. 停止旧容器
docker-compose down

# 2. 拉取最新代码（如果使用 Git）
git pull

# 3. 重新构建并启动
docker-compose up -d --build

# 4. 查看日志确认启动成功
docker-compose logs -f
```

## 系统配置

### 修改端口

编辑 `docker-compose.yml`，修改端口映射：

```yaml
ports:
  - "8080:5000"  # 将 5000 改为其他端口，如 8080
```

### 登录凭证

- 用户名：`admin`
- 密码：`adminFF`

⚠️ **安全建议**：生产环境建议修改默认密码，修改 `src/lib/auth.ts` 中的用户名和密码。

## 反向代理配置（可选）

如果需要通过域名访问，可以配置 Nginx 反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs --tail=100

# 检查端口占用
netstat -tlnp | grep 5000
```

### 数据库连接问题

```bash
# 检查数据库文件权限
ls -la school_fees.db

# 修复权限
chmod 644 school_fees.db
```

### 内存不足

```bash
# 查看容器资源使用
docker stats school-fee-system
```

## 安全建议

1. **修改默认密码**：编辑 `src/lib/auth.ts` 修改登录凭证
2. **使用 HTTPS**：配置 SSL 证书
3. **限制访问**：使用防火墙限制访问 IP
4. **定期备份**：设置定时任务备份数据库

## 技术支持

如有问题，请检查：
1. Docker 服务是否正常运行
2. 端口 5000 是否被占用
3. 日志中是否有错误信息
