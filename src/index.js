/**
 * 程序主入口文件
 */

const mainController = require('./controllers/mainController');

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 解析命令行参数
const parseCommandLineArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    autoOpenFirstPost: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i].toLowerCase();
    if (arg === '--openfirst' || arg === '-o') {
      options.autoOpenFirstPost = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
爬虫程序帮助:
  --openfirst, -o    自动打开并分析第一条帖子
  --help, -h         显示此帮助信息
      `);
      process.exit(0);
    }
  }

  return options;
};

// 获取命令行选项
const options = parseCommandLineArgs();

// 启动爬虫
console.log('开始抓取流浪猫窝网站数据...');
if (options.autoOpenFirstPost) {
  console.log('将在加载完列表页后自动打开第一条帖子');
}

mainController.runCrawler(options).catch(error => {
  console.error('程序运行出错:', error);
}); 