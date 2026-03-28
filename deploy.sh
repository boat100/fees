#!/bin/bash

# Docker 镜像快速部署脚本
# 使用方法: ./deploy.sh [latest|<commit-id>]

set -e

# 配置变量
IMAGE_NAME="ghcr.io/boat100/fees"
CONTAINER_NAME="fees-app"
PORT=5000
DATA_DIR="./data"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    print_info "Docker 已安装"
}

# 检查是否已登录 GHCR
check_auth() {
    if ! docker info | grep -q "Username"; then
        print_warn "未检测到 Docker 登录状态"
        print_info "请先登录 GHCR:"
        echo "  echo \$GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin"
        exit 1
    fi
    print_info "Docker 认证正常"
}

# 创建数据目录
create_data_dir() {
    if [ ! -d "$DATA_DIR" ]; then
        mkdir -p "$DATA_DIR"
        print_info "创建数据目录: $DATA_DIR"
    fi
}

# 停止并删除旧容器
stop_old_container() {
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_info "停止旧容器: $CONTAINER_NAME"
        docker stop "$CONTAINER_NAME" || true
        docker rm "$CONTAINER_NAME" || true
    fi
}

# 拉取镜像
pull_image() {
    local tag=$1
    print_info "拉取镜像: ${IMAGE_NAME}:${tag}"
    
    # 使用镜像加速器（如果配置了）
    if [ -f "/etc/docker/daemon.json" ] && grep -q "registry-mirrors" "/etc/docker/daemon.json"; then
        print_info "使用镜像加速器"
    fi
    
    docker pull "${IMAGE_NAME}:${tag}"
}

# 启动新容器
start_container() {
    local tag=$1
    print_info "启动容器: $CONTAINER_NAME"
    
    docker run -d \
        --name "$CONTAINER_NAME" \
        -p "${PORT}:5000" \
        -v "$(pwd)/${DATA_DIR}:/app/data" \
        --restart unless-stopped \
        "${IMAGE_NAME}:${tag}"
}

# 健康检查
health_check() {
    local max_attempts=10
    local attempt=0
    
    print_info "等待服务启动..."
    sleep 5
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f "http://localhost:${PORT}/api/health" &> /dev/null; then
            print_info "服务启动成功！"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 3
        echo -n "."
    done
    
    print_error "服务启动失败，请检查日志: docker logs $CONTAINER_NAME"
    return 1
}

# 显示部署信息
show_info() {
    local tag=$1
    echo ""
    echo "=========================================="
    echo "🎉 部署完成！"
    echo "=========================================="
    echo "镜像: ${IMAGE_NAME}:${tag}"
    echo "容器: $CONTAINER_NAME"
    echo "端口: ${PORT}"
    echo "访问地址: http://localhost:${PORT}"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker logs -f $CONTAINER_NAME"
    echo "  停止容器: docker stop $CONTAINER_NAME"
    echo "  重启容器: docker restart $CONTAINER_NAME"
    echo "  进入容器: docker exec -it $CONTAINER_NAME /bin/sh"
    echo "=========================================="
}

# 主函数
main() {
    local tag=${1:-latest}
    
    echo "=========================================="
    echo "🚀 Docker 镜像快速部署"
    echo "=========================================="
    
    # 检查环境
    check_docker
    check_auth
    
    # 准备环境
    create_data_dir
    
    # 停止旧容器
    stop_old_container
    
    # 拉取新镜像
    pull_image "$tag"
    
    # 启动新容器
    start_container "$tag"
    
    # 健康检查
    if health_check; then
        show_info "$tag"
    else
        exit 1
    fi
}

# 执行主函数
main "$@"
