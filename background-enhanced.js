// Enhanced Background Service Worker for Accex Accessibility Scanner
class BackgroundService {
  constructor() {
    this.extensionStats = {
      totalScans: 0,
      issuesFound: 0,
      autoFixesApplied: 0,
      lastScanTime: null,
      installDate: null,
    };

    this.errorLogs = [];
    this.maxErrorLogs = 500;

    this.init();
  }

  init() {
    this.setupInstallation();
    this.setupContextMenus();
    this.setupNotifications();
    this.setupMessageHandling();
    this.setupAnalytics();
  }

  setupInstallation() {
    chrome.runtime.onInstalled.addListener((details) => {
      console.log("Accex - Accessibility Scanner extension installed.");

      if (details.reason === "install") {
        this.extensionStats.installDate = new Date().toISOString();
        chrome.storage.local.set({ extensionStats: this.extensionStats });

        // Set up default settings
        chrome.storage.local.set({
          theme: "light",
          autoFix: true,
          notifications: true,
          scanHistory: [],
          userPreferences: {
            theme: "light",
            autoScan: false,
            notifications: true,
            keyboardShortcuts: true,
            exportFormat: "json",
            highlightStyle: "outline",
          },
        });

        this.showNotification(
          "Welcome to Accex!",
          "Click the extension icon to start scanning for accessibility issues."
        );
      }

      // Load existing stats
      chrome.storage.local.get(["extensionStats"], (result) => {
        if (result.extensionStats) {
          this.extensionStats = {
            ...this.extensionStats,
            ...result.extensionStats,
          };
        }
      });
    });
  }

  setupContextMenus() {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.create({
        id: "scan-element",
        title: "🎯 Scan this element for accessibility",
        contexts: ["all"],
      });

      chrome.contextMenus.create({
        id: "scan-page",
        title: "🔍 Run full page accessibility scan",
        contexts: ["page"],
      });

      chrome.contextMenus.create({
        id: "separator1",
        type: "separator",
        contexts: ["all"],
      });

      chrome.contextMenus.create({
        id: "export-results",
        title: "📊 Export last scan results",
        contexts: ["page"],
      });

      chrome.contextMenus.create({
        id: "open-options",
        title: "⚙️ Open Accex settings",
        contexts: ["page"],
      });
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenu(info, tab);
    });
  }

  setupNotifications() {
    this.showNotification = (title, message, type = "basic") => {
      chrome.notifications.create({
        type: type,
        iconUrl: "icons/icon48.png",
        title: title,
        message: message,
      });
    };
  }

  setupMessageHandling() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open
    });
  }

  setupAnalytics() {
    chrome.tabs.onActivated.addListener(() => {
      this.trackUsage("tab_activated");
    });

    chrome.action.onClicked.addListener(() => {
      this.trackUsage("extension_clicked");
    });

    if (chrome.commands) {
      chrome.commands.onCommand.addListener((command) => {
        this.trackUsage(`keyboard_shortcut_${command}`);
      });
    }
  }

  handleContextMenu(info, tab) {
    switch (info.menuItemId) {
      case "scan-element":
        this.scanElement(tab, info);
        break;
      case "scan-page":
        this.scanPage(tab);
        break;
      case "export-results":
        this.exportLastResults(tab);
        break;
      case "open-options":
        this.openOptions();
        break;
    }
  }

  async scanElement(tab, info) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (x, y) => {
          const element = document.elementFromPoint(x, y);
          if (element && window.accexScanner) {
            window.accexScanner.scanSpecificElement(element);
          }
        },
        args: [info.x || 0, info.y || 0],
      });
    } catch (error) {
      console.error("Failed to scan element:", error);
    }
  }

  async scanPage(tab) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.accexScanner) {
            window.accexScanner.runAccessibilityScan();
          }
        },
      });
    } catch (error) {
      console.error("Failed to scan page:", error);
    }
  }

  async exportLastResults(tab) {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.DataManager) {
            return new window.DataManager().exportData();
          }
          return null;
        },
      });

      if (result && result[0]?.result) {
        chrome.tabs.sendMessage(tab.id, {
          type: "download-export",
          data: result[0].result,
        });
      }
    } catch (error) {
      console.error("Failed to export results:", error);
    }
  }

  openOptions() {
    chrome.runtime.openOptionsPage();
  }

  handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case "error-log":
          this.handleErrorLog(message.error);
          sendResponse({ success: true });
          break;

        case "analytics-event":
          this.handleAnalyticsEvent(message.event, message.data);
          sendResponse({ success: true });
          break;

        case "backup-data":
          this.handleBackupRequest(sendResponse);
          break;

        case "show-notification":
          this.showNotification(message.title, message.message);
          sendResponse({ success: true });
          break;

        case "scan-complete":
          this.handleScanComplete(message);
          sendResponse({ success: true });
          break;

        case "scanPage":
        case "action":
          if (message.action === "scanPage") {
            this.injectAxeCore(sender.tab?.id, sendResponse);
          }
          break;

        case "scanResults":
          console.log(
            "Scan results received:",
            message.data?.length || 0,
            "issues"
          );
          this.extensionStats.totalScans++;
          this.extensionStats.issuesFound += message.data?.length || 0;
          this.extensionStats.lastScanTime = new Date().toISOString();
          chrome.storage.local.set({ extensionStats: this.extensionStats });
          sendResponse({ success: true });
          break;

        case "autoFixApplied":
          this.extensionStats.autoFixesApplied += message.count || 1;
          chrome.storage.local.set({ extensionStats: this.extensionStats });
          sendResponse({ success: true });
          break;

        case "getStats":
          sendResponse({ success: true, stats: this.extensionStats });
          break;

        default:
          console.log("Unknown message type:", message.type || message.action);
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Message handling error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  handleErrorLog(error) {
    this.errorLogs.push({
      ...error,
      id: Date.now(),
    });

    if (this.errorLogs.length > this.maxErrorLogs) {
      this.errorLogs.splice(0, this.errorLogs.length - this.maxErrorLogs);
    }

    chrome.storage.local.set({ errorLogs: this.errorLogs });
  }

  handleAnalyticsEvent(event, data) {
    chrome.storage.local.get(["analytics"], (result) => {
      const analytics = result.analytics || {};

      if (!analytics.events) analytics.events = {};
      if (!analytics.events[event]) analytics.events[event] = 0;

      analytics.events[event]++;
      analytics.lastEventDate = new Date().toISOString();

      chrome.storage.local.set({ analytics });
    });
  }

  async handleBackupRequest(sendResponse) {
    try {
      const allData = await chrome.storage.local.get(null);
      sendResponse({ success: true, data: allData });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  handleScanComplete(message) {
    this.extensionStats.totalScans++;
    this.extensionStats.issuesFound += message.issueCount || 0;
    this.extensionStats.lastScanTime = new Date().toISOString();

    chrome.storage.local.set({ extensionStats: this.extensionStats });

    chrome.storage.local.get(["userPreferences"], (result) => {
      const prefs = result.userPreferences || {};
      if (prefs.notifications !== false) {
        this.showNotification(
          "Scan Complete",
          `Found ${message.issueCount || 0} accessibility issues`
        );
      }
    });
  }

  trackUsage(event) {
    chrome.storage.local.get(["usageStats"], (result) => {
      const stats = result.usageStats || {};
      const today = new Date().toDateString();

      if (!stats[today]) stats[today] = {};
      if (!stats[today][event]) stats[today][event] = 0;

      stats[today][event]++;

      chrome.storage.local.set({ usageStats: stats });
    });
  }

  async injectAxeCore(tabId, sendResponse) {
    if (!tabId) {
      sendResponse({ success: false, error: "No tab ID provided" });
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["axe.min.js"],
      });

      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: "runAxeScan" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Axe scan error:", chrome.runtime.lastError);
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
            });
          } else {
            sendResponse(response || { success: true });
          }
        });
      }, 100);
    } catch (error) {
      console.error("Failed to inject axe-core:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize the background service
new BackgroundService();
