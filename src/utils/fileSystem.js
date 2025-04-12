/**
 * 文件系统相关工具函数
 */

const fs = require('fs');
const path = require('path');

/**
 * 清空指定目录中的所有文件
 * @param {string} directory - 要清空的目录路径
 */
function clearDirectory(directory) {
  if (fs.existsSync(directory)) {
    console.log(`清空目录: ${directory}`);
    const files = fs.readdirSync(directory);
    for (const file of files) {
      const filePath = path.join(directory, file);
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        console.log(`已删除文件: ${file}`);
      } else {
        // 如果是子目录，递归清空
        clearDirectory(filePath);
        fs.rmdirSync(filePath);
        console.log(`已删除子目录: ${file}`);
      }
    }
    console.log(`目录已清空: ${directory}`);
  }
}

/**
 * 确保目录存在，如果不存在则创建
 * @param {string} directory - 要确保存在的目录路径
 * @param {boolean} clearIfExists - 是否在目录存在时清空它
 */
function ensureDirectoryExists(directory, clearIfExists = false) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`创建目录: ${directory}`);
  } else if (clearIfExists) {
    clearDirectory(directory);
  }
}

/**
 * 保存截图到指定路径
 * @param {Page} page - Puppeteer页面对象
 * @param {string} filePath - 完整的文件保存路径
 * @param {Object} options - 截图选项
 */
async function saveScreenshot(page, filePath, options = { fullPage: false }) {
  try {
    await page.screenshot({ 
      path: filePath,
      ...options
    });
    console.log(`截图已保存为: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`保存截图时出错: ${error.message}`);
  }
}

/**
 * 保存HTML内容到文件
 * @param {string} content - HTML内容
 * @param {string} filePath - 完整的文件保存路径
 */
function saveHtmlFile(content, filePath) {
  try {
    fs.writeFileSync(filePath, content);
    console.log(`HTML文件已保存为: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`保存HTML文件时出错: ${error.message}`);
    return false;
  }
}

/**
 * 读取模板文件并替换变量
 * @param {string} templatePath - 模板文件路径
 * @param {Object} variables - 要替换的变量
 * @returns {string} 渲染后的内容
 */
function renderTemplate(templatePath, variables) {
  try {
    if (!fs.existsSync(templatePath)) {
      console.error(`模板文件不存在: ${templatePath}`);
      return null;
    }

    let template = fs.readFileSync(templatePath, 'utf8');
    
    // 替换所有变量
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, value || '');
    });
    
    return template;
  } catch (error) {
    console.error(`渲染模板时出错: ${error.message}`);
    return null;
  }
}

/**
 * 复制目录及其内容到目标位置
 * @param {string} source - 源目录路径
 * @param {string} destination - 目标目录路径
 */
function copyDirectory(source, destination) {
  try {
    // 如果目标目录不存在，创建它
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    // 读取源目录中的所有文件和子目录
    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        // 递归复制子目录
        copyDirectory(srcPath, destPath);
      } else {
        // 复制文件
        fs.copyFileSync(srcPath, destPath);
        console.log(`已复制文件: ${entry.name}`);
      }
    }
    console.log(`目录复制完成: ${path.basename(source)} -> ${path.basename(destination)}`);
    return true;
  } catch (error) {
    console.error(`复制目录时出错: ${error.message}`);
    return false;
  }
}

module.exports = {
  clearDirectory,
  ensureDirectoryExists,
  saveScreenshot,
  saveHtmlFile,
  renderTemplate,
  copyDirectory
}; 