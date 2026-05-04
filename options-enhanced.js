// Enhanced Options/Settings Page JavaScript
class OptionsManager {
  constructor() {
    this.settings = {
      theme: "light",
      animations: true,
      autoFix: true,
      recommendations: true,
      notifications: true,
      criticalAlerts: true,
      scanTimeout: 20,
      keyboardShortcuts: true,
      autoScan: false,
      highlightStyle: "outline",
      exportFormat: "json",
    };

    this.stats = {
      totalScans: 0,
      issuesFound: 0,
      autoFixesApplied: 0,
      lastScanTime: null,
    };

    this.dataManager = null;
    this.errorHandler = null;
    this.init();
  }

  async init() {
    // Initialize managers
    if (window.DataManager) {
      this.dataManager = new window.DataManager();
    }
    if (window.ErrorHandler) {
      this.errorHandler = new window.ErrorHandler();
    }

    await this.loadSettings();
    await this.loadStats();
    await this.loadAdvancedAnalytics();
    this.setupEventListeners();
    this.updateUI();
    this.setupKeyboardShortcuts();
    this.setupAutoSave();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        "theme",
        "animations",
        "autoFix",
        "recommendations",
        "notifications",
        "criticalAlerts",
        "scanTimeout",
      ]);

      this.settings = { ...this.settings, ...result };
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }

  async loadStats() {
    try {
      const result = await chrome.storage.local.get(["extensionStats"]);
      if (result.extensionStats) {
        this.stats = { ...this.stats, ...result.extensionStats };
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set(this.settings);
      this.showSaveNotice();
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  setupEventListeners() {
    // Theme selection
    const themeSelect = document.getElementById("themeSelect");
    if (themeSelect) {
      themeSelect.addEventListener("change", (e) => {
        this.settings.theme = e.target.value;
        this.saveSettings();
      });
    }

    // Timeout selection
    const timeoutSelect = document.getElementById("timeoutSelect");
    if (timeoutSelect) {
      timeoutSelect.addEventListener("change", (e) => {
        this.settings.scanTimeout = parseInt(e.target.value);
        this.saveSettings();
      });
    }

    // Toggle switches
    this.setupToggle("animationsToggle", "animations");
    this.setupToggle("autoFixToggle", "autoFix");
    this.setupToggle("recommendationsToggle", "recommendations");
    this.setupToggle("notificationsToggle", "notifications");
    this.setupToggle("criticalAlertsToggle", "criticalAlerts");

    // Action buttons
    const exportButton = document.getElementById("exportData");
    if (exportButton) {
      exportButton.addEventListener("click", () => this.exportData());
    }

    const resetButton = document.getElementById("resetStats");
    if (resetButton) {
      resetButton.addEventListener("click", () => this.resetStatistics());
    }
  }

  setupToggle(elementId, settingKey) {
    const toggle = document.getElementById(elementId);
    if (toggle) {
      toggle.addEventListener("click", () => {
        this.settings[settingKey] = !this.settings[settingKey];
        this.updateToggleState(toggle, this.settings[settingKey]);
        this.saveSettings();
      });
    }
  }

  updateToggleState(toggle, isActive) {
    if (isActive) {
      toggle.classList.add("active");
    } else {
      toggle.classList.remove("active");
    }
  }

  updateUI() {
    // Update theme select
    const themeSelect = document.getElementById("themeSelect");
    if (themeSelect) {
      themeSelect.value = this.settings.theme;
    }

    // Update timeout select
    const timeoutSelect = document.getElementById("timeoutSelect");
    if (timeoutSelect) {
      timeoutSelect.value = this.settings.scanTimeout.toString();
    }

    // Update toggles
    this.updateToggleState(
      document.getElementById("animationsToggle"),
      this.settings.animations
    );
    this.updateToggleState(
      document.getElementById("autoFixToggle"),
      this.settings.autoFix
    );
    this.updateToggleState(
      document.getElementById("recommendationsToggle"),
      this.settings.recommendations
    );
    this.updateToggleState(
      document.getElementById("notificationsToggle"),
      this.settings.notifications
    );
    this.updateToggleState(
      document.getElementById("criticalAlertsToggle"),
      this.settings.criticalAlerts
    );

    // Update statistics
    this.updateStatistics();

    // Apply theme
    this.applyTheme();
  }

  updateStatistics() {
    const totalScansEl = document.getElementById("totalScans");
    const issuesFoundEl = document.getElementById("issuesFound");
    const autoFixesEl = document.getElementById("autoFixes");
    const successRateEl = document.getElementById("successRate");

    if (totalScansEl) {
      totalScansEl.textContent = this.formatNumber(this.stats.totalScans || 0);
    }

    if (issuesFoundEl) {
      issuesFoundEl.textContent = this.formatNumber(
        this.stats.issuesFound || 0
      );
    }

    if (autoFixesEl) {
      autoFixesEl.textContent = this.formatNumber(
        this.stats.autoFixesApplied || 0
      );
    }

    if (successRateEl) {
      const successRate = this.calculateSuccessRate();
      successRateEl.textContent = `${successRate}%`;
    }
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }

  calculateSuccessRate() {
    const totalScans = this.stats.totalScans || 0;
    const issuesFound = this.stats.issuesFound || 0;

    if (totalScans === 0) return 0;

    // Success rate based on average issues per scan (lower is better)
    const avgIssuesPerScan = issuesFound / totalScans;

    // Scale: 0-5 issues = 90-100%, 5-10 = 80-90%, etc.
    let successRate = 100;
    if (avgIssuesPerScan > 20) {
      successRate = 50;
    } else if (avgIssuesPerScan > 10) {
      successRate = 70;
    } else if (avgIssuesPerScan > 5) {
      successRate = 85;
    } else if (avgIssuesPerScan > 2) {
      successRate = 95;
    }

    return Math.round(successRate);
  }

  applyTheme() {
    const body = document.body;

    if (this.settings.theme === "dark") {
      body.classList.add("dark-theme");
    } else if (this.settings.theme === "auto") {
      // Check system preference
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        body.classList.add("dark-theme");
      } else {
        body.classList.remove("dark-theme");
      }
    } else {
      body.classList.remove("dark-theme");
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.altKey) {
        switch (e.key) {
          case "t":
          case "T":
            e.preventDefault();
            this.toggleTheme();
            break;
          case "r":
          case "R":
            e.preventDefault();
            this.resetStatistics();
            break;
          case "e":
          case "E":
            e.preventDefault();
            this.exportData();
            break;
        }
      }
    });
  }

  toggleTheme() {
    const themes = ["light", "dark", "auto"];
    const currentIndex = themes.indexOf(this.settings.theme);
    const nextIndex = (currentIndex + 1) % themes.length;

    this.settings.theme = themes[nextIndex];
    document.getElementById("themeSelect").value = this.settings.theme;
    this.applyTheme();
    this.saveSettings();
  }

  async exportData() {
    try {
      const exportData = {
        settings: this.settings,
        statistics: this.stats,
        exportDate: new Date().toISOString(),
        version: chrome.runtime.getManifest().version,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `accex-data-${new Date().toISOString().slice(0, 10)}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      this.showNotification("Data exported successfully!", "success");
    } catch (error) {
      console.error("Export failed:", error);
      this.showNotification("Export failed. Please try again.", "error");
    }
  }

  async resetStatistics() {
    if (
      confirm(
        "Are you sure you want to reset all statistics? This action cannot be undone."
      )
    ) {
      try {
        this.stats = {
          totalScans: 0,
          issuesFound: 0,
          autoFixesApplied: 0,
          lastScanTime: null,
        };

        await chrome.storage.local.set({ extensionStats: this.stats });
        this.updateStatistics();
        this.showNotification("Statistics reset successfully!", "success");
      } catch (error) {
        console.error("Reset failed:", error);
        this.showNotification("Reset failed. Please try again.", "error");
      }
    }
  }

  showSaveNotice() {
    const notice = document.getElementById("saveNotice");
    if (notice) {
      notice.style.display = "block";
      setTimeout(() => {
        notice.style.display = "none";
      }, 2000);
    }
  }

  showNotification(message, type = "info") {
    // Create and show a temporary notification
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
      background: ${
        type === "success"
          ? "#48bb78"
          : type === "error"
          ? "#f56565"
          : "#667eea"
      };
    `;

    document.body.appendChild(notification);

    setTimeout(() => (notification.style.opacity = "1"), 10);

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }

  async loadAdvancedAnalytics() {
    if (this.dataManager) {
      try {
        const analytics = await this.dataManager.getAnalyticsSummary();
        if (analytics) {
          this.updateStatCard("total-scans", analytics.totalScans);
          this.updateStatCard("issues-found", analytics.totalIssuesFound);
          this.updateStatCard(
            "avg-scan-time",
            `${analytics.averageScanDuration}s`
          );
          this.updateStatCard(
            "improvement-trend",
            `${analytics.improvementTrend}%`
          );
        }
      } catch (error) {
        console.error("Failed to load advanced analytics:", error);
      }
    }
  }

  updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      element.style.transform = "scale(1.1)";
      setTimeout(() => {
        element.style.transform = "scale(1)";
      }, 200);
    }
  }

  setupAutoSave() {
    const autoSaveElements = [
      "themeSelect",
      "timeoutSelect",
      "autoScanToggle",
      "highlightStyleSelect",
      "exportFormatSelect",
    ];

    autoSaveElements.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("change", () => {
          this.saveSettings();
        });
      }
    });
  }

  async exportData(format) {
    if (!this.dataManager) {
      this.showNotification("Data manager not available", "error");
      return;
    }

    try {
      let exportData;

      switch (format) {
        case "json":
          exportData = await this.dataManager.exportData("json");
          break;
        case "csv":
          exportData = await this.dataManager.exportData("csv");
          break;
        case "analytics":
          const analytics = await this.dataManager.getAnalyticsSummary();
          exportData = {
            blob: new Blob([JSON.stringify(analytics, null, 2)], {
              type: "application/json",
            }),
            filename: `accex-analytics-${Date.now()}.json`,
          };
          break;
      }

      if (exportData) {
        this.downloadBlob(exportData.blob, exportData.filename);
        this.showNotification("Data exported successfully!", "success");
      }
    } catch (error) {
      console.error("Export failed:", error);
      this.showNotification("Export failed", "error");
    }
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async clearData(dataTypes) {
    if (!this.dataManager) {
      this.showNotification("Data manager not available", "error");
      return;
    }

    const typeNames = dataTypes.join(", ");
    if (
      confirm(
        `Are you sure you want to clear ${typeNames}? This cannot be undone.`
      )
    ) {
      const success = await this.dataManager.clearData(dataTypes);

      if (success) {
        this.showNotification(`${typeNames} cleared successfully`, "success");

        if (dataTypes.includes("scanHistory")) {
          await this.loadAdvancedAnalytics();
        }
      } else {
        this.showNotification("Failed to clear data", "error");
      }
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new OptionsManager();
});

// Add dark theme CSS
const darkThemeCSS = `
  .dark-theme {
    background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
    color: #e2e8f0;
  }

  .dark-theme .settings-card {
    background: #2d3748;
    color: #e2e8f0;
  }

  .dark-theme .section-title {
    color: #e2e8f0;
  }

  .dark-theme .setting-title {
    color: #e2e8f0;
  }

  .dark-theme .setting-description {
    color: #a0aec0;
  }

  .dark-theme .setting-item {
    border-bottom-color: #4a5568;
  }

  .dark-theme .setting-select {
    background: #4a5568;
    border-color: #718096;
    color: #e2e8f0;
  }

  .dark-theme .keyboard-shortcuts {
    background: #4a5568;
  }

  .dark-theme .shortcut-item {
    border-bottom-color: #718096;
  }
`;

// Inject dark theme styles
const style = document.createElement("style");
style.textContent = darkThemeCSS;
document.head.appendChild(style);
