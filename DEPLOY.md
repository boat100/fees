# Docker 部署教程（Armbian/N1盒子）

本文档介绍如何将学校费用统计系统部署到 N1 盒子（ARM 架构）上。

---

## 关于 N1 盒子

N1 盒子使用 ARM 架构处理器，Docker 镜像会自动构建为 arm64 版本，无需额外配置。

---

## 前提条件

- N1 盒子已安装 Armbian 系统
- 已安装 Docker 和 Docker Compose
- 防火墙已开放 5000 端口（或使用的端口）

### 安装 Docker（如未安装）

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 将当前用户加入 docker 组（可选，避免每次使用 sudo）
sudo usermod -aG docker $USER

# 重新登录后验证
docker --version
docker compose version
```

---

## 快速部署（3步完成）

### 第一步：上传项目

**方式1：使用 scp（适合小文件）**
```bash
# 在本地电脑执行
scp -r ./* root@n1-ip:/opt/school-fees/
```

**方式2：使用 rsync（推荐，支持断点续传）**
```bash
# 在本地电脑执行
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'data' ./ root@n1-ip:/opt/school-fees/
```

**方式3：直接在 N1 上拉取（如果项目在 Git 仓库）**
```bash
# 在 N1 盒子上执行
cd /opt
git clone <your-repo-url> school-fees
cd school-fees
```

### 第二步：启动服务

```bash
# SSH 登录 N1 盒子
ssh root@n1-ip

# 进入项目目录
cd /opt/school-fees

# 创建数据目录
mkdir -p data

# 构建并启动（首次会较慢，需要下载基础镜像）
docker compose up -d --build
```

### 第三步：访问应用

打开浏览器访问：`http://n1-ip:5000`

---

## 详细部署步骤

### 1. 上传项目文件

```bash
# 在本地电脑执行
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'data' ./ root@192.168.1.x:/opt/school-fees/
```

### 2. 构建并启动

```bash
cd /opt/school-fees

# 查看磁盘空间（确保有足够空间）
df -h

# 构建并启动
docker compose up -d --build
```

**首次构建说明：**
- 需要下载 Node.js 基础镜像（约 100MB）
- 需要安装依赖并构建（约 3-5 分钟）
- N1 盒子性能有限，请耐心等待

### 3. 查看构建进度

```bash
# 查看构建日志
docker compose logs -f

# 查看容器状态
docker compose ps
```

### 4. 验证部署成功

```bash
# 检查服务是否正常运行
curl http://localhost:5000

# 或在浏览器中访问
# http://192.168.1.x:5000
```

---

## N1 盒子优化建议

### 1. 设置日志大小限制

编辑 `/etc/docker/daemon.json`：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# 重启 Docker
sudo systemctl restart docker
```

### 2. 定期清理 Docker 缓存

```bash
# 清理未使用的镜像和缓存
docker system prune -f

# 查看磁盘使用情况
docker system df
```

### 3. 使用外部存储（可选）

如果 N1 盒子有外接 USB 硬盘：

```bash
# 挂载硬盘（假设为 /dev/sda1）
sudo mkdir -p /mnt/usb
sudo mount /dev/sda1 /mnt/usb

# 创建数据目录
sudo mkdir -p /mnt/usb/school-fees/data

# 修改 docker-compose.yml 中的 volumes
# - ./data:/app/data
# 改为
# - /mnt/usb/school-fees/data:/app/data
```

---

## 数据管理

### 数据位置

```
./data/school_fees.db    # SQLite 数据库文件
```

### 备份数据

```bash
# 手动备份
cp ./data/school_fees.db ./data/school_fees_$(date +%Y%m%d).db

# 备份到 USB 硬盘
cp ./data/school_fees.db /mnt/usb/backup/school_fees_$(date +%Y%m%d).db
```

### 设置定时备份

```bash
# 编辑 crontab
crontab -e

# 添加以下内容（每天凌晨3点备份）
0 3 * * * cp /opt/school-fees/data/school_fees.db /opt/school-fees/data/backup/school_fees_$(date +\%Y\%m\%d).db
```

### 恢复数据

```bash
# 停止服务
docker compose down

# 恢复数据库
cp /path/to/backup.db ./data/school_fees.db

# 启动服务
docker compose up -d
```

---

## 常用命令

```bash
# ===== 服务管理 =====
docker compose up -d              # 启动服务
docker compose down               # 停止服务
docker compose restart            # 重启服务
docker compose ps                 # 查看状态

# ===== 日志查看 =====
docker compose logs -f            # 实时查看日志
docker compose logs --tail 50     # 查看最近50行

# ===== 更新应用 =====
docker compose down
docker compose up -d --build

# ===== 清理空间 =====
docker system prune -f            # 清理未使用的资源
docker image prune -a -f          # 清理未使用的镜像

# ===== 进入容器 =====
docker exec -it school-fees-app sh
```

---

## 使用 deploy.sh 脚本

```bash
# 添加执行权限
chmod +x deploy.sh

# 使用脚本
./deploy.sh start     # 启动
./deploy.sh stop      # 停止
./deploy.sh restart   # 重启
./deploy.sh logs      # 查看日志
./deploy.sh backup    # 备份数据库
./deploy.sh status    # 查看状态
```

---

## 配置登录密码

编辑 `docker-compose.yml`：

```yaml
services:
  school-fees:
    # ...
    environment:
      - NODE_ENV=production
      - LOGIN_PASSWORD=your_password  # 设置登录密码
```

修改后重启：
```bash
docker compose down
docker compose up -d
```

---

## 修改端口

编辑 `docker-compose.yml`：

```yaml
ports:
  - "8080:5000"  # 改为你想要的端口
```

---

## 故障排查

### 1. 查看详细错误日志

```bash
docker compose logs
```

### 2. 端口被占用

```bash
# 查看端口占用
netstat -tlnp | grep 5000
# 或
ss -tlnp | grep 5000

# 杀掉占用进程
kill -9 <PID>
```

### 3. 磁盘空间不足

```bash
# 查看磁盘使用
df -h

# 清理 Docker 缓存
docker system prune -a -f
```

### 4. 容器无法启动

```bash
# 查看容器日志
docker compose logs

# 检查数据目录权限
ls -la ./data

# 修复权限
sudo chown -R 1001:1001 ./data
```

### 5. 内存不足

```bash
# 查看内存使用
free -h

# 重启 Docker 服务
sudo systemctl restart docker
```

---

## 开机自启动

Docker Compose 配置中已包含 `restart: unless-stopped`，确保容器会自动重启。

确保 Docker 服务开机自启：

```bash
sudo systemctl enable docker
```

---

## 完整部署示例

```bash
# ===== 1. 连接到 N1 盒子 =====
ssh root@192.168.1.x

# ===== 2. 创建目录 =====
mkdir -p /opt/school-fees/data
cd /opt/school-fees

# ===== 3. 上传项目（或从 git 拉取）=====
# 如果是 git
git clone <repo-url> .

# ===== 4. 启动服务 =====
docker compose up -d --build

# ===== 5. 查看日志确认 =====
docker compose logs -f

# ===== 6. 测试访问 =====
curl http://localhost:5000

# ===== 完成！ =====
# 浏览器访问: http://192.168.1.x:5000
```

---

## 文件结构

```
/opt/school-fees/
├── Dockerfile              # Docker 镜像配置
├── docker-compose.yml      # Docker Compose 配置
├── deploy.sh               # 部署脚本
├── DEPLOY.md               # 本文档
├── data/                   # 数据目录
│   └── school_fees.db      # SQLite 数据库
└── src/                    # 源代码
```

---

## 常见问题

**Q: N1 盒子能运行吗？**
A: 可以，Docker 镜像支持 ARM64 架构。

**Q: 内存够用吗？**
A: N1 盒子一般有 2GB 内存，足够运行此应用。

**Q: 构建很慢怎么办？**
A: 首次构建需要下载镜像和编译，3-5 分钟正常。后续更新会快很多。

**Q: 如何更新？**
A: `git pull` 后执行 `docker compose up -d --build`
