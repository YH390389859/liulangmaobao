/**
 * 内容抓取服务模块，负责加载和处理页面内容
 */

const path = require('path');
const fs = require('fs');
const browserConfig = require('../config/browser');
const fileSystem = require('../utils/fileSystem');

/**
 * 循环加载所有内容
 * @param {Page} page - Puppeteer页面对象
 */
async function loadAllContent(page) {
  return new Promise((resolve) => {
    let clickCount = 0;
    let screenshotCount = 0;
    let errorCount = 0;
    let totalLoadedItems = 0;
    
    // 创建日志文件
    const logFilePath = path.join(browserConfig.SCREENSHOTS_DIR, 'load-progress.log');
    fs.writeFileSync(logFilePath, `开始抓取时间: ${new Date().toLocaleString()}\n`, { flag: 'w' });
    
    // 记录日志的函数
    const logMessage = (message) => {
      console.log(message);
      fs.appendFileSync(logFilePath, `${message}\n`);
    };
    
    logMessage('开始检测并点击加载更多按钮...');
    
    // 循环函数
    const checkAndClickLoadMore = async () => {
      try {
        // 重置错误计数
        errorCount = 0;
        
        // 检查加载更多按钮是否存在
        logMessage('检查加载更多按钮...');
        
        // 直接使用页面评估，检查加载更多按钮
        const loadMoreInfo = await page.evaluate(() => {
          const loadMoreElement = document.querySelector('.DiscussionList-loadMore');
          if (!loadMoreElement) {
            return { exists: false };
          }
          
          // 寻找按钮元素
          const button = loadMoreElement.querySelector('button');
          
          return { 
            exists: true, 
            hasChildren: loadMoreElement.children.length > 0,
            hasButton: !!button,
            isVisible: loadMoreElement.offsetParent !== null,
            rect: loadMoreElement.getBoundingClientRect(),
            buttonText: button ? button.textContent.trim() : '无按钮'
          };
        });
        
        if (loadMoreInfo.exists && loadMoreInfo.hasChildren && loadMoreInfo.isVisible && loadMoreInfo.hasButton) {
          // 按钮存在且有子元素并且可见，点击它
          clickCount++;
          logMessage(`找到加载更多按钮，正在点击...（第${clickCount}次）按钮文本: "${loadMoreInfo.buttonText}"`);
          
          // 截图保存按钮点击前的状态
          await fileSystem.saveScreenshot(
            page,
            path.join(browserConfig.SCREENSHOTS_DIR, `before-click-${clickCount}.png`)
          );
          
          // 滚动到按钮位置
          await page.evaluate(() => {
            const loadMoreButton = document.querySelector('.DiscussionList-loadMore');
            if (loadMoreButton) {
              loadMoreButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
          
          // 等待滚动完成
          logMessage('等待滚动完成...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 获取按钮的确切位置 - 这是最有效的方法，根据日志分析
          const buttonPosition = await page.evaluate(() => {
            const button = document.querySelector('.DiscussionList-loadMore button');
            if (!button) return null;
            
            const rect = button.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              visible: button.offsetParent !== null,
              text: button.textContent.trim() || '无文本'
            };
          });
          
          if (buttonPosition && buttonPosition.visible) {
            logMessage(`找到按钮，位置: (${buttonPosition.x}, ${buttonPosition.y}), 文本: "${buttonPosition.text}"`);
            
            // 获取点击前的内容数量
            const beforeCount = await page.evaluate(() => {
              return document.querySelectorAll('.DiscussionListItem').length;
            });
            
            // 直接使用鼠标点击精确位置 - 这是最有效的方法
            try {
              await page.mouse.click(buttonPosition.x, buttonPosition.y);
              logMessage('已通过鼠标点击按钮');
            } catch (clickError) {
              logMessage(`鼠标点击失败: ${clickError.message}`);
              
              // 如果鼠标点击失败，尝试JavaScript click()作为备选
              await page.evaluate(() => {
                const loadMoreButton = document.querySelector('.DiscussionList-loadMore button');
                if (loadMoreButton) {
                  logMessage('通过JavaScript触发按钮点击');
                  loadMoreButton.click();
                }
              });
            }
            
            logMessage('加载更多按钮已点击，等待内容加载...');
            
            // 等待网络请求完成和内容加载
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 每次点击后截图，查看是否真的点击成功
            logMessage('保存点击后的页面截图...');
            await fileSystem.saveScreenshot(
              page,
              path.join(browserConfig.SCREENSHOTS_DIR, `after-click-${clickCount}.png`)
            );
            
            // 检查内容是否有变化
            const afterCount = await page.evaluate(() => {
              return document.querySelectorAll('.DiscussionListItem').length;
            });
            
            if (afterCount > beforeCount) {
              logMessage(`内容已更新: ${beforeCount} -> ${afterCount} 项 (增加了 ${afterCount - beforeCount} 项)`);
              totalLoadedItems = afterCount;
            } else {
              logMessage(`内容可能未变化，点击前: ${beforeCount} 项，点击后: ${afterCount} 项`);
              
              // 如果内容没有变化，可能是点击失败，增加错误计数
              errorCount++;
            }
            
            // 每3次点击保存一次完整截图
            if (clickCount % 3 === 0) {
              screenshotCount++;
              logMessage(`保存第${screenshotCount}张完整页面截图...`);
              
              await fileSystem.saveScreenshot(
                page, 
                path.join(browserConfig.SCREENSHOTS_DIR, `load-more-${screenshotCount}.png`),
                { fullPage: true }
              );
            }
            
            // 8秒后再次检查，给页面更多加载时间
            setTimeout(checkAndClickLoadMore, 8000);
          } else {
            logMessage('找到加载更多区域，但未找到可点击的按钮或按钮不可见');
            // 如果找不到按钮，可能是已经加载完成了
            finishLoading();
          }
        } else if (loadMoreInfo.exists && !loadMoreInfo.hasChildren) {
          logMessage('加载更多按钮没有子元素，已加载全部内容');
          finishLoading();
        } else {
          logMessage('未找到加载更多按钮，可能已加载全部内容');
          finishLoading();
        }
      } catch (error) {
        errorCount++;
        logMessage(`检测或点击加载更多按钮时出错(${errorCount}/3): ${error.message}`);
        
        // 如果连续出错3次，则停止尝试
        if (errorCount >= 3) {
          logMessage('连续出错3次，停止加载更多内容');
          finishLoading();
        } else {
          // 等待10秒后重试
          logMessage('10秒后重试...');
          setTimeout(checkAndClickLoadMore, 10000);
        }
      }
    };
    
    // 完成加载后的处理
    const finishLoading = async () => {
      logMessage('已完成所有内容加载');
      
      try {
        // 保存最终页面截图
        await fileSystem.saveScreenshot(
          page, 
          path.join(browserConfig.SCREENSHOTS_DIR, 'final-loaded-page.png'),
          { fullPage: true }
        );
        
        // 统计加载的帖子数量
        const postCount = await page.evaluate(() => {
          const posts = document.querySelectorAll('.DiscussionListItem');
          return posts.length;
        });
        
        logMessage(`总共加载了 ${postCount} 个帖子`);
        logMessage(`结束抓取时间: ${new Date().toLocaleString()}`);
        
        resolve(postCount);
      } catch (error) {
        logMessage(`完成加载处理时出错: ${error.message}`);
        resolve(totalLoadedItems);
      }
    };
    
    // 开始检测，延迟3秒启动
    setTimeout(checkAndClickLoadMore, 3000);
  });
}

/**
 * 分析页面内容
 * @param {Page} page - Puppeteer页面对象
 */
async function analyzePageContent(page) {
  return await page.evaluate(() => {
    const result = {
      discussionCount: document.querySelectorAll('.DiscussionListItem').length,
      categories: {},
      posters: {}
    };
    
    // 分析讨论类别
    document.querySelectorAll('.DiscussionListItem-badges .Badge').forEach(badge => {
      const category = badge.textContent.trim();
      result.categories[category] = (result.categories[category] || 0) + 1;
    });
    
    // 分析发帖人
    document.querySelectorAll('.DiscussionListItem-author').forEach(author => {
      const posterName = author.textContent.trim();
      result.posters[posterName] = (result.posters[posterName] || 0) + 1;
    });
    
    return result;
  });
}

module.exports = {
  loadAllContent,
  analyzePageContent
}; 