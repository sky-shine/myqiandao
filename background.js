// 处理后台事件
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'checkInComplete') {
      console.log('签到完成:', request.website);
    }
  });