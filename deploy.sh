#!/bin/bash

# 学校费用统计系统 - Docker 部署脚本
# 使用方法: ./deploy.sh [command]
# 命令:
#   start   - 启动服务
#   stop    - 停止服务
#   restart - 重启服务
#   logs    - 查看日志
#   backup  - 备份数据库
#   update  - 更新并重启
#   status  - 查看状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
}

# 启动服务
start() {
    info "启动服务..."
    docker compose up -d --build
    info "服务已启动，访问地址: http://localhost:5000"
}

# 停止服务
stop() {
    info "停止服务..."
    docker compose down
    info "服务已停止"
}

# 重启服务
restart() {
    info "重启服务..."
    docker compose down
    docker compose up -d --build
    info "服务已重启"
}

# 查看日志
logs() {
    docker compose logs -f
}

# 备份数据库
backup() {
    BACKUP_DIR="./backups"
    mkdir -p $BACKUP_DIR
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/school_fees_$TIMESTAMP.db"
    
    if [ -f "./data/school_fees.db" ]; then
        cp ./data/school_fees.db $BACKUP_FILE
        info "数据库已备份到: $BACKUP_FILE"
    else
        warn "数据库文件不存在，跳过备份"
    fi
}

# 更新服务
update() {
    info "更新服务..."
    
    # 备份数据
    backup
    
    # 拉取最新代码（如果是 git 仓库）
    if [ -d ".git" ]; then
        info "拉取最新代码..."
        git pull
    fi
    
    # 重新构建并启动
    docker compose down
    docker compose up -d --build
    
    info "服务已更新"
}

# 查看状态
status() {
    docker compose ps
    echo ""
    info "访问地址: http://localhost:5000"
}

# 主函数
main() {
    check_docker
    
    case "${1:-start}" in
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        logs)
            logs
            ;;
        backup)
            backup
            ;;
        update)
            update
            ;;
        status)
            status
            ;;
        *)
            echo "使用方法: $0 {start|stop|restart|logs|backup|update|status}"
            exit 1
            ;;
    esac
}

main "$@"
