/**
 * 认证服务模块，处理登录相关功能
 */

const path = require('path');
const browserConfig = require('../config/browser');
const fileSystem = require('../utils/fileSystem');

/**
 * 用户凭据信息
 */
const credentials = {
  username: 'Eliza',
  password: 'qahmuz-huxVu5-sohkan'
};

/**
 * 登录到网站
 * @param {Page} page - Puppeteer页面对象
 */
async function login(page) {
  try {
    // 等待登录按钮出现并点击，增加超时时间
    console.log('正在查找登录按钮...');
    await page.waitForSelector('.item-logIn', { 
      timeout: 120000, // 增加到2分钟
      visible: true 
    });
    
    console.log('找到登录按钮，等待按钮稳定...');
    // 等待页面完全稳定
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('正在点击登录按钮...');
    await page.click('.item-logIn');

    // 等待模态框出现
    console.log('等待登录模态框出现...');
    await page.waitForSelector('.Modal-content', { 
      timeout: 30000,
      visible: true 
    });
    console.log('登录模态框已显示');
    
    // 等待模态框稳定
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 登录框出现后截图
    await fileSystem.saveScreenshot(
      page, 
      path.join(browserConfig.SCREENSHOTS_DIR, 'login-modal.png')
    );

    // 输入用户名和密码
    console.log('正在输入登录信息...');
    
    // 获取表单中的所有输入框
    const inputs = await page.$$('.Modal-content input');
    
    // 确保找到了输入框
    if (inputs.length < 2) {
      throw new Error('未找到足够的输入框，可能登录表单结构发生变化');
    }
    
    // 清空输入框并使用逐字输入方式
    console.log('清空并输入用户名...');
    await inputs[0].click({ clickCount: 3 }); // 全选
    await inputs[0].press('Backspace'); // 删除已有内容
    
    // 逐字符输入用户名，增加延迟
    for (const char of credentials.username) {
      await inputs[0].type(char, { delay: 150 });
      // 每输入一个字符等待一段时间
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    console.log('用户名已输入');
    
    // 清空并输入密码
    console.log('清空并输入密码...');
    await inputs[1].click({ clickCount: 3 }); // 全选
    await inputs[1].press('Backspace'); // 删除已有内容
    
    // 逐字符输入密码，增加延迟
    for (const char of credentials.password) {
      await inputs[1].type(char, { delay: 150 });
      // 每输入一个字符等待一段时间
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    console.log('密码已输入');

    // 验证输入的值是否正确
    const usernameValue = await page.evaluate(el => el.value, inputs[0]);
    const passwordValue = await page.evaluate(el => el.value, inputs[1]);
    
    console.log(`验证用户名输入: ${usernameValue.length}/${credentials.username.length} 字符`);
    console.log(`验证密码输入: ${passwordValue.length}/${credentials.password.length} 字符`);
    
    if (usernameValue.length !== credentials.username.length || 
        passwordValue.length !== credentials.password.length) {
      console.log('输入不完整，正在重试...');
      
      // 如果输入不完整，重试输入
      if (usernameValue.length !== credentials.username.length) {
        await inputs[0].click({ clickCount: 3 }); // 全选
        await inputs[0].press('Backspace'); // 删除
        await page.keyboard.type(credentials.username, { delay: 200 });
      }
      
      if (passwordValue.length !== credentials.password.length) {
        await inputs[1].click({ clickCount: 3 }); // 全选
        await inputs[1].press('Backspace'); // 删除
        await page.keyboard.type(credentials.password, { delay: 200 });
      }
      
      console.log('重新输入完成');
    }

    // 等待片刻，确保表单完全填写
    console.log('等待片刻确保表单稳定...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 点击登录按钮
    console.log('正在点击登录按钮...');
    
    // 使用更精确的选择器
    const loginButtonSelector = '.Button.Button--primary.Button--block[type="submit"]';
    await page.waitForSelector(loginButtonSelector, { 
      timeout: 10000,
      visible: true 
    });
    
    // 点击按钮前确保按钮可见
    await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      if (button) {
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, loginButtonSelector);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 点击按钮
    await page.click(loginButtonSelector);
    console.log('登录按钮已点击');
    
    // 等待登录完成，增加等待时间
    console.log('等待登录处理...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // 截图登录结果
    await fileSystem.saveScreenshot(
      page, 
      path.join(browserConfig.SCREENSHOTS_DIR, 'login-result.png')
    );
    
    return true;
  } catch (error) {
    console.error('登录过程中出错:', error.message);
    throw error;
  }
}

module.exports = {
  login,
  credentials
}; 