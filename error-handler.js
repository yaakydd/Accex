// Enhanced Error Handler for Accex Extension
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.setupGlobalErrorHandling();
  }

  setupGlobalErrorHandling() {
    // Catch unhandled errors
    window.addEventListener("error", (event) => {
      this.logError("JavaScript Error", event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.logError("Unhandled Promise Rejection", event.reason);
      event.preventDefault(); // Prevent console spam
    });
  }

  logError(type, error, context = {}) {
    const errorEntry = {
      type,
      message: error?.message || String(error),
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.errorLog.push(errorEntry);

    // Limit log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Send to background script for centralized logging
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime
        .sendMessage({
          type: "error-log",
          error: errorEntry,
        })
        .catch(() => {}); // Ignore if popup is closed
    }

    console.error(`[Accex ${type}]`, error);
  }

  async handleScanError(error) {
    const errorType = this.categorizeError(error);

    switch (errorType) {
      case "NETWORK":
        return this.handleNetworkError(error);
      case "PERMISSION":
        return this.handlePermissionError(error);
      case "TIMEOUT":
        return this.handleTimeoutError(error);
      case "MEMORY":
        return this.handleMemoryError(error);
      default:
        return this.handleGenericError(error);
    }
  }

  categorizeError(error) {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return "NETWORK";
    }
    if (message.includes("permission") || message.includes("denied")) {
      return "PERMISSION";
    }
    if (message.includes("timeout") || message.includes("timed out")) {
      return "TIMEOUT";
    }
    if (message.includes("memory") || message.includes("maximum call stack")) {
      return "MEMORY";
    }

    return "GENERIC";
  }

  async handleNetworkError(error) {
    this.logError("Network Error", error);

    return {
      retry: false,
      message:
        "Network connectivity issues. Please check your connection and try again.",
      action: "reload",
    };
  }

  async handlePermissionError(error) {
    this.logError("Permission Error", error);

    return {
      retry: false,
      message:
        "This page has security restrictions that prevent accessibility scanning. Try scanning a different page.",
      action: "navigate",
      details:
        "Chrome extensions cannot scan certain pages like chrome:// URLs, browser settings, or the Chrome Web Store.",
    };
  }

  handleTimeoutError(error) {
    this.logError("Timeout Error", error);

    return {
      retry: true,
      message:
        "Scan took too long. The page might be very large or complex. Trying with reduced scope...",
      action: "reduce-scope",
    };
  }

  handleMemoryError(error) {
    this.logError("Memory Error", error);

    return {
      retry: true,
      message:
        "Memory issue detected. Clearing cache and retrying with optimized settings...",
      action: "optimize-memory",
    };
  }

  handleGenericError(error) {
    this.logError("Generic Error", error);

    return {
      retry: false,
      message: `Scan failed: ${error.message}. Please try refreshing the page and scanning again.`,
      action: "refresh",
    };
  }

  exportErrorLog() {
    const logData = {
      errors: this.errorLog,
      exportDate: new Date().toISOString(),
      extension: "Accex Accessibility Scanner",
      version: chrome.runtime.getManifest()?.version || "2.0.0",
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accex-error-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      recent: this.errorLog.slice(-10),
    };

    this.errorLog.forEach((error) => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }

  clearErrorLog() {
    this.errorLog = [];
    console.log("Accex error log cleared");
  }
}

// Make globally available
window.ErrorHandler = ErrorHandler;
