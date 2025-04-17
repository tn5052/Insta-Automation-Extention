/**
 * Instagram Story Assistant
 * Background script for managing state and processing activity
 */

// Initialize data structure on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['targetLists', 'settings', 'activityLogs'], (data) => {
    // Initialize target lists if not exist
    if (!data.targetLists) {
      chrome.storage.local.set({ targetLists: [] });
    }
    
    // Initialize settings if not exist
    if (!data.settings) {
      chrome.storage.local.set({
        settings: {
          viewDelay: 3000, // 3 seconds
          likeProbability: 80, // 80%
          humanDelay: true, // Random delays for human-like behavior
          maxDailyInteractions: 100 // Safety limit
        }
      });
    }
    
    // Initialize activity logs if not exist
    if (!data.activityLogs) {
      chrome.storage.local.set({ activityLogs: [] });
    }
  });
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'logActivity') {
    // Store activity log
    storeActivityLog(message.data);
    sendResponse({ success: true });
  }
  return true;
});

// Helper function to store activity logs
function storeActivityLog(log) {
  chrome.storage.local.get('activityLogs', (data) => {
    const logs = data.activityLogs || [];
    
    // Add new log at the beginning
    logs.unshift({
      ...log,
      timestamp: log.timestamp || new Date().toISOString()
    });
    
    // Limit to 1000 logs to avoid storage issues
    if (logs.length > 1000) {
      logs.length = 1000;
    }
    
    chrome.storage.local.set({ activityLogs: logs });
  });
}
