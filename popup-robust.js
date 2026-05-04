// Simplified but Robust Accessibility Scanner
class AccessibilityScanner {
  constructor() {
    console.log("Initializing Accex popup...");

    // Basic properties
    this.scanResults = [];
    this.currentFilter = "all";
    this.scanTimeout = null;
    this.isScanning = false;

    // Initialize core functionality
    this.initializeElements();
    this.attachEventListeners();
    this.initializeUI();

    // Listen for scan results
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "results") {
        this.handleScanResults(message);
      }
    });

    console.log("Accex popup ready");
  }

  initializeUI() {
    // Show welcome section by default
    const welcomeSection = document.getElementById("welcome-section");
    if (welcomeSection) {
      welcomeSection.classList.remove("hidden");
    }

    console.log("UI initialized");
  }

  initializeElements() {
    console.log("Initializing elements...");

    // Get main elements
    this.scanButton = document.getElementById("scan-btn");
    this.scanAgainButton = document.getElementById("scan-again-btn");
    this.resultsList = document.getElementById("results-list");
    this.resultsContainer = document.getElementById("results-container");
    this.resultsHeader = document.getElementById("results-header");
    this.retryBtn = document.getElementById("retry-btn");
    this.clearButton = document.getElementById("clear-highlights-btn");
    this.highlightButton = document.getElementById("highlight-issues-btn");
    this.viewSummaryButton = document.getElementById("view-summary-btn");
    this.summaryContainer = document.getElementById("summary-container");
    this.criticalCount = document.getElementById("critical-count");
    this.seriousCount = document.getElementById("serious-count");
    this.moderateCount = document.getElementById("moderate-count");
    this.minorCount = document.getElementById("minor-count");

    // Progress elements
    this.scanStatus = document.getElementById("scan-status");
    this.progressText = document.getElementById("progress-text");
    this.progressFill = document.getElementById("progress-fill");

    // Log found elements for debugging
    console.log("Scan button found:", !!this.scanButton);
    console.log("Results list found:", !!this.resultsList);
  }

  attachEventListeners() {
    console.log("Attaching event listeners...");

    if (this.scanButton) {
      console.log("Adding click listener to scan button");
      this.scanButton.addEventListener("click", (e) => {
        console.log("Scan button clicked!");
        e.preventDefault();
        this.runScan();
      });
    } else {
      console.error("Scan button not found!");
    }

    if (this.scanAgainButton) {
      this.scanAgainButton.addEventListener("click", (e) => {
        console.log("Scan again button clicked!");
        e.preventDefault();
        this.runScan();
      });
    }

    if (this.retryBtn) {
      this.retryBtn.addEventListener("click", () => this.runScan());
    }

    if (this.clearButton) {
      this.clearButton.addEventListener("click", () => this.clearHighlights());
    }

    if (this.highlightButton) {
      this.highlightButton.addEventListener("click", () =>
        this.highlightIssues()
      );
    }

    if (this.viewSummaryButton) {
      this.viewSummaryButton.addEventListener("click", () =>
        this.toggleSummary()
      );
    }

    console.log("Event listeners attached");
  }

  async runScan() {
    console.log("runScan called, isScanning:", this.isScanning);

    if (this.isScanning) {
      console.log("Scan already in progress");
      return;
    }

    this.isScanning = true;
    console.log("Starting new scan...");

    this.showLoading();
    this.startProgressTracking();

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        throw new Error("No active tab found");
      }

      console.log("Injecting content script into tab:", tab.id);

      // Check if we can access the tab
      if (
        !tab.url ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("moz-extension://")
      ) {
        throw new Error(
          "Cannot access this page type. Try scanning a regular website."
        );
      }

      // Inject content script with error handling
      try {
        // Try to ping first to see if content script is already loaded
        let scriptAlreadyLoaded = false;
        try {
          const testPing = await chrome.tabs.sendMessage(tab.id, {
            action: "ping",
          });
          if (testPing && testPing.success) {
            scriptAlreadyLoaded = true;
            console.log("Content script already loaded and responding");
          }
        } catch (e) {
          console.log("Content script not loaded, will inject");
        }

        // Only inject if not already loaded
        if (!scriptAlreadyLoaded) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content-enhanced.js"],
          });
          console.log("Content script injected successfully");

          // Wait longer for initialization after fresh injection
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (injectionError) {
        console.error("Script injection failed:", injectionError);
        throw new Error(
          `Failed to inject content script: ${injectionError.message}`
        );
      }

      this.updateProgress(60, "Running scan...");

      // Test connection with retries
      console.log("Testing connection to content script...");
      let connectionEstablished = false;
      for (let i = 0; i < 3; i++) {
        try {
          const pingResponse = await chrome.tabs.sendMessage(tab.id, {
            action: "ping",
          });
          console.log(`Ping attempt ${i + 1} response:`, pingResponse);
          if (pingResponse && pingResponse.success) {
            connectionEstablished = true;
            console.log("✅ Connection established with content script");
            break;
          }
        } catch (pingError) {
          console.warn(`Ping attempt ${i + 1} failed:`, pingError.message);
          if (i < 2) {
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      if (!connectionEstablished) {
        throw new Error(
          "Could not establish connection with content script after 3 attempts"
        );
      }

      // Send scan message
      console.log("Sending scan message to tab:", tab.id);
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, {
          action: "runScan",
        });
        console.log("Received response:", response);
      } catch (messageError) {
        console.error("Message sending failed:", messageError);
        throw new Error(
          `Failed to communicate with content script: ${messageError.message}`
        );
      }

      this.updateProgress(80, "Processing results...");

      if (!response) {
        throw new Error("No response from content script");
      }

      if (!response.success) {
        throw new Error(response.error || "Scan failed");
      }

      console.log(
        "Scan completed successfully, got",
        response.results?.length || 0,
        "results"
      );

      // Handle results directly
      this.handleScanResults({
        success: true,
        data: response.results || [],
        scanType: response.scanType || "enhanced",
      });
    } catch (error) {
      console.group("🚨 SCAN ERROR DETAILS");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Error name:", error.name);

      // Log additional context
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        console.log("Tab info:", {
          id: tab?.id,
          url: tab?.url,
          title: tab?.title,
          status: tab?.status,
        });
      } catch (tabError) {
        console.error("Could not get tab info:", tabError);
      }
      console.groupEnd();

      this.isScanning = false;
      this.stopProgressTracking();
      this.clearTimeout();

      let errorMessage = "Failed to start scan";
      if (error.message.includes("Could not establish connection")) {
        errorMessage =
          "Unable to connect to page. Please refresh and try again.";
      } else if (error.message.includes("Cannot access")) {
        errorMessage =
          "Cannot scan this page type. Try scanning a regular website.";
      } else if (error.message.includes("Receiving end does not exist")) {
        errorMessage = "Content script not ready. Please try again.";
      } else if (error.message.includes("Cannot access contents")) {
        errorMessage = "Cannot access this page. Try a regular website.";
      } else if (error.message.includes("Failed to inject")) {
        errorMessage = "Could not load scanner. Try refreshing the page.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      this.showError(errorMessage);
    }
  }

  handleScanResults(message) {
    console.log("Received scan results:", message);

    this.stopProgressTracking();
    this.updateProgress(100, "🎉 Scan completed!");
    this.clearTimeout();
    this.isScanning = false;

    if (message.error) {
      this.showError(message.error);
      return;
    }

    const issues = message.data || [];
    this.scanResults = issues;

    setTimeout(() => {
      this.showResults(issues);
    }, 1000);
  }

  showLoading() {
    console.log("Showing loading state");
    this.hideAllSections();

    if (this.scanButton) {
      this.scanButton.disabled = true;
      this.scanButton.innerHTML = '<span class="btn-text">Scanning...</span>';
    }

    if (this.scanStatus) {
      this.scanStatus.classList.remove("hidden");
    }
  }

  showResults(issues) {
    console.log("Showing results for", issues.length, "issues");
    this.hideAllSections();
    this.resetScanButton();
    this.stopProgressTracking();

    if (!this.resultsList) {
      console.error("Results list element not found");
      return;
    }

    this.resultsList.innerHTML = "";

    if (issues.length === 0) {
      this.resultsList.innerHTML =
        '<div class="no-issues">🎉 No accessibility issues found!</div>';
    } else {
      // For now, show simple results without grouping to test basic functionality
      issues.forEach((issue, index) => {
        const div = document.createElement("div");
        div.className = `result-item severity-${issue.impact || "moderate"}`;
        div.innerHTML = `
          <div class="issue-header">
            <h3>${this.escapeHtml(
              issue.description || "Accessibility Issue"
            )}</h3>
            <span class="severity-badge ${issue.impact || "moderate"}">${
          issue.impact?.toUpperCase() || "MODERATE"
        }</span>
          </div>
          <p class="issue-help">${this.escapeHtml(
            issue.help || "No additional information available"
          )}</p>
          <button class="highlight-btn" data-index="${index}">Highlight Issue</button>
        `;
        this.resultsList.appendChild(div);
      });

      // Add click handlers for highlight buttons
      this.resultsList.querySelectorAll(".highlight-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const index = parseInt(e.target.dataset.index);
          this.highlightIssue(index);
        });
      });
    }

    // Show results container
    if (this.resultsContainer) {
      this.resultsContainer.classList.remove("hidden");
    }

    if (this.resultsHeader) {
      this.resultsHeader.classList.remove("hidden");
    }

    // Show footer buttons
    if (this.clearButton) {
      this.clearButton.classList.remove("hidden");
    }

    if (this.highlightButton) {
      this.highlightButton.classList.remove("hidden");
    }

    if (this.viewSummaryButton) {
      this.viewSummaryButton.classList.remove("hidden");
    }

    // Show footer
    const footer = document.querySelector(".app-footer");
    if (footer) {
      footer.classList.remove("hidden");
    }

    // Show "Scan Again" button instead of "Scan Page"
    if (this.scanButton && this.scanAgainButton) {
      this.scanButton.classList.add("hidden");
      this.scanAgainButton.classList.remove("hidden");
    }

    this.updateSummary(issues);
  }

  async highlightIssue(index) {
    try {
      const issue = this.scanResults[index];
      if (!issue) return;

      console.log("Highlighting issue:", issue);

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab) {
        await chrome.tabs.sendMessage(tab.id, {
          action: "highlightViolation",
          violationData: issue,
        });
      }
    } catch (error) {
      console.error("Failed to highlight issue:", error);
    }
  }

  async highlightIssues() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab) {
        await chrome.tabs.sendMessage(tab.id, {
          type: "highlight",
          issues: this.scanResults,
        });

        // Update button text to indicate navigator is active
        if (this.highlightButton) {
          this.highlightButton.innerHTML =
            '<span class="btn-icon">🧭</span><span class="btn-text">Navigator Active</span>';
        }
      }
    } catch (error) {
      console.error("Failed to show navigator:", error);
    }
  }

  async clearHighlights() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab) {
        await chrome.tabs.sendMessage(tab.id, {
          type: "clearHighlights",
        });

        // Reset button text
        if (this.highlightButton) {
          this.highlightButton.innerHTML =
            '<span class="btn-icon">🧭</span><span class="btn-text">Navigator</span>';
        }
      }
    } catch (error) {
      console.error("Failed to hide navigator:", error);
    }
  }

  showError(message) {
    console.log("Showing error:", message);
    this.hideAllSections();
    this.resetScanButton();
    this.stopProgressTracking();
    this.clearTimeout();
    this.isScanning = false;

    const errorSection = document.getElementById("error");
    const errorMessage = document.getElementById("error-message");

    if (errorMessage) {
      errorMessage.textContent = message;
    }

    if (errorSection) {
      errorSection.classList.remove("hidden");
    }
  }

  hideAllSections() {
    const sections = [
      "welcome-section",
      "results-container",
      "loading",
      "error",
      "scan-status",
    ];

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.add("hidden");
      }
    });
  }

  resetScanButton() {
    if (this.scanButton) {
      this.scanButton.disabled = false;
      this.scanButton.innerHTML = '<span class="btn-text">Scan Page</span>';
    }
  }

  startProgressTracking() {
    this.updateProgress(10, "Initializing scan...");
  }

  stopProgressTracking() {
    // Progress tracking complete
  }

  updateProgress(percent, message) {
    if (this.progressFill) {
      this.progressFill.style.width = `${percent}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = message;
    }
  }

  clearTimeout() {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  toggleSummary() {
    if (this.summaryContainer) {
      this.summaryContainer.classList.toggle("hidden");
    }
  }

  updateSummary(issues) {
    const counts = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
    };

    issues.forEach((issue) => {
      const impact = issue.impact || "moderate";
      if (counts[impact] !== undefined) {
        counts[impact]++;
      }
    });

    // Update count displays
    if (this.criticalCount) this.criticalCount.textContent = counts.critical;
    if (this.seriousCount) this.seriousCount.textContent = counts.serious;
    if (this.moderateCount) this.moderateCount.textContent = counts.moderate;
    if (this.minorCount) this.minorCount.textContent = counts.minor;

    // Show summary container
    if (this.summaryContainer) {
      this.summaryContainer.classList.remove("hidden");
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, initializing scanner");
    new AccessibilityScanner();
  });
} else {
  console.log("DOM already ready, initializing scanner");
  new AccessibilityScanner();
}
