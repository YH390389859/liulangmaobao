/**
 * 浏览器服务模块，负责浏览器的启动和操作
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const browserConfig = require('../config/browser');

/**
 * 查找本地安装的浏览器
 * @returns {string|null} 浏览器路径，如果未找到则返回null
 */
async function findLocalBrowser() {
  console.log('正在寻找本地浏览器...');
  
  const possiblePaths = browserConfig.getBrowserPaths();
  
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      console.log(`找到浏览器: ${path}`);
      return path;
    }
  }
  
  console.error('未找到本地Chrome或Edge浏览器，请确认安装路径');
  return null;
}

/**
 * 启动浏览器并打开页面
 * @returns {Promise<{browser: Browser, page: Page}>} 浏览器和页面对象
 */
async function launchBrowser() {
  const browserPath = await findLocalBrowser();
  if (!browserPath) {
    throw new Error('未找到可用的浏览器');
  }
  
  console.log('正在启动浏览器...');
  const browser = await puppeteer.launch(
    browserConfig.getPuppeteerConfig(browserPath)
  );
  
  // 创建新页面
  const page = await browser.newPage();
  
  // 设置页面超时
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  
  // 设置用户代理
  await page.setUserAgent(browserConfig.USER_AGENT);
  
  // 监听控制台消息
  page.on('console', msg => console.log('浏览器控制台:', msg.text()));
  
  return { browser, page };
}

/**
 * 打开目标URL
 * @param {Page} page - Puppeteer页面对象
 * @param {string} url - 要打开的URL，默认使用配置中的目标URL
 */
async function navigateToUrl(page, url = browserConfig.TARGET_URL) {
  console.log(`正在访问网站: ${url}`);
  
  await page.goto(url, {
    waitUntil: 'networkidle2', // 等待网络请求完成
    timeout: 60000 // 设置超时时间为60秒
  });
  
  console.log('网站已加载完成');
  
  // 获取页面标题
  const title = await page.title();
  console.log(`页面标题: ${title}`);
  
  return title;
}

module.exports = {
  findLocalBrowser,
  launchBrowser,
  navigateToUrl
}; 