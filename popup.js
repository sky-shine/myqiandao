// checkInConfigs 配置示例
const checkInConfigs = [
    {
      name: "whycan",
      url: "https://whycan.com/",
    },
    {
      name: "armbbs",
      url: "https://www.armbbs.cn/",
    },
    {
      name: "uscard",
      url: "https://www.uscardforum.com/",
    },
    {
      name: "awol",
      url: "https://bbs.aw-ol.com/",
    },
    {
      name: "linuxdo",
      url: "https://linux.do/",
    },
    {
      name: "amobbs",
      url: "https://www.amobbs.com/forum.php",
    },
    {
      name: "eevblog",
      url: "https://www.eevblog.com/forum/microcontrollers/",
    },
    {
        name: "nxp",
        url: "https://www.nxpic.org.cn/module/forum/",
        steps: [
          {
            selector: ".fastlg_l > .xi2",
            type: "css",
            waitTime: 2000
          },
          {
            selector: ".group_4 > a:nth-child(3)",
            type: "css",
            waitTime: 2000
          },
          {
            selector: "div.agreement-checkbox",
            type: "css",
            waitTime: 2000
          },
        ]
    },
    {
      name: "v2ex",
      url: "https://v2ex.com/",
      steps: [
        {
          selector: ".inner:nth-child(1) > a:nth-child(2)",
          type: "css",
          waitTime: 2000
        },
        {
          selector: "input.super",
          type: "css",
          waitTime: 1000
        }
      ]
    },
    {
      name: "st",
      url: "https://shequ.stmicroelectronics.cn/plugin.php?id=are_gift:are_gift",
      steps: [
        {
          selector: "a.score_wz_div_yqd_a",
          type: "css",
          waitTime: 2000
        }
      ]
    }
  ];

// 处理所有网站的签到
async function handleAllCheckIns() {
  document.getElementById('status').innerHTML = ''; // 清空状态显示
  saveLog('开始签到流程...');

  // 使用 Promise.all 并行处理所有签到任务
  const checkInPromises = checkInConfigs.map(async (config) => {
    try {
      await handleSingleSiteCheckIn(config);
    } catch (error) {
      saveLog(`${config.name} 处理出错: ${error.message}`);
    }
  });

  // 等待所有签到任务完成
  await Promise.all(checkInPromises);
  saveLog('所有签到任务完成');
}
  
// 处理单个网站的签到
async function handleSingleSiteCheckIn(config) {
  let tab = null;
  try {
    tab = await chrome.tabs.create({ url: config.url, active: false});
    saveLog(`${config.name}: 开始签到`);
    
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 依次执行每个步骤
    for (const step of config.steps) {
      saveLog(`${config.name}: 尝试执行步骤 - ${step.selector}`);
      const success = await executeCheckInStep(tab.id, step, config.name);
      if (!success) {
        throw new Error(`步骤失败: ${step.selector}`);
      }
      // 每个步骤之间添加额外延时
      await new Promise(resolve => setTimeout(resolve, step.waitTime));
    }

    saveLog(`${config.name}: 所有步骤执行完成`);
  } catch (error) {
    saveLog(`${config.name}: 签到过程出错 - ${error.message}`);
  } finally {
    // if (tab) {
    //   setTimeout(() => {
    //     chrome.tabs.remove(tab.id).catch(() => {
    //       saveLog(`${config.name}: 关闭标签页失败`);
    //     });
    //   }, 3000);
    // }
  }
}
  
  // 执行单个步骤的签到操作
  async function executeCheckInStep(tabId, step, siteName) {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: (selector, selectorType) => {
              let element = null;
              
              // 根据不同类型的选择器查找元素
              switch (selectorType) {
                case 'css':
                  element = document.querySelector(selector);
                //   element = document.getElementsByClassName(selector);
                  break;
                case 'text':
                  const elements = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
                  element = elements.find(el => el.textContent.trim() === selector);
                  break;
                case 'complex':
                  try {
                    element = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                  } catch (e) {
                    console.error('XPath error:', e);
                  }
                  break;
              }
  
              if (element) {
                // 尝试不同的点击方法
                try {
                  element.click();
                  return { success: true, message: '元素点击成功' };
                } catch (e1) {
                  try {
                    const event = new MouseEvent('click', {
                      view: window,
                      bubbles: true,
                      cancelable: true
                    });
                    element.dispatchEvent(event);
                    return { success: true, message: '通过事件模拟点击成功' };
                  } catch (e2) {
                    return { success: false, message: '点击失败: ' + e2.message };
                  }
                }
              }
              return { success: false, message: '未找到元素' };
            },
            args: [step.selector, step.type || 'css']
          });
  
          const result = results[0]?.result;
          saveLog(`${siteName}: ${result.message}`);
          resolve(result.success);
        } catch (error) {
          saveLog(`${siteName}: 执行脚本出错 - ${error.message}`);
          resolve(false);
        }
      }, step.waitTime);
    });
  }


// 存储日志
function saveLog(message) {
    const currentTime = new Date().toLocaleTimeString();
    const logMessage = `[${currentTime}] ${message}`;
    
    // 将日志保存到 chrome.storage
    chrome.storage.local.get(['logs'], function(result) {
      let logs = result.logs || [];
      logs.push(logMessage);
      // 只保留最近100条日志
      if (logs.length > 100) {
        logs = logs.slice(-100);
      }
      chrome.storage.local.set({ logs: logs });
    });
    
    // 同时更新状态显示
    updateStatus(message);
  }
  
  // 更新状态显示
  function updateStatus(message) {
    const statusDiv = document.getElementById('status');
    const currentTime = new Date().toLocaleTimeString();
    statusDiv.innerHTML += `[${currentTime}] ${message}<br>`;
    // 自动滚动到底部
    statusDiv.scrollTop = statusDiv.scrollHeight;
  }
  
  // 查看日志的功能
  function showLogs() {
    chrome.storage.local.get(['logs'], function(result) {
      const logs = result.logs || [];
      document.getElementById('status').innerHTML = logs.join('<br>');
    });
  }
  
  // 清除日志的功能
  function clearLogs() {
    chrome.storage.local.set({ logs: [] });
    document.getElementById('status').innerHTML = '';
  }
  
  // 初始化
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('checkInAll').addEventListener('click', handleAllCheckIns);
    // 添加查看日志按钮事件
    document.getElementById('showLogs').addEventListener('click', showLogs);
    // 添加清除日志按钮事件
    document.getElementById('clearLogs').addEventListener('click', clearLogs);
    // 初始显示最近的日志
    showLogs();
  });