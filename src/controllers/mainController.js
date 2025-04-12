/**
 * 主控制器模块，协调各个服务的工作
 */

const path = require('path');
const browserConfig = require('../config/browser');
const fileSystem = require('../utils/fileSystem');
const browserService = require('../services/browserService');
const authService = require('../services/authService');
const contentService = require('../services/contentService');
const postDetailService = require('../services/postDetailService');

/**
 * 抓取网站数据的主控制流程
 * @param {Object} options - 运行选项
 * @param {boolean} options.autoOpenFirstPost - 是否自动打开第一条帖子，默认为false
 */
async function runCrawler(options = {}) {
  const { autoOpenFirstPost = false } = options;
  let browser, page, detailPage;
  
  try {
    // 确保截图目录存在并清空
    fileSystem.ensureDirectoryExists(browserConfig.SCREENSHOTS_DIR, true);
    
    // 确保posts目录存在，但不清空它
    fileSystem.ensureDirectoryExists(browserConfig.POSTS_DIR, false);
    
    // 启动浏览器
    const browserInstance = await browserService.launchBrowser();
    browser = browserInstance.browser;
    page = browserInstance.page;
    
    // 导航到目标网站
    await browserService.navigateToUrl(page);
    
    // 登录
    await authService.login(page);
    
    // 加载所有内容
    const postCount = await contentService.loadAllContent(page);
    
    // 分析页面内容
    if (postCount > 0) {
      const analysisResult = await contentService.analyzePageContent(page);
      console.log('内容分析结果:', JSON.stringify(analysisResult, null, 2));
      
      // 根据autoOpenFirstPost参数决定是否自动打开第一条帖子
      if (autoOpenFirstPost) {
        console.log('自动打开第一条帖子的详情页...');
        const detailResult = await postDetailService.openPostDetail(page, browser, 0);
        
        if (detailResult) {
          detailPage = detailResult.page;
          console.log('帖子详情页已打开，数据已提取');
          
          // 将帖子数据写入总体分析结果
          const summaryPath = path.join(browserConfig.SCREENSHOTS_DIR, 'crawler-summary.json');
          const summary = {
            listPageAnalysis: analysisResult,
            firstPostDetail: detailResult.data,
            timestamp: new Date().toISOString(),
            totalPostsFound: postCount
          };
          
          require('fs').writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
          console.log(`抓取摘要已保存到: ${summaryPath}`);
        } else {
          console.log('无法打开帖子详情页');
        }
      } else {
        console.log('未启用自动打开帖子详情功能，如需查看帖子详情请传入autoOpenFirstPost=true选项');
        
        // 仅保存列表页分析结果
        const summaryPath = path.join(browserConfig.SCREENSHOTS_DIR, 'crawler-summary.json');
        const summary = {
          listPageAnalysis: analysisResult,
          timestamp: new Date().toISOString(),
          totalPostsFound: postCount
        };
        
        require('fs').writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        console.log(`抓取摘要已保存到: ${summaryPath}`);
      }
    }
    
    // 完成抓取，等待用户手动关闭
    console.log('抓取已完成，请手动关闭浏览器或按Ctrl+C终止程序');
    
  } catch (error) {
    console.error('抓取过程中出错:', error);
    
    // 出错时截图
    if (page) {
      try {
        await fileSystem.saveScreenshot(
          page, 
          path.join(browserConfig.SCREENSHOTS_DIR, 'error-screenshot.png')
        );
        console.log('错误状态截图已保存');
      } catch (screenshotError) {
        console.error('保存错误截图时出错:', screenshotError);
      }
    }
  }
}

module.exports = {
  runCrawler
}; 