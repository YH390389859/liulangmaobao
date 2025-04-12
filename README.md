# 流浪猫窝网站访问工具

这是一个使用Node.js实现的网站访问工具，用于访问流浪猫窝网站(http://liulangmaobao.xyz/)。提供了两种访问方式：

1. 使用Puppeteer-Core控制本地浏览器访问
2. 使用Axios直接发送HTTP请求访问

## 功能

- 自动检测并使用本地已安装的Chrome或Edge浏览器
- 自动打开浏览器并访问目标网站
- 获取页面标题和内容
- 保存页面截图和HTML内容
- 分析网页结构和关键元素

## 安装

确保您已安装Node.js环境和Yarn，然后执行：

```bash
yarn
```

## 使用方法

### 使用Puppeteer控制本地浏览器访问

```bash
yarn start
```

### 使用Axios直接访问网站

```bash
yarn fetch
```

## 注意事项

- Puppeteer模式会显示浏览器界面，便于观察
- 代码会自动检测本地已安装的Chrome或Edge浏览器
- 程序会在访问网站30秒后自动关闭浏览器
- 如果需要无界面运行，请将`headless`参数设置为`true`

## 自定义配置

如需修改运行参数，请编辑对应文件中的相关配置：

- `src/index.js`: Puppeteer控制浏览器的配置
- `src/axios-fetch.js`: Axios直接请求的配置

## 输出文件

- `screenshot.png`: 浏览器访问的页面截图
- `output/website-content.html`: 通过Axios获取的网站HTML内容 