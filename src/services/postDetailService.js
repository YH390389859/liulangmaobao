/**
 * 帖子详情服务模块，用于打开和处理帖子详情页
 */

const path = require('path');
const fs = require('fs');
const browserConfig = require('../config/browser');
const fileSystem = require('../utils/fileSystem');

/**
 * 打开并处理帖子详情页
 * @param {Page} page - 当前的Puppeteer页面对象
 * @param {Browser} browser - Puppeteer浏览器实例
 * @param {number} itemIndex - 要打开的讨论项目索引，默认为0（第一个）
 * @returns {Promise<Object>} 帖子详情信息
 */
async function openPostDetail(page, browser, itemIndex = 0) {
  // 创建一个日志文件来记录详情页处理
  const logFilePath = path.join(browserConfig.SCREENSHOTS_DIR, 'post-detail.log');
  fs.writeFileSync(logFilePath, `开始处理帖子详情页: ${new Date().toLocaleString()}\n`, { flag: 'w' });
  
  const logMessage = (message) => {
    console.log(message);
    fs.appendFileSync(logFilePath, `${message}\n`);
  };
  
  try {
    // 先截图主页面状态
    await fileSystem.saveScreenshot(
      page,
      path.join(browserConfig.SCREENSHOTS_DIR, 'before-open-detail.png')
    );
    
    // 获取所有讨论项目的链接
    const postLinks = await page.evaluate(() => {
      const items = document.querySelectorAll('.DiscussionListItem-main');
      return Array.from(items).map((link, index) => {
        return {
          index,
          title: link.textContent.trim(),
          href: link.getAttribute('href')
        };
      });
    });
    
    if (!postLinks || postLinks.length === 0) {
      logMessage('未找到任何讨论项目链接');
      return null;
    }
    
    // 确保索引在有效范围内
    if (itemIndex >= postLinks.length) {
      logMessage(`指定的索引 ${itemIndex} 超出范围，共有 ${postLinks.length} 个帖子`);
      itemIndex = 0;
      logMessage(`已重置为第一个帖子`);
    }
    
    const targetPost = postLinks[itemIndex];
    logMessage(`准备打开第 ${itemIndex + 1} 个帖子: "${targetPost.title}"`);
    logMessage(`帖子链接: ${targetPost.href}`);
    
    // 创建一个新的标签页而不是在当前页面导航
    logMessage('正在创建新标签页...');
    const newPage = await browser.newPage();
    
    // 设置页面参数
    newPage.setDefaultTimeout(60000);
    newPage.setDefaultNavigationTimeout(60000);
    await newPage.setUserAgent(browserConfig.USER_AGENT);
    
    // 监听控制台消息
    newPage.on('console', msg => logMessage(`详情页控制台: ${msg.text()}`));
    
    // 为每种资源类型设置计数器
    let resourceCount = {
      total: 0,
      loaded: 0,
      failed: 0,
      types: {}
    };
    
    // 监听资源请求
    newPage.on('request', request => {
      resourceCount.total++;
      const type = request.resourceType();
      resourceCount.types[type] = (resourceCount.types[type] || 0) + 1;
    });
    
    // 监听资源加载成功
    newPage.on('requestfinished', () => {
      resourceCount.loaded++;
    });
    
    // 监听资源加载失败
    newPage.on('requestfailed', request => {
      resourceCount.failed++;
      logMessage(`资源加载失败: ${request.url().substring(0, 100)}...`);
    });
    
    // 网站的完整URL
    const fullUrl = new URL(targetPost.href, browserConfig.TARGET_URL).href;
    logMessage(`正在导航到: ${fullUrl}`);
    
    // 导航到帖子详情页
    await newPage.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: 120000
    });
    
    logMessage('页面初步加载完成，等待额外资源...');
    
    // 等待页面稳定
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 检查页面是否出现错误提示
    const checkForErrorsAndReload = async () => {
      const hasError = await newPage.evaluate(() => {
        return !!document.querySelector('.Alert.Alert--error');
      });
      
      if (hasError) {
        logMessage('检测到页面错误提示，正在刷新页面...');
        await newPage.reload({ waitUntil: 'networkidle2', timeout: 120000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        return true;
      }
      return false;
    };
    
    // 先检查错误，如果有则刷新
    let pageReloaded = await checkForErrorsAndReload();
    
    // 点击"Scrubber-first"元素跳转到帖子开头
    try {
      logMessage('正在寻找并点击"Scrubber-first"元素...');
      const hasScrubberFirst = await newPage.evaluate(() => {
        const firstButton = document.querySelector('.Scrubber-first');
        if (firstButton) {
          firstButton.click();
          return true;
        }
        return false;
      });
      
      if (hasScrubberFirst) {
        logMessage('已点击"Scrubber-first"元素，等待页面响应...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        logMessage('未找到"Scrubber-first"元素，继续执行...');
      }
    } catch (error) {
      logMessage(`尝试点击"Scrubber-first"元素时出错: ${error.message}`);
    }
    
    // 再次检查页面是否出现错误提示（点击后可能出现）
    if (!pageReloaded) {
      pageReloaded = await checkForErrorsAndReload();
    }
    
    // 循环滚动到底部直到没有新资源加载
    logMessage('开始滚动到页面底部...');
    let prevResourceCount = resourceCount.total;
    let noNewResourcesCount = 0;
    
    // 滚动到底部并等待新资源加载的函数
    const scrollToBottomAndWait = async () => {
      // 检查是否出现错误提示
      const hasError = await checkForErrorsAndReload();
      if (hasError) {
        // 重置计数器
        prevResourceCount = resourceCount.total;
        noNewResourcesCount = 0;
        return true; // 继续滚动
      }
      
      // 滚动到页面底部
      await newPage.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // 等待可能的新资源加载
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 检查是否有新资源请求
      if (resourceCount.total === prevResourceCount) {
        noNewResourcesCount++;
        logMessage(`滚动后没有新资源加载，计数: ${noNewResourcesCount}/3`);
      } else {
        noNewResourcesCount = 0;
        logMessage(`检测到新资源加载，总计: ${resourceCount.total}, 新增: ${resourceCount.total - prevResourceCount}`);
        prevResourceCount = resourceCount.total;
      }
      
      return noNewResourcesCount < 3; // 如果连续3次没有新资源，认为加载完成
    };
    
    // 执行滚动循环
    let shouldContinueScrolling = true;
    while (shouldContinueScrolling) {
      shouldContinueScrolling = await scrollToBottomAndWait();
    }
    
    logMessage('页面滚动完成，所有内容已加载');
    
    // 查找主要内容元素
    const contentLoaded = await newPage.evaluate(() => {
      const postStream = document.querySelector('.PostStream');
      const posts = document.querySelectorAll('.Post');
      return {
        hasPostStream: !!postStream,
        postCount: posts.length,
        title: document.title
      };
    });
    
    logMessage(`页面标题: ${contentLoaded.title}`);
    logMessage(`内容加载状态: 找到帖子流 - ${contentLoaded.hasPostStream}, 帖子数量 - ${contentLoaded.postCount}`);
    logMessage(`资源统计: 总请求 - ${resourceCount.total}, 加载成功 - ${resourceCount.loaded}, 加载失败 - ${resourceCount.failed}`);
    
    // 资源类型统计
    Object.entries(resourceCount.types).forEach(([type, count]) => {
      logMessage(`  ${type}: ${count}个请求`);
    });
    
    // 保存详情页截图
    await fileSystem.saveScreenshot(
      newPage,
      path.join(browserConfig.SCREENSHOTS_DIR, 'post-detail.png'),
      { fullPage: true }
    );
    
    // 等待浏览器空闲
    logMessage('正在检查页面是否完全加载...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 收集帖子数据
    const postData = await newPage.evaluate(() => {
      // 获取页面上所有帖子
      const posts = Array.from(document.querySelectorAll('.Post'));
      
      return {
        title: document.querySelector('.DiscussionHero-title')?.textContent.trim() || document.title,
        totalPosts: posts.length,
        firstPost: posts.length > 0 ? {
          author: posts[0].querySelector('.PostUser-name')?.textContent.trim() || '未知',
          time: posts[0].querySelector('.PostMeta time')?.textContent.trim() || '未知',
          content: posts[0].querySelector('.Post-body')?.textContent.trim() || '无内容',
          hasAttachments: posts[0].querySelectorAll('.Post-body img, .Post-body a').length > 0
        } : null,
        tags: Array.from(document.querySelectorAll('.DiscussionHero-tags .TagLabel')).map(tag => tag.textContent.trim())
      };
    });
    
    logMessage(`帖子标题: ${postData.title}`);
    logMessage(`帖子总数: ${postData.totalPosts}`);
    if (postData.firstPost) {
      logMessage(`作者: ${postData.firstPost.author}`);
      logMessage(`发布时间: ${postData.firstPost.time}`);
      logMessage(`内容摘要: ${postData.firstPost.content.substring(0, 100)}...`);
      logMessage(`包含附件: ${postData.firstPost.hasAttachments ? '是' : '否'}`);
    }
    logMessage(`标签: ${postData.tags.join(', ')}`);
    
    // 将详细信息保存到文件
    const detailDataPath = path.join(browserConfig.SCREENSHOTS_DIR, 'post-detail-data.json');
    fs.writeFileSync(detailDataPath, JSON.stringify(postData, null, 2));
    logMessage(`详细信息已保存到: ${detailDataPath}`);
    
    // 保存帖子内容到HTML文件
    try {
      // 获取帖子标题和PostStream内容
      const { postTitle, postHtml, author, time, tags } = await newPage.evaluate(() => {
        const heroTitle = document.querySelector('.DiscussionHero-title');
        const postStream = document.querySelector('.PostStream');
        const firstPost = document.querySelector('.Post');
        
        return {
          postTitle: heroTitle ? heroTitle.textContent.trim() : document.title,
          postHtml: postStream ? postStream.outerHTML : null,
          author: firstPost ? (firstPost.querySelector('.PostUser-name')?.textContent.trim() || '未知') : '未知',
          time: firstPost ? (firstPost.querySelector('.PostMeta time')?.textContent.trim() || '未知') : '未知',
          tags: Array.from(document.querySelectorAll('.DiscussionHero-tags .TagLabel'))
            .map(tag => `<span class="post-tag">${tag.textContent.trim()}</span>`)
            .join(' ') || ''
        };
      });
      
      if (postHtml) {
        // 创建安全的文件夹名称
        const safeFolderName = postTitle
          .replace(/[\\/:*?"<>|]/g, '_') // 替换Windows文件系统不允许的字符
          .replace(/\s+/g, '-')          // 空格替换为连字符
          .substring(0, 50);              // 限制长度
        
        // 创建帖子目录
        const postDir = path.join(browserConfig.POSTS_DIR, safeFolderName);
        fileSystem.ensureDirectoryExists(postDir);
        
        // 确保templates目录存在
        const templatesDir = path.join(process.cwd(), 'src', 'templates');
        fileSystem.ensureDirectoryExists(templatesDir, false);
        
        // 复制assets目录到帖子目录
        const srcAssetsDir = path.join(templatesDir, 'assets');
        const destAssetsDir = path.join(postDir, 'assets');
        if (fs.existsSync(srcAssetsDir)) {
          logMessage('正在复制assets目录到帖子目录...');
          fileSystem.copyDirectory(srcAssetsDir, destAssetsDir);
          
          // 添加.htaccess文件以解决CORS问题（如果通过HTTP服务器访问）
          const htaccessPath = path.join(postDir, '.htaccess');
          const htaccessContent = `
# 允许跨域访问
<IfModule mod_headers.c>
  <FilesMatch "\\.(ttf|ttc|otf|eot|woff|woff2|font.css)$">
    Header set Access-Control-Allow-Origin "*"
  </FilesMatch>
</IfModule>

# 设置字体文件的MIME类型
AddType application/font-woff2 .woff2
AddType application/font-woff .woff
AddType application/x-font-ttf .ttf
AddType application/x-font-opentype .otf
AddType application/vnd.ms-fontobject .eot
`;
          fs.writeFileSync(htaccessPath, htaccessContent);
          logMessage('已添加.htaccess文件以解决CORS问题');
          
          // 创建本地启动服务器的脚本
          const serverScriptPath = path.join(postDir, 'start-server.bat');
          const serverScriptContent = `@echo off
echo 正在启动本地Web服务器...
echo 请在浏览器中访问: http://localhost:8000
echo 按Ctrl+C可以停止服务器

cd /d "%~dp0"
python -m http.server 8000
`;
          fs.writeFileSync(serverScriptPath, serverScriptContent);
          logMessage('已添加start-server.bat脚本用于启动本地服务器');
        } else {
          logMessage('模板assets目录不存在，跳过复制');
        }
        
        // 获取原始样式
        const originalStyles = await newPage.evaluate(() => {
          const styles = Array.from(document.querySelectorAll('style'));
          return styles.map(style => style.textContent).join('\n');
        });
        
        // 添加解决CORS问题的注释说明
        const corsNote = `
<!-- 
注意：由于浏览器安全限制，直接打开HTML文件可能无法加载字体文件（CORS错误）。
请使用以下方式之一查看此页面：
1. 通过Web服务器访问（如启动提供的start-server.bat脚本）
2. 在Chrome浏览器中添加 --allow-file-access-from-files 参数启动
-->
`;
        
        // 读取并渲染模板
        const templatePath = path.join(templatesDir, 'post-template.html');
        if (fs.existsSync(templatePath)) {
          const html = fileSystem.renderTemplate(templatePath, {
            post_title: postTitle,
            post_author: author,
            post_time: time,
            post_count: postData.totalPosts,
            post_tags: tags,
            post_content: postHtml,
            original_styles: `<style>\n${originalStyles}\n</style>`,
            crawl_time: new Date().toLocaleString()
          });
          
          if (html) {
            // 保存到index.html文件
            const htmlFilePath = path.join(postDir, 'index.html');
            fileSystem.saveHtmlFile(html, htmlFilePath);
            logMessage(`已将帖子内容保存到: ${htmlFilePath}`);
          } else {
            logMessage('渲染模板失败，使用备用方法保存HTML');
            
            // 复制assets目录到帖子目录（即使使用备用模板也需要）
            const srcAssetsDir = path.join(templatesDir, 'assets');
            const destAssetsDir = path.join(postDir, 'assets');
            if (fs.existsSync(srcAssetsDir)) {
              logMessage('正在复制assets目录到帖子目录...');
              fileSystem.copyDirectory(srcAssetsDir, destAssetsDir);
            } else {
              logMessage('模板assets目录不存在，跳过复制');
            }
            
            // 备用方法：使用内联模板
            const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${postTitle}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }
    /* 保留原页面样式 */
    ${originalStyles}
  </style>
</head>
<body>
  <div class="container">
    <h1>${postTitle}</h1>
    ${postHtml}
  </div>
</body>
</html>`;
            
            // 保存到index.html文件
            const htmlFilePath = path.join(postDir, 'index.html');
            fileSystem.saveHtmlFile(fullHtml, htmlFilePath);
            logMessage(`使用备用模板将帖子内容保存到: ${htmlFilePath}`);
          }
        } else {
          logMessage(`模板文件不存在: ${templatePath}，使用备用模板`);
          
          // 复制assets目录到帖子目录（即使使用备用模板也需要）
          const srcAssetsDir = path.join(templatesDir, 'assets');
          const destAssetsDir = path.join(postDir, 'assets');
          if (fs.existsSync(srcAssetsDir)) {
            logMessage('正在复制assets目录到帖子目录...');
            fileSystem.copyDirectory(srcAssetsDir, destAssetsDir);
          } else {
            logMessage('模板assets目录不存在，跳过复制');
          }
          
          // 备用方法：使用内联模板
          const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${postTitle}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }
    /* 保留原页面样式 */
    ${originalStyles}
  </style>
</head>
<body>
  <div class="container">
    <h1>${postTitle}</h1>
    ${postHtml}
  </div>
</body>
</html>`;
          
          // 保存到index.html文件
          const htmlFilePath = path.join(postDir, 'index.html');
          fileSystem.saveHtmlFile(fullHtml, htmlFilePath);
          logMessage(`使用备用模板将帖子内容保存到: ${htmlFilePath}`);
        }
        
        // 保存截图到同一目录
        await fileSystem.saveScreenshot(
          newPage,
          path.join(postDir, 'full-page.png'),
          { fullPage: true }
        );
        
        // 复制JSON数据到帖子目录
        const postDataPath = path.join(postDir, 'post-data.json');
        fs.writeFileSync(postDataPath, JSON.stringify(postData, null, 2));
      } else {
        logMessage('无法找到PostStream内容，跳过HTML文件保存');
      }
    } catch (error) {
      logMessage(`保存帖子HTML内容时出错: ${error.message}`);
    }
    
    logMessage('帖子详情页处理完成');
    return {
      page: newPage,
      data: postData
    };
  } catch (error) {
    logMessage(`处理帖子详情时出错: ${error.message}`);
    logMessage(error.stack);
    return null;
  }
}

module.exports = {
  openPostDetail
}; 