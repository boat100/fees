# Docker 镜像部署指南

## 🚀 快速开始（推荐方式）

### 方案一：直接从 GHCR 拉取镜像（推荐）⭐

**优势**：
- GHCR 有 CDN 加速，下载速度快
- 无需下载 Artifacts
- 支持版本标签

```bash
# 1. 登录到 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 2. 拉取最新镜像
docker pull ghcr.io/boat100/fees:latest

# 3. 运行容器
docker run -d \
  --name fees-app \
  -p 5000:5000 \
  -v /path/to/data:/app/data \
  ghcr.io/boat100/fees:latest
```

**拉取特定版本**：
```bash
docker pull ghcr.io/boat100/fees:d9711a0
```

---

### 方案二：使用国内镜像加速

如果 GHCR 拉取仍然慢，可以使用镜像加速器：

```bash
# 使用阿里云镜像加速
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/fees:latest

# 或使用腾讯云镜像加速
docker pull ccr.ccs.tencentyun.com/your-namespace/fees:latest
```

**配置 Docker 镜像加速**：
```bash
# 编辑 Docker 配置
sudo vim /etc/docker/daemon.json

# 添加以下内容
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.ccs.tencentyun.com"
  ]
}

# 重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

---

### 方案三：从 GitHub Actions Artifacts 下载（备用）

如果必须使用 Artifacts，可以使用以下加速方法：

#### 方法 1：使用 GitHub CLI（推荐）
```bash
# 安装 GitHub CLI
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# 登录
gh auth login

# 下载 Artifacts
gh run download

# 或下载特定 workflow 的 artifacts
gh run download <run-id> -n fees-app-image
```

#### 方法 2：直接下载 URL
```bash
# 从 GitHub Actions 页面复制下载链接
wget https://github.com/boat100/fees/suites/xxxxx/artifacts/xxxxx

# 或使用 curl
curl -L -o fees-app.tar.gz "https://github.com/boat100/fees/suites/xxxxx/artifacts/xxxxx"
```

#### 方法 3：使用多线程下载工具
```bash
# 使用 axel（多线程下载）
sudo apt install axel
axel -n 10 https://github.com/boat100/fees/suites/xxxxx/artifacts/xxxxx

# 使用 aria2（支持断点续传）
sudo apt install aria2
aria2c -x 10 -s 10 https://github.com/boat100/fees/suites/xxxxx/artifacts/xxxxx
```

---

## 📦 加载并运行镜像

### 从 tar.gz 文件加载
```bash
# 解压并加载镜像
gunzip -c fees-app.tar.gz | docker load

# 验证镜像
docker images | grep fees

# 运行容器
docker run -d \
  --name fees-app \
  -p 5000:5000 \
  -v /path/to/data:/app/data \
  ghcr.io/boat100/fees:latest
```

---

## 🔧 生产环境部署建议

### 使用 Docker Compose（推荐）
```yaml
version: '3.8'

services:
  fees-app:
    image: ghcr.io/boat100/fees:latest
    container_name: fees-app
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 🎯 优化建议

### 1. 减小镜像大小
- 使用多阶段构建（已在配置中启用）
- 使用 `.dockerignore` 排除不必要文件
- 使用 alpine 基础镜像

### 2. 使用缓存加速构建
- 已启用 GitHub Actions 缓存
- 使用 `cache-from` 和 `cache-to`

### 3. 并行压缩
- 使用 `pigz` 进行并行压缩（已在配置中启用）
- 比标准 `gzip` 快 3-5 倍

### 4. 使用 zstd 压缩
- 比 gzip 更快更小（已在配置中启用）

---

## 🔐 认证配置

### 获取 GitHub Token
1. 访问 https://github.com/settings/tokens
2. 创建新的 Personal Access Token
3. 选择 `read:packages` 和 `write:packages` 权限
4. 复制 token

### 登录 GHCR
```bash
docker login ghcr.io -u YOUR_GITHUB_USERNAME
# 输入 token 作为密码
```

---

## 📊 性能对比

| 方案 | 下载速度 | 便捷性 | 推荐度 |
|------|---------|--------|--------|
| 直接拉取 GHCR | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 镜像加速器 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| GitHub CLI | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 直接下载 | ⭐⭐ | ⭐⭐ | ⭐⭐ |
| 多线程下载 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

---

## ❓ 常见问题

### Q: GHCR 拉取还是慢怎么办？
A: 配置 Docker 镜像加速器，参考方案二。

### Q: 如何查看镜像大小？
A: `docker images ghcr.io/boat100/fees`

### Q: 如何回滚到旧版本？
A: `docker pull ghcr.io/boat100/fees:<commit-id>`

### Q: 如何自动部署？
A: 可以使用 GitHub Actions 自动部署到服务器。

---

## 📚 相关链接

- [GitHub Container Registry 文档](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Hub 镜像加速器](https://hub.docker.com/?overlay=login)
- [GitHub Actions Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
