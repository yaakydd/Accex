// Data Analytics Manager for Accex Extension
class DataManager {
  constructor() {
    this.storage = chrome.storage.local;
    this.setupDataStructure();
    this.setupAnalytics();
  }

  async setupDataStructure() {
    const defaultData = {
      scanHistory: [],
      userPreferences: {
        theme: "light",
        autoScan: false,
        notifications: true,
        keyboardShortcuts: true,
        exportFormat: "json",
        highlightStyle: "outline",
      },
      analytics: {
        totalScans: 0,
        issuesFound: 0,
        issuesFixed: 0,
        lastScanDate: null,
        averageIssuesPerScan: 0,
        mostCommonIssues: {},
        scanDuration: [],
        usagePatterns: {},
      },
      cache: {
        recommendations: {},
        pageAnalysis: {},
      },
    };

    try {
      const stored = await this.storage.get(Object.keys(defaultData));

      // Merge with defaults for any missing keys
      for (const [key, defaultValue] of Object.entries(defaultData)) {
        if (!(key in stored)) {
          await this.storage.set({ [key]: defaultValue });
        }
      }
    } catch (error) {
      console.error("Failed to setup data structure:", error);
    }
  }

  async saveScanResults(results, pageInfo) {
    try {
      const scanEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        url: pageInfo.url,
        title: pageInfo.title,
        issueCount: results.length,
        issues: results.map((issue) => ({
          id: issue.id,
          impact: issue.impact,
          description: issue.description,
          elementCount: issue.nodes?.length || 1,
        })),
        scanDuration: pageInfo.scanDuration || 0,
        userAgent: navigator.userAgent,
      };

      // Get current history
      const { scanHistory = [] } = await this.storage.get(["scanHistory"]);

      // Add new entry
      scanHistory.unshift(scanEntry);

      // Limit history size (keep last 100 scans)
      if (scanHistory.length > 100) {
        scanHistory.splice(100);
      }

      // Save updated history
      await this.storage.set({ scanHistory });

      // Update analytics
      await this.updateAnalytics(scanEntry);

      return scanEntry.id;
    } catch (error) {
      console.error("Failed to save scan results:", error);
      return null;
    }
  }

  async updateAnalytics(scanEntry) {
    try {
      const { analytics = {} } = await this.storage.get(["analytics"]);

      // Update counters
      analytics.totalScans = (analytics.totalScans || 0) + 1;
      analytics.issuesFound =
        (analytics.issuesFound || 0) + scanEntry.issueCount;
      analytics.lastScanDate = scanEntry.timestamp;

      // Update scan duration tracking
      if (!analytics.scanDuration) analytics.scanDuration = [];
      analytics.scanDuration.push(scanEntry.scanDuration);
      if (analytics.scanDuration.length > 50) {
        analytics.scanDuration.shift(); // Keep last 50 durations
      }

      // Update average issues per scan
      analytics.averageIssuesPerScan =
        analytics.issuesFound / analytics.totalScans;

      // Update most common issues
      if (!analytics.mostCommonIssues) analytics.mostCommonIssues = {};
      scanEntry.issues.forEach((issue) => {
        analytics.mostCommonIssues[issue.id] =
          (analytics.mostCommonIssues[issue.id] || 0) + 1;
      });

      await this.storage.set({ analytics });
    } catch (error) {
      console.error("Failed to update analytics:", error);
    }
  }

  async getAnalyticsSummary() {
    try {
      const { analytics = {}, scanHistory = [] } = await this.storage.get([
        "analytics",
        "scanHistory",
      ]);

      // Calculate trends
      const recentScans = scanHistory.slice(0, 10);
      const recentIssueCount = recentScans.reduce(
        (sum, scan) => sum + scan.issueCount,
        0
      );
      const recentAverage =
        recentScans.length > 0 ? recentIssueCount / recentScans.length : 0;

      // Calculate improvement trend
      const oldScans = scanHistory.slice(10, 20);
      const oldIssueCount = oldScans.reduce(
        (sum, scan) => sum + scan.issueCount,
        0
      );
      const oldAverage =
        oldScans.length > 0 ? oldIssueCount / oldScans.length : 0;

      const improvementTrend =
        oldAverage > 0 ? ((oldAverage - recentAverage) / oldAverage) * 100 : 0;

      // Get most common issues (top 5)
      const commonIssues = Object.entries(analytics.mostCommonIssues || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([issue, count]) => ({ issue, count }));

      return {
        totalScans: analytics.totalScans || 0,
        totalIssuesFound: analytics.issuesFound || 0,
        averageIssuesPerScan:
          Math.round((analytics.averageIssuesPerScan || 0) * 10) / 10,
        recentAverage: Math.round(recentAverage * 10) / 10,
        improvementTrend: Math.round(improvementTrend * 10) / 10,
        commonIssues,
        lastScanDate: analytics.lastScanDate,
        averageScanDuration: this.calculateAverageDuration(
          analytics.scanDuration || []
        ),
      };
    } catch (error) {
      console.error("Failed to get analytics summary:", error);
      return null;
    }
  }

  calculateAverageDuration(durations) {
    if (durations.length === 0) return 0;
    const sum = durations.reduce((a, b) => a + b, 0);
    return Math.round((sum / durations.length) * 10) / 10;
  }

  async exportData(format = "json") {
    try {
      const data = await this.storage.get(null); // Get all data

      if (format === "csv") {
        return this.exportAsCSV(data);
      } else {
        return this.exportAsJSON(data);
      }
    } catch (error) {
      console.error("Failed to export data:", error);
      return null;
    }
  }

  exportAsJSON(data) {
    const exportData = {
      ...data,
      exportDate: new Date().toISOString(),
      version: chrome.runtime.getManifest()?.version || "2.0.0",
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    return {
      blob,
      filename: `accex-data-export-${Date.now()}.json`,
    };
  }

  exportAsCSV(data) {
    const { scanHistory = [] } = data;

    const headers = [
      "Date",
      "URL",
      "Title",
      "Issues Found",
      "Scan Duration (ms)",
      "Top Issue Types",
    ];
    const rows = scanHistory.map((scan) => [
      new Date(scan.timestamp).toLocaleDateString(),
      scan.url,
      scan.title,
      scan.issueCount,
      scan.scanDuration,
      scan.issues
        .map((i) => i.id)
        .slice(0, 3)
        .join("; "),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });

    return {
      blob,
      filename: `accex-scan-history-${Date.now()}.csv`,
    };
  }

  async getUserPreferences() {
    try {
      const { userPreferences } = await this.storage.get(["userPreferences"]);
      return userPreferences || {};
    } catch (error) {
      console.error("Failed to get user preferences:", error);
      return {};
    }
  }

  async saveUserPreferences(preferences) {
    try {
      const { userPreferences = {} } = await this.storage.get([
        "userPreferences",
      ]);
      const updatedPreferences = { ...userPreferences, ...preferences };
      await this.storage.set({ userPreferences: updatedPreferences });
      return true;
    } catch (error) {
      console.error("Failed to save user preferences:", error);
      return false;
    }
  }

  async clearData(dataTypes = ["scanHistory", "cache"]) {
    try {
      await this.storage.remove(dataTypes);
      console.log("Data cleared:", dataTypes);
      return true;
    } catch (error) {
      console.error("Failed to clear data:", error);
      return false;
    }
  }

  // Setup analytics for user behavior insights
  setupAnalytics() {
    this.trackUsageEvents();
  }

  trackUsageEvents() {
    // Track scan button clicks
    document.addEventListener("click", async (event) => {
      if (event.target.id === "scan-btn") {
        await this.trackEvent("scan_initiated");
      }

      if (event.target.classList.contains("filter-btn")) {
        await this.trackEvent("filter_used", {
          filter: event.target.dataset.filter,
        });
      }

      if (event.target.classList.contains("highlight-btn")) {
        await this.trackEvent("highlight_used");
      }
    });
  }

  async trackEvent(eventName, data = {}) {
    try {
      const { analytics = {} } = await this.storage.get(["analytics"]);

      if (!analytics.events) analytics.events = {};
      if (!analytics.events[eventName]) analytics.events[eventName] = 0;

      analytics.events[eventName]++;
      analytics.lastEventDate = new Date().toISOString();

      if (Object.keys(data).length > 0) {
        if (!analytics.eventData) analytics.eventData = {};
        if (!analytics.eventData[eventName])
          analytics.eventData[eventName] = [];
        analytics.eventData[eventName].push({
          data,
          timestamp: new Date().toISOString(),
        });
      }

      await this.storage.set({ analytics });
    } catch (error) {
      console.error("Failed to track event:", error);
    }
  }

  async getUsageStats() {
    try {
      const { analytics = {} } = await this.storage.get(["analytics"]);

      return {
        totalEvents: Object.values(analytics.events || {}).reduce(
          (sum, count) => sum + count,
          0
        ),
        eventBreakdown: analytics.events || {},
        lastActivity: analytics.lastEventDate,
        mostUsedFeature: this.getMostUsedFeature(analytics.events || {}),
      };
    } catch (error) {
      console.error("Failed to get usage stats:", error);
      return null;
    }
  }

  getMostUsedFeature(events) {
    const entries = Object.entries(events);
    if (entries.length === 0) return null;

    const [feature, count] = entries.reduce((max, current) =>
      current[1] > max[1] ? current : max
    );

    return { feature, count };
  }
}

// Make globally available
window.DataManager = DataManager;
