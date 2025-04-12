const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * 使用axios直接获取流浪猫窝网站内容
 */
async function fetchWebsite() {
  console.log('正在使用axios获取网站内容...');
  
  try {
    // 设置请求配置
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.google.com/'
      },
      timeout: 30000, // 30秒超时
      validateStatus: function (status) {
        return status >= 200 && status < 500; // 接受所有非500错误状态码
      }
    };
    
    // 创建输出目录
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 发送GET请求
    const response = await axios.get('http://liulangmaobao.xyz/', config);
    
    console.log(`状态码: ${response.status}`);
    console.log(`响应头信息: `);
    Object.entries(response.headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    if (response.status === 200) {
      console.log(`内容类型: ${response.headers['content-type']}`);
      console.log(`内容长度: ${response.data.length} 字节`);
      
      // 将HTML内容保存到文件
      const outputFile = path.join(outputDir, 'website-content.html');
      fs.writeFileSync(outputFile, response.data);
      console.log(`网站内容已保存到 ${outputFile} 文件`);
      
      // 分析响应内容
      analyzeContent(response.data);
    } else {
      console.log(`获取失败，状态码: ${response.status}`);
      console.log(`响应内容: ${response.data}`);
    }
    
  } catch (error) {
    console.error('获取网站内容时出错:');
    if (error.response) {
      // 服务器响应了，但状态码不在2xx范围内
      console.error(`状态码: ${error.response.status}`);
      console.error(`响应头: ${JSON.stringify(error.response.headers, null, 2)}`);
      console.error(`响应数据: ${error.response.data}`);
    } else if (error.request) {
      // 请求已发送但未收到响应
      console.error('未收到服务器响应');
      console.error(error.request);
    } else {
      // 设置请求时出错
      console.error('请求配置错误:', error.message);
    }
    console.error('错误配置:', error.config);
  }
}

/**
 * 分析网页内容
 * @param {string} content - HTML内容
 */
function analyzeContent(content) {
  console.log('\n内容分析结果:');
  
  // 检查重定向
  if (content.includes('window.location') || content.includes('document.location')) {
    console.log('- 检测到JavaScript重定向');
  }
  
  // 检查刷新标签
  if (content.includes('<meta http-equiv="refresh"')) {
    console.log('- 检测到meta刷新重定向');
  }
  
  // 检查标题
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    console.log(`- 页面标题: ${titleMatch[1]}`);
  }
  
  // 检查关键元素
  const bodyContentCheck = [
    { name: '加载中提示', pattern: /正在加载/i },
    { name: '错误信息', pattern: /出错/i },
    { name: '论坛内容', pattern: /<forum|bbs|板块|帖子/i }
  ];
  
  bodyContentCheck.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`- 发现 ${check.name}`);
    }
  });
  
  // 输出页面中的链接数量
  const linkMatches = content.match(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>/ig) || [];
  console.log(`- 页面包含 ${linkMatches.length} 个链接`);
  
  // 输出页面中的图片数量
  const imageMatches = content.match(/<img\s+[^>]*src=["']([^"']*)["'][^>]*>/ig) || [];
  console.log(`- 页面包含 ${imageMatches.length} 个图片`);
  
  // 查找可能的API端点
  const apiEndpoints = content.match(/['"]\/api\/[^'"]+['"]/g) || [];
  if (apiEndpoints.length > 0) {
    console.log('- 可能的API端点:');
    apiEndpoints.forEach(endpoint => {
      console.log(`  ${endpoint.replace(/['"]/g, '')}`);
    });
  }
}

// 执行函数
fetchWebsite().catch(console.error); 