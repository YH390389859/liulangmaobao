#!/bin/bash

# 流浪猫窝爬虫启动脚本

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 打印帮助信息
print_help() {
  echo -e "${BLUE}流浪猫窝爬虫程序启动脚本${NC}"
  echo
  echo "用法:"
  echo "  ./start.sh [选项]"
  echo
  echo "选项:"
  echo "  -l, --list        仅抓取列表页内容"
  echo "  -o, --openfirst   抓取列表页并自动打开第一条帖子详情"
  echo "  -h, --help        显示此帮助信息"
  echo
  echo "示例:"
  echo "  ./start.sh -l     # 仅抓取列表页"
  echo "  ./start.sh -o     # 抓取列表页并自动打开第一条帖子"
}

# 如果没有参数，显示帮助信息
if [ $# -eq 0 ]; then
  print_help
  exit 0
fi

# 解析命令行参数
case "$1" in
  -l|--list)
    echo -e "${GREEN}开始抓取列表页...${NC}"
    node src/index.js
    ;;
  -o|--openfirst)
    echo -e "${GREEN}开始抓取列表页并自动打开第一条帖子...${NC}"
    node src/index.js --openfirst
    ;;
  -h|--help)
    print_help
    ;;
  *)
    echo -e "${YELLOW}未知选项: $1${NC}"
    print_help
    exit 1
    ;;
esac 