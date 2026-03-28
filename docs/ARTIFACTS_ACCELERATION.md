# Artifacts 下载加速方案

## 📋 问题说明

GitHub Actions Artifacts 下载速度慢是常见问题，特别是在网络环境不好的情况下。本项目提供了多种加速方案。

---

## 🚀 推荐方案

### ⭐ 方案一：直接从 GHCR 拉取镜像（最推荐）

**优势**：
- ✅ GHCR 有 CDN 加速，下载速度快
- ✅ 无需下载 Artifacts
- ✅ 支持版本标签管理
- ✅ 支持镜像缓存和层复用

**使用方法**：
```bash
# 登录 GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 拉取最新镜像
docker pull ghcr.io/boat100/fees:latest

# 运行容器
docker run -d --name fees-app -p 5000:5000 ghcr.io/boat100/fees:latest
```

**使用部署脚本（更简单）**：
```bash
./deploy.sh latest          # 部署最新版本
./deploy.sh d9711a0         # 部署特定版本
```

---

### 🌐 方案二：使用国内镜像加速器

如果 GHCR 拉取仍然慢，可以使用国内镜像加速器：

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

**推荐的镜像加速器**：
- 中科大镜像: `https://docker.mirrors.ustc.edu.cn`
- 网易镜像: `https://hub-mirror.c.163.com`
- 腾讯云镜像: `https://mirror.ccs.tencentyun.com`

---

### 📦 方案三：优化 Artifacts 下载

如果必须使用 Artifacts，可以使用以下方法加速：

#### 1. 使用 GitHub CLI（推荐）
```bash
# 安装 GitHub CLI
brew install gh  # macOS
sudo apt install gh  # Ubuntu

# 登录
gh auth login

# 下载 Artifacts
gh run download -n fees-app-image
```

#### 2. 使用多线程下载
```bash
# 使用 axel
sudo apt install axel
axel -n 10 <artifact-url>

# 使用 aria2
sudo apt install aria2
aria2c -x 10 -s 10 <artifact-url>
```

#### 3. 直接下载并解压
```bash
# 下载
wget <artifact-url> -O fees-app.tar.gz

# 解压并加载镜像
gunzip -c fees-app.tar.gz | docker load
```

---

## 🔧 优化措施

### 已实施的优化

#### 1. 并行压缩
使用 `pigz` 进行并行压缩，比标准 `gzip` 快 3-5 倍：
```yaml
- name: Pull and save image as tar (optimized)
  run: |
    docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
    docker save ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest | pigz -p 4 > fees-app.tar.gz
```

#### 2. zstd 压缩
使用 zstd 压缩（更快更小）：
```yaml
- name: Upload image artifact
  uses: actions/upload-artifact@v4
  with:
    name: fees-app-image
    path: fees-app.tar.gz
    compression-level: 9
```

#### 3. 多阶段构建
减小镜像大小，加快下载速度：
```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    target: production
```

---

## 📊 性能对比

| 方案 | 下载速度 | 便捷性 | 推荐度 |
|------|---------|--------|--------|
| 直接拉取 GHCR | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 镜像加速器 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| GitHub CLI | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 多线程下载 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 直接下载 | ⭐⭐ | ⭐⭐ | ⭐⭐ |

---

## 🎯 最佳实践

### 生产环境部署推荐流程

```bash
# 1. 配置镜像加速器
sudo vim /etc/docker/daemon.json
sudo systemctl restart docker

# 2. 登录 GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 3. 使用部署脚本
./deploy.sh latest

# 4. 验证服务
curl http://localhost:5000/api/health
```

### 自动化部署（可选）

使用 Docker Compose：
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
    restart: unless-stopped
```

```bash
docker-compose up -d
```

---

## 📚 相关文档

- [Docker 部署完整指南](./DOCKER_DEPLOYMENT.md)
- [GitHub Actions 配置](../.github/workflows/docker-build.yml)
- [快速部署脚本](../deploy.sh)

---

## ❓ 常见问题

### Q: 为什么不推荐使用 Artifacts？
A: Artifacts 下载速度慢、没有 CDN 加速、不支持增量下载。GHCR 有专门优化的 CDN，速度更快。

### Q: 如何回滚到旧版本？
A: `./deploy.sh <commit-id>` 或 `docker pull ghcr.io/boat100/fees:<commit-id>`

### Q: 如何设置自动部署？
A: 可以使用 GitHub Actions 的 `workflow_dispatch` 触发部署，或使用 Webhook。

### Q: 镜像加速器无效怎么办？
A: 检查网络连接，尝试其他加速器，或直接从 GHCR 拉取。

---

## 🔄 更新日志

- ✅ 添加 `pigz` 并行压缩
- ✅ 添加 `zstd` 压缩支持
- ✅ 添加多阶段构建优化
- ✅ 创建快速部署脚本
- ✅ 添加 Docker 部署文档
