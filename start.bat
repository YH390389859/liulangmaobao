@echo off
setlocal enabledelayedexpansion

:: 流浪猫窝爬虫启动脚本 (Windows版)

:: 定义颜色
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: 打印帮助信息
:print_help
echo %BLUE%流浪猫窝爬虫程序启动脚本 (Windows版)%NC%
echo.
echo 用法:
echo   start.bat [选项]
echo.
echo 选项:
echo   -l, --list        仅抓取列表页内容
echo   -o, --openfirst   抓取列表页并自动打开第一条帖子详情
echo   -h, --help        显示此帮助信息
echo.
echo 示例:
echo   start.bat -l     # 仅抓取列表页
echo   start.bat -o     # 抓取列表页并自动打开第一条帖子
goto :eof

:: 主程序入口
if "%~1"=="" (
  call :print_help
  goto :end
)

:: 解析命令行参数
if /i "%~1"=="-l" (
  echo %GREEN%开始抓取列表页...%NC%
  node src/index.js
  goto :end
) else if /i "%~1"=="--list" (
  echo %GREEN%开始抓取列表页...%NC%
  node src/index.js
  goto :end
) else if /i "%~1"=="-o" (
  echo %GREEN%开始抓取列表页并自动打开第一条帖子...%NC%
  node src/index.js --openfirst
  goto :end
) else if /i "%~1"=="--openfirst" (
  echo %GREEN%开始抓取列表页并自动打开第一条帖子...%NC%
  node src/index.js --openfirst
  goto :end
) else if /i "%~1"=="-h" (
  call :print_help
  goto :end
) else if /i "%~1"=="--help" (
  call :print_help
  goto :end
) else (
  echo %YELLOW%未知选项: %~1%NC%
  call :print_help
  goto :end
)

:end
endlocal 