// Background script for Trading AI Assistant
console.log('Trading AI Assistant background script loaded');

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureScreenshot') {
    captureScreenshot(sendResponse);
    return true; // Keep the message channel open for async response
  }
});

async function captureScreenshot(sendResponse) {
  try {
    const startTime = performance.now();
    console.log('📸 Screenshot request received');
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabTime = performance.now();
    
    console.log('📸 Active tab found in:', Math.round(tabTime - startTime), 'ms');
    
    if (!tab) {
      console.error('📸 No active tab found');
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    console.log('📸 Attempting to capture tab:', tab.url);

    // Capture with optimized settings for faster processing
    const captureStart = performance.now();
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',  // JPEG is much smaller than PNG for charts/photos
      quality: 65      // Balanced: Good quality but still fast
    });
    const captureEnd = performance.now();
    
    const sizeKB = Math.round(dataUrl.length / 1024);
    const totalTime = Math.round(captureEnd - startTime);
    const captureTime = Math.round(captureEnd - captureStart);
    
    console.log('📸 Screenshot captured in:', captureTime, 'ms');
    console.log('📸 Image size:', sizeKB, 'KB');
    console.log('📸 Total capture time:', totalTime, 'ms');
    
    sendResponse({ success: true, dataUrl: dataUrl });
    
    // Note: dataUrl will be garbage collected when function ends
  } catch (error) {
    console.error('📸 Screenshot capture failed:', error);
    console.error('📸 Error details:', error.message);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Trading AI Assistant installed');
    
    // Set default settings
    chrome.storage.sync.set({
      firstRun: true,
      version: chrome.runtime.getManifest().version
    });
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Trading AI Assistant started');
});

// Keep service worker alive for better performance
let keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20000);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive(); 