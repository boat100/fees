# 群晖 Docker 部署指南

本指南将帮助您在群晖 NAS 上部署学校费用管理系统。

## 📋 前提条件

- 群晖 DSM 7.0 或更高版本
- 已安装 Docker 套件（套件中心 → 搜索 Docker → 安装）
- 有管理员权限

---

## 🚀 方式一：使用镜像文件部署（推荐，无需网络）

### 第一步：构建并导出镜像

在开发机器上执行：

```bash
# 1. 克隆项目
git clone https://github.com/boat100/fees.git
cd fees

# 2. 构建 Docker 镜像
docker build -t school-fees:latest .

# 3. 导出镜像为 tar 文件
docker save -o school-fees.tar school-fees:latest
```

### 第二步：上传镜像到群晖

1. 将 `school-fees.tar` 文件上传到群晖（可通过 File Station 或 SMB）
2. 建议路径：`/volume1/docker/school-fees/`

### 第三步：在群晖导入镜像

1. 打开 **Docker** → **映像**
2. 点击 **新增** → **从文件添加**
3. 选择上传的 `school-fees.tar` 文件
4. 等待导入完成

### 第四步：创建容器（图形界面）

1. 双击导入的镜像 `school-fees:latest`
2. 配置容器名称：`school-fees`
3. 点击 **高级设置**：

#### 🔧 常规设置
- ✅ 启用自动重新启动

#### 📁 存储空间
添加文件夹映射：

| 文件/文件夹 | 装载路径 | 说明 |
|------------|---------|------|
| `/volume1/docker/school-fees/data` | `/app/data` | 数据库存储 |

#### 🌐 网络
- 使用 **bridge** 模式（默认）
- 或选择 **host** 模式直接使用宿主网络

#### 🔐 端口设置
添加端口映射：

| 本地端口 | 容器端口 | 协议 |
|---------|---------|------|
| 5000 | 5000 | TCP |

#### ⚙️ 环境变量
添加以下环境变量：

| 变量 | 值 | 说明 |
|-----|-----|------|
| `ADMIN_PASSWORD` | `您的密码` | ⚠️ 请设置强密码 |
| `NODE_ENV` | `production` | 生产环境 |

5. 点击 **应用** → **下一步** → **应用**

### 第五步：访问应用

打开浏览器访问：`http://您的群晖IP:5000`

---

## 🐳 方式二：使用 Docker Compose 部署

### 第一步：准备目录结构

在群晖 File Station 中创建：

```
/volume1/docker/school-fees/
├── data/           # 数据库目录
├── docker-compose.yml
└── .env            # 环境变量文件
```

### 第二步：创建配置文件

**docker-compose.yml**：

```yaml
version: '3.8'

services:
  school-fees:
    image: school-fees:latest
    container_name: school-fees
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

**.env**：

```env
# 请修改为强密码
ADMIN_PASSWORD=your_secure_password_here
```

### 第三步：SSH 部署

1. 开启群晖 SSH（控制面板 → 终端机 → 启用 SSH）
2. SSH 连接到群晖：

```bash
# 连接群晖
ssh admin@您的群晖IP

# 进入项目目录
cd /volume1/docker/school-fees

# 确保已有镜像（参考方式一导入）
# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

## 📂 方式三：使用群晖 Docker 项目功能

群晖 Docker 套件支持 Docker Compose 项目：

1. 打开 **Docker** → **项目**
2. 点击 **新增**
3. 输入项目名称：`school-fees`
4. 选择 **创建 docker-compose.yml**
5. 粘贴 docker-compose.yml 内容
6. 点击 **下一步** → **完成**

---

## 🔄 更新应用

### 使用镜像文件更新

```bash
# 1. 在开发机器上构建新镜像
docker build -t school-fees:v2 .
docker save -o school-fees-v2.tar school-fees:v2

# 2. 上传到群晖

# 3. 导入新镜像

# 4. 停止旧容器，使用新镜像创建容器
```

### 使用 Docker Compose 更新

```bash
cd /volume1/docker/school-fees

# 导入新镜像后
docker-compose down
docker-compose up -d
```

---

## 💾 数据备份

### 手动备份

```bash
# 备份数据库
cp /volume1/docker/school-fees/data/school_fees.db \
   /volume1/docker/school-fees/data/school_fees_backup_$(date +%Y%m%d).db
```

### 使用群晖任务计划自动备份

1. 控制面板 → 任务计划 → 新增 → 计划的任务 → 用户定义的脚本
2. 计划：每天 02:00
3. 用户：root
4. 脚本：

```bash
#!/bin/bash
BACKUP_DIR="/volume1/docker/school-fees/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /volume1/docker/school-fees/data/school_fees.db $BACKUP_DIR/school_fees_$DATE.db
# 保留最近 30 天的备份
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
```

---

## 🔧 常见问题

### Q: 端口冲突怎么办？

修改 docker-compose.yml 中的端口映射：

```yaml
ports:
  - "8080:5000"  # 将 5000 改为其他端口如 8080
```

### Q: 忘记密码怎么办？

1. SSH 连接到群晖
2. 进入容器：`docker exec -it school-fees sh`
3. 重置密码（或重新创建容器并设置新密码）

### Q: 数据库损坏怎么办？

从备份恢复：
```bash
cp /volume1/docker/school-fees/backups/school_fees_20240101.db \
   /volume1/docker/school-fees/data/school_fees.db
docker restart school-fees
```

### Q: 如何查看日志？

```bash
# SSH 连接
docker logs -f school-fees
```

---

## 🌐 反向代理配置（可选）

如果希望通过域名访问，可使用群晖的 Web Station 或 Nginx Proxy Manager：

### 使用群晖反向代理

1. 控制面板 → 登录门户 → 高级 → 反向代理服务器
2. 新增反向代理：
   - 来源：`school.yourdomain.com`（需配置 DNS）
   - 目的地：`http://localhost:5000`

---

## ✅ 部署检查清单

- [ ] Docker 套件已安装
- [ ] 镜像已导入
- [ ] 数据目录已创建（`/volume1/docker/school-fees/data`）
- [ ] 容器已启动
- [ ] 端口可访问（`http://群晖IP:5000`）
- [ ] 已修改默认密码
- [ ] 数据备份已配置
