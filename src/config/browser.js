/**
 * 浏览器配置信息
 */

const path = require('path');

/**
 * 查找可能的浏览器安装路径
 * @returns {Array<string>} 可能的浏览器路径数组
 */
function getBrowserPaths() {
  return [
    // Windows路径
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // 默认安装路径
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : '',
    process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], 'Google\\Chrome\\Application\\chrome.exe') : '',
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Google\\Chrome\\Application\\chrome.exe') : '',
    // Edge浏览器路径
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : ''
  ].filter(Boolean);
}

/**
 * 获取Puppeteer启动配置
 * @param {string} browserPath - 浏览器可执行文件路径
 * @returns {Object} Puppeteer启动配置
 */
function getPuppeteerConfig(browserPath) {
  return {
    headless: false, // 设置为false可以看到浏览器界面
    defaultViewport: null, // 使用默认视口
    executablePath: browserPath, // 使用找到的浏览器路径
    devtools: true, // 自动打开开发者工具
    protocolTimeout: 120000, // 增加协议超时时间到120秒
    args: [
      '--start-maximized', // 启动时最大化窗口
      '--disable-web-security', // 禁用同源策略
      '--no-sandbox', // 禁用沙箱模式
      '--disable-setuid-sandbox',
      '--disable-features=IsolateOrigins,site-per-process', // 禁用站点隔离
      '--disable-extensions', // 禁用扩展，避免广告拦截器等干扰
      '--ignore-certificate-errors', // 忽略证书错误
      '--disable-gpu', // 禁用GPU加速
      '--auto-open-devtools-for-tabs' // 自动为每个标签页打开开发者工具
    ],
    ignoreHTTPSErrors: true // 忽略HTTPS错误
  };
}

module.exports = {
  getBrowserPaths,
  getPuppeteerConfig,
  TARGET_URL: 'http://liulangmaobao.xyz/',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  SCREENSHOTS_DIR: path.join(process.cwd(), 'screenshots'),
  POSTS_DIR: path.join(process.cwd(), 'posts')
}; 