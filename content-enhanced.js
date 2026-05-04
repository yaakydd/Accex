// Enhanced content script for accessibility highlighting and scanning
if (typeof window.AccessibilityHighlighter === "undefined") {
  class AccessibilityHighlighter {
    constructor() {
      this.highlightedElements = new Set();
      this.overlayContainer = null;
      this.currentIssues = [];
      this.isInitialized = false;
      this.currentIssueIndex = 0;
      this.navigator = null;
      this.ariaLiveRegion = null;
      this.tempHighlight = null;
      this.tempHighlightTimeout = null;
      this.init();
    }

    init() {
      console.log("🚀 Accessibility Highlighter initializing...");
      console.log("📍 Extension enhanced with floating navigator system");

      try {
        // Create overlay container for highlights
        this.createOverlayContainer();

        // Create ARIA live region
        this.createAriaLiveRegion();

        // Add floating navigator styles
        this.addNavigatorStyles();

        // Add highlighting styles
        this.addHighlightStyles();

        // Mark as initialized
        this.isInitialized = true;
        console.log("✅ Accessibility Highlighter initialized successfully");

        // Listen for messages from popup
        chrome.runtime.onMessage.addListener(
          (message, sender, sendResponse) => {
            console.log("Content script received message:", message);

            if (!this.isInitialized) {
              sendResponse({
                success: false,
                error: "Content script not initialized",
                results: [],
              });
              return;
            }

            // Handle scan request
            if (message.action === "runScan" || message.type === "scan") {
              console.log("Starting scan from message handler");

              this.runScan()
                .then((result) => {
                  console.log("Scan completed, sending response:", result);
                  sendResponse(result);
                })
                .catch((error) => {
                  console.error("Scan failed:", error);
                  sendResponse({
                    success: false,
                    error: error.message || "Scan failed",
                    results: [],
                  });
                });
              return true; // Keep message channel open
            }

            // Handle other message types
            switch (message.type || message.action) {
              case "ping":
                console.log("Ping received, responding with pong");
                sendResponse({
                  success: true,
                  message: "pong",
                  initialized: this.isInitialized,
                });
                break;
              case "highlight":
                console.log("Highlighting issues and showing navigator");
                this.highlightIssues(message.issues);
                this.showNavigator(message.issues);
                sendResponse({ success: true });
                break;
              case "highlightViolation":
                this.highlightSingleIssue(message.violationData);
                sendResponse({ success: true });
                break;
              case "clearHighlights":
                console.log("Clearing highlights and hiding navigator");
                this.clearHighlights();
                this.hideNavigator();
                sendResponse({ success: true });
                break;
              case "getHighlightedCount":
                sendResponse({ count: this.currentIssues.length });
                break;
              case "navigateIssue":
                this.navigateToIssue(message.direction);
                sendResponse({ success: true });
                break;
              default:
                console.warn(
                  "Unknown message type:",
                  message.type || message.action
                );
                sendResponse({ success: false, error: "Unknown message type" });
            }
          }
        );
      } catch (error) {
        console.error("Failed to initialize content script:", error);
        this.isInitialized = false;
      }
    }

    createOverlayContainer() {
      if (this.overlayContainer) {
        console.log("Overlay container already exists");
        return;
      }

      console.log("Creating overlay container for highlights");
      this.overlayContainer = document.createElement("div");
      this.overlayContainer.id = "accex-overlay-container";
      this.overlayContainer.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        pointer-events: none !important;
        z-index: 2147483646 !important;
        overflow: visible !important;
      `;
      document.body.appendChild(this.overlayContainer);
      console.log("✅ Overlay container created and added to body");
    }

    createAriaLiveRegion() {
      if (this.ariaLiveRegion) return;

      this.ariaLiveRegion = document.createElement("div");
      this.ariaLiveRegion.setAttribute("aria-live", "polite");
      this.ariaLiveRegion.setAttribute("aria-atomic", "true");
      this.ariaLiveRegion.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(this.ariaLiveRegion);
    }

    addNavigatorStyles() {
      if (document.getElementById("accex-navigator-styles")) return;

      const styles = document.createElement("style");
      styles.id = "accex-navigator-styles";
      styles.textContent = `
        .accex-navigator {
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
          background: #1e3a8a !important;
          color: white !important;
          border-radius: 12px !important;
          padding: 16px !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          font-size: 14px !important;
          box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important;
          z-index: 1000000 !important;
          min-width: 280px !important;
          border: 2px solid #3b82f6 !important;
          transition: all 0.3s ease !important;
        }
        
        .accex-navigator:focus-within {
          outline: 3px solid #fbbf24 !important;
          outline-offset: 2px !important;
        }
        
        .accex-navigator-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 12px !important;
          padding-bottom: 8px !important;
          border-bottom: 1px solid #3b82f6 !important;
        }
        
        .accex-navigator-title {
          font-weight: bold !important;
          color: #fbbf24 !important;
        }
        
        .accex-navigator-close {
          background: transparent !important;
          border: none !important;
          color: #fbbf24 !important;
          font-size: 16px !important;
          cursor: pointer !important;
          padding: 4px !important;
          border-radius: 4px !important;
        }
        
        .accex-navigator-close:hover,
        .accex-navigator-close:focus {
          background: rgba(251, 191, 36, 0.2) !important;
          outline: 2px solid #fbbf24 !important;
        }
        
        .accex-navigator-counter {
          text-align: center !important;
          margin-bottom: 12px !important;
          font-size: 13px !important;
          color: #cbd5e1 !important;
        }
        
        .accex-navigator-current {
          color: #fbbf24 !important;
          font-weight: bold !important;
        }
        
        .accex-navigator-controls {
          display: flex !important;
          gap: 8px !important;
          margin-bottom: 12px !important;
        }
        
        .accex-navigator-btn {
          flex: 1 !important;
          background: #3b82f6 !important;
          border: none !important;
          color: white !important;
          padding: 8px 12px !important;
          border-radius: 6px !important;
          cursor: pointer !important;
          font-size: 12px !important;
          transition: all 0.2s ease !important;
        }
        
        .accex-navigator-btn:hover {
          background: #2563eb !important;
        }
        
        .accex-navigator-btn:focus {
          outline: 2px solid #fbbf24 !important;
          outline-offset: 2px !important;
        }
        
        .accex-navigator-btn:disabled {
          background: #64748b !important;
          cursor: not-allowed !important;
          opacity: 0.6 !important;
        }
        
        .accex-navigator-issue {
          background: rgba(59, 130, 246, 0.1) !important;
          border: 1px solid #3b82f6 !important;
          border-radius: 8px !important;
          padding: 12px !important;
          margin-bottom: 8px !important;
        }
        
        .accex-navigator-issue-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 6px !important;
        }
        
        .accex-navigator-severity {
          padding: 2px 8px !important;
          border-radius: 4px !important;
          font-size: 11px !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
        }
        
        .accex-navigator-severity.critical {
          background: #dc2626 !important;
          color: white !important;
        }
        
        .accex-navigator-severity.serious {
          background: #ea580c !important;
          color: white !important;
        }
        
        .accex-navigator-severity.moderate {
          background: #d97706 !important;
          color: white !important;
        }
        
        .accex-navigator-severity.minor {
          background: #0284c7 !important;
          color: white !important;
        }
        
        .accex-navigator-issue-id {
          font-family: monospace !important;
          font-size: 11px !important;
          color: #94a3b8 !important;
        }
        
        .accex-navigator-description {
          font-size: 13px !important;
          line-height: 1.4 !important;
          margin-bottom: 8px !important;
        }
        
        .accex-navigator-element {
          font-family: monospace !important;
          font-size: 11px !important;
          color: #fbbf24 !important;
          background: rgba(251, 191, 36, 0.1) !important;
          padding: 4px 6px !important;
          border-radius: 4px !important;
          margin-bottom: 8px !important;
        }
        
        .accex-navigator-actions {
          display: flex !important;
          gap: 6px !important;
        }
        
        .accex-navigator-action {
          background: #fbbf24 !important;
          color: #1e3a8a !important;
          border: none !important;
          padding: 6px 10px !important;
          border-radius: 4px !important;
          font-size: 11px !important;
          cursor: pointer !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
        }
        
        .accex-navigator-action:hover,
        .accex-navigator-action:focus {
          background: #f59e0b !important;
          outline: 2px solid #fbbf24 !important;
          outline-offset: 1px !important;
        }
        
        .accex-temp-highlight {
          outline: 4px solid #fbbf24 !important;
          outline-offset: 2px !important;
          background: rgba(251, 191, 36, 0.2) !important;
          animation: accex-pulse 3s ease-in-out !important;
        }
        
        @keyframes accex-pulse {
          0%, 100% { 
            outline-width: 4px !important;
            background: rgba(251, 191, 36, 0.2) !important;
          }
          50% { 
            outline-width: 6px !important;
            background: rgba(251, 191, 36, 0.4) !important;
          }
        }
        
        .accex-keyboard-hint {
          font-size: 11px !important;
          color: #94a3b8 !important;
          text-align: center !important;
          margin-top: 8px !important;
          padding-top: 8px !important;
          border-top: 1px solid #3b82f6 !important;
        }
      `;
      document.head.appendChild(styles);
    }

    async runScan() {
      console.log("Starting accessibility scan...");

      try {
        // First ensure document is ready
        if (document.readyState === "loading") {
          console.log("Waiting for DOM to load...");
          await new Promise((resolve) => {
            document.addEventListener("DOMContentLoaded", resolve, {
              once: true,
            });
          });
        }

        console.log("Document ready, starting scan...");

        // Always run basic accessibility checks as they're more reliable
        const basicResults = await this.runBasicAccessibilityChecks();
        console.log(
          "Basic scan completed:",
          basicResults.length,
          "issues found"
        );
        this.currentIssues = basicResults;

        // Generate console report
        this.generateConsoleReport(basicResults);

        // Announce results via ARIA live region
        this.announceResults(basicResults);

        return {
          success: true,
          results: basicResults,
          scanType: "basic",
        };
      } catch (error) {
        console.error("Scan failed completely:", error);

        // Return at least an empty result rather than failing
        return {
          success: true,
          results: [],
          scanType: "basic",
          error: error.message,
        };
      }
    }

    async loadAxeAndScan() {
      return new Promise((resolve, reject) => {
        // Try to load axe-core
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("axe.min.js");
        script.onload = async () => {
          try {
            console.log("Axe-core loaded successfully");

            // Configure axe options
            const options = {
              rules: {
                "color-contrast": { enabled: true },
                "image-alt": { enabled: true },
                label: { enabled: true },
                "link-name": { enabled: true },
                "button-name": { enabled: true },
                "heading-order": { enabled: true },
                "landmark-one-main": { enabled: true },
                "page-has-heading-one": { enabled: true },
              },
            };

            // Run axe scan
            window.axe.run(document, options, (err, results) => {
              if (err) {
                reject(err);
                return;
              }

              const formattedResults = results.violations.map((violation) => ({
                id: violation.id,
                impact: violation.impact || "minor",
                description: violation.description,
                help: violation.help,
                helpUrl: violation.helpUrl,
                nodes: violation.nodes.map((node) => ({
                  html: node.html,
                  target: node.target,
                  element: document.querySelector(node.target[0]),
                })),
              }));

              resolve(formattedResults);
            });
          } catch (error) {
            reject(error);
          }
        };
        script.onerror = () => reject(new Error("Failed to load axe-core"));
        document.head.appendChild(script);

        // Timeout after 10 seconds
        setTimeout(() => reject(new Error("Axe loading timeout")), 10000);
      });
    }

    async runBasicAccessibilityChecks() {
      const issues = [];

      // Check for images without alt text
      const images = document.querySelectorAll("img");
      images.forEach((img, index) => {
        if (!img.alt || img.alt.trim() === "") {
          issues.push({
            id: "image-alt",
            impact: "serious",
            description: "Image missing alternative text",
            help: "Add descriptive alt text to images",
            helpUrl:
              "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
            nodes: [
              {
                html: img.outerHTML.substring(0, 100) + "...",
                target: [`img:nth-child(${index + 1})`],
                element: img,
              },
            ],
          });
        }
      });

      // Check for form inputs without labels
      const inputs = document.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="password"], textarea, select'
      );
      inputs.forEach((input, index) => {
        const hasLabel = input.labels && input.labels.length > 0;
        const hasAriaLabel = input.hasAttribute("aria-label");
        const hasAriaLabelledby = input.hasAttribute("aria-labelledby");

        if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby) {
          issues.push({
            id: "label",
            impact: "critical",
            description: "Form field missing accessible label",
            help: "Add a label or aria-label to form fields",
            helpUrl:
              "https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html",
            nodes: [
              {
                html: input.outerHTML.substring(0, 100) + "...",
                target: [
                  input.tagName.toLowerCase() + `:nth-of-type(${index + 1})`,
                ],
                element: input,
              },
            ],
          });
        }
      });

      // Check for buttons without accessible names
      const buttons = document.querySelectorAll("button");
      buttons.forEach((button, index) => {
        const hasText = button.textContent.trim().length > 0;
        const hasAriaLabel = button.hasAttribute("aria-label");
        const hasAriaLabelledby = button.hasAttribute("aria-labelledby");

        if (!hasText && !hasAriaLabel && !hasAriaLabelledby) {
          issues.push({
            id: "button-name",
            impact: "serious",
            description: "Button missing accessible name",
            help: "Add text content or aria-label to buttons",
            helpUrl:
              "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
            nodes: [
              {
                html: button.outerHTML.substring(0, 100) + "...",
                target: [`button:nth-of-type(${index + 1})`],
                element: button,
              },
            ],
          });
        }
      });

      // Check for missing page title
      const title = document.querySelector("title");
      if (!title || title.textContent.trim() === "") {
        issues.push({
          id: "document-title",
          impact: "serious",
          description: "Page missing title",
          help: "Add a descriptive title to the page",
          helpUrl:
            "https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html",
          nodes: [
            {
              html: "<title>",
              target: ["title"],
              element: title || document.head,
            },
          ],
        });
      }

      // Check heading structure
      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      if (headings.length === 0) {
        issues.push({
          id: "page-has-heading-one",
          impact: "moderate",
          description: "Page missing headings for structure",
          help: "Add heading elements to organize content",
          helpUrl:
            "https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html",
          nodes: [
            {
              html: document.body.outerHTML.substring(0, 100) + "...",
              target: ["body"],
              element: document.body,
            },
          ],
        });
      }

      // Check for links without accessible names
      const links = document.querySelectorAll("a[href]");
      links.forEach((link, index) => {
        const hasText = link.textContent.trim().length > 0;
        const hasAriaLabel = link.hasAttribute("aria-label");
        const hasAriaLabelledby = link.hasAttribute("aria-labelledby");

        if (!hasText && !hasAriaLabel && !hasAriaLabelledby) {
          issues.push({
            id: "link-name",
            impact: "serious",
            description: "Link missing accessible name",
            help: "Add descriptive text or aria-label to links",
            helpUrl:
              "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
            nodes: [
              {
                html: link.outerHTML.substring(0, 100) + "...",
                target: [`a:nth-of-type(${index + 1})`],
                element: link,
              },
            ],
          });
        }
      });

      return issues;
    }

    highlightIssues(issues = null) {
      // Use provided issues or current scan results
      const issuesToHighlight = issues || this.currentIssues;

      if (!issuesToHighlight || issuesToHighlight.length === 0) {
        console.log("No issues to highlight");
        return;
      }

      console.log(
        "Highlighting",
        issuesToHighlight.length,
        "accessibility issues"
      );

      // Use the new multiple issues highlighting method
      this.highlightMultipleIssues(issuesToHighlight);
    }

    highlightSingleIssue(issue) {
      if (!issue || !issue.nodes) {
        console.log("No issue or nodes to highlight");
        return;
      }

      // Clear existing highlights first
      this.clearHighlights();

      console.log(
        "Highlighting single issue:",
        issue.id,
        "with",
        issue.nodes.length,
        "nodes"
      );

      issue.nodes.forEach((node, nodeIndex) => {
        if (!node.element) {
          console.warn("No element found for node", nodeIndex);
          return;
        }

        const element = node.element;

        // Apply direct highlighting to the element
        this.highlightElement(element, issue);

        console.log(
          `Highlighted node ${nodeIndex + 1}/${issue.nodes.length} for issue ${
            issue.id
          }`
        );
      });
    }

    highlightMultipleIssues(issues) {
      if (!issues || !Array.isArray(issues)) {
        console.log("No issues to highlight");
        return;
      }

      // Clear existing highlights first
      this.clearHighlights();

      console.log("Highlighting multiple issues:", issues.length);

      issues.forEach((issue, issueIndex) => {
        if (!issue.nodes) return;

        issue.nodes.forEach((node, nodeIndex) => {
          if (!node.element) return;

          const element = node.element;

          // Apply highlighting to the element
          this.highlightElement(element, issue);

          console.log(
            `Highlighted issue ${issueIndex + 1}/${issues.length}, node ${
              nodeIndex + 1
            }/${issue.nodes.length}`
          );
        });
      });

      console.log(
        `Total elements highlighted: ${this.highlightedElements.size}`
      );

      // Test: Apply a visible highlight to the first element found for debugging
      if (this.highlightedElements.size > 0) {
        const firstElement = Array.from(this.highlightedElements)[0];
        console.log("🔍 First highlighted element test:", firstElement);

        // Add a super visible test highlight
        firstElement.style.setProperty(
          "border",
          "5px dashed #ff0000",
          "important"
        );
        firstElement.style.setProperty(
          "background-color",
          "rgba(255,0,0,0.3)",
          "important"
        );

        setTimeout(() => {
          firstElement.style.removeProperty("border");
          firstElement.style.removeProperty("background-color");
        }, 3000);
      }

      // EMERGENCY TEST: Highlight the first 3 images on the page regardless
      setTimeout(() => {
        console.log(
          "🚨 EMERGENCY HIGHLIGHTING TEST - highlighting first 3 images"
        );
        const testImages = document.querySelectorAll("img");
        for (let i = 0; i < Math.min(3, testImages.length); i++) {
          const img = testImages[i];

          // Create emergency overlay
          const emergencyOverlay = document.createElement("div");
          emergencyOverlay.style.cssText = `
            position: fixed !important;
            top: ${img.getBoundingClientRect().top - 10}px !important;
            left: ${img.getBoundingClientRect().left - 10}px !important;
            width: ${img.getBoundingClientRect().width + 20}px !important;
            height: ${img.getBoundingClientRect().height + 20}px !important;
            border: 8px solid #ff0000 !important;
            background: rgba(255, 0, 0, 0.3) !important;
            pointer-events: none !important;
            z-index: 2147483647 !important;
            animation: emergency-flash 1s infinite !important;
          `;

          emergencyOverlay.innerHTML = `
            <div style="
              background: #ff0000 !important;
              color: white !important;
              padding: 4px 8px !important;
              font-size: 12px !important;
              font-weight: bold !important;
              position: absolute !important;
              top: -30px !important;
              left: 0 !important;
            ">TEST ${i + 1}</div>
          `;

          document.body.appendChild(emergencyOverlay);

          console.log(`🎯 Emergency highlighted image ${i + 1}:`, img);

          // Remove after 5 seconds
          setTimeout(() => {
            if (emergencyOverlay.parentNode) {
              emergencyOverlay.remove();
            }
          }, 5000);
        }

        // Add emergency animation
        if (!document.getElementById("emergency-flash-style")) {
          const flashStyle = document.createElement("style");
          flashStyle.id = "emergency-flash-style";
          flashStyle.textContent = `
            @keyframes emergency-flash {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `;
          document.head.appendChild(flashStyle);
        }
      }, 1000);
    }

    highlightElement(element, issue) {
      if (!element) {
        console.warn("Cannot highlight - element is null or undefined");
        return;
      }

      console.log("🎯 HIGHLIGHTING ELEMENT:", element);

      // Get element's position and size
      const rect = element.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      // Create an overlay highlight instead of modifying the element directly
      const overlay = document.createElement("div");
      overlay.className = "accex-highlight-overlay";

      // Get severity colors
      const colors = {
        critical: "#ff0000",
        serious: "#ff8c00",
        moderate: "#ffd700",
        minor: "#87ceeb",
      };

      const color = colors[issue.impact] || colors.minor;

      // Position overlay exactly over the element
      overlay.style.cssText = `
        position: absolute !important;
        top: ${rect.top + scrollTop - 5}px !important;
        left: ${rect.left + scrollLeft - 5}px !important;
        width: ${rect.width + 10}px !important;
        height: ${rect.height + 10}px !important;
        border: 4px solid ${color} !important;
        background: rgba(${
          color === "#ff0000"
            ? "255,0,0"
            : color === "#ff8c00"
            ? "255,140,0"
            : color === "#ffd700"
            ? "255,215,0"
            : "135,206,235"
        }, 0.2) !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        border-radius: 4px !important;
        box-shadow: 0 0 0 2px white, 0 0 10px ${color} !important;
        animation: accex-highlight-pulse 2s infinite !important;
      `;

      // Add pulse animation
      if (!document.getElementById("accex-highlight-animation")) {
        const animationStyle = document.createElement("style");
        animationStyle.id = "accex-highlight-animation";
        animationStyle.textContent = `
          @keyframes accex-highlight-pulse {
            0%, 100% { 
              opacity: 0.8;
              transform: scale(1);
            }
            50% { 
              opacity: 1;
              transform: scale(1.02);
            }
          }
        `;
        document.head.appendChild(animationStyle);
      }

      // Add data attributes to overlay for tracking
      overlay.setAttribute("data-a11y-issue", issue.id);
      overlay.setAttribute("data-a11y-impact", issue.impact);
      overlay.setAttribute("data-a11y-element-tag", element.tagName);

      // Add tooltip to overlay
      overlay.title = `${issue.impact.toUpperCase()}: ${issue.description}`;

      // Append to overlay container
      if (!this.overlayContainer) {
        this.createOverlayContainer();
      }
      this.overlayContainer.appendChild(overlay);

      // Also add minimal styling to the original element as backup
      element.style.setProperty("outline", `2px dashed ${color}`, "important");
      element.setAttribute("data-a11y-highlighted", "true");

      // Add to tracked elements (track both element and overlay)
      this.highlightedElements.add(element);
      this.highlightedElements.add(overlay);

      // Scroll element into view
      element.scrollIntoView({ behavior: "smooth", block: "center" });

      console.log(`✅ OVERLAY HIGHLIGHT CREATED:`, {
        element: element,
        overlay: overlay,
        position: { top: rect.top + scrollTop, left: rect.left + scrollLeft },
        size: { width: rect.width, height: rect.height },
        color: color,
        severity: issue.impact,
      });
    }

    getSeverityClass(impact) {
      const impactMap = {
        critical: "a11y-highlight-critical",
        serious: "a11y-highlight-serious",
        moderate: "a11y-highlight-moderate",
        minor: "a11y-highlight-minor",
      };
      return impactMap[impact] || "a11y-highlight-minor";
    }

    generateFixRecommendation(issue) {
      const fixes = {
        "color-contrast":
          "Increase color contrast ratio to at least 4.5:1 for normal text or 3:1 for large text.",
        "image-alt":
          'Add meaningful alt text: <img src="..." alt="Description of image content">',
        label:
          'Associate form controls with labels: <label for="input-id">Label text</label>',
        "heading-order":
          "Use heading tags in sequential order (h1, h2, h3, etc.)",
        "link-name":
          "Provide descriptive link text or add aria-label attribute.",
        "button-name": "Add descriptive text or aria-label to button elements.",
        landmark:
          "Add ARIA landmarks: <main>, <nav>, <aside>, or role attributes.",
        list: "Use proper list markup: <ul><li>Item</li></ul>",
        region: "Add aria-label or aria-labelledby to define regions.",
        bypass: "Add skip navigation links for keyboard users.",
      };

      // Try to match issue ID to known fix patterns
      const issueId = issue.id.toLowerCase();
      for (const [key, fix] of Object.entries(fixes)) {
        if (issueId.includes(key)) {
          return fix;
        }
      }

      return issue.help || "Review WCAG guidelines for this issue type.";
    }

    attachTooltip(element, issue) {
      let tooltip = null;

      const showTooltip = (e) => {
        // Remove any existing tooltip
        this.hideTooltip();

        tooltip = this.createTooltip(element, issue);
        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = rect.top - tooltipRect.height - 10;
        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

        // Adjust if tooltip goes off screen
        if (top < 10) {
          top = rect.bottom + 10;
        }
        if (left < 10) {
          left = 10;
        }
        if (left + tooltipRect.width > window.innerWidth - 10) {
          left = window.innerWidth - tooltipRect.width - 10;
        }

        tooltip.style.top = top + "px";
        tooltip.style.left = left + "px";
        tooltip.classList.add("visible");
      };

      const hideTooltip = () => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      };

      // Add event listeners
      element.addEventListener("mouseenter", showTooltip);
      element.addEventListener("mouseleave", hideTooltip);
      element.addEventListener("focus", showTooltip);
      element.addEventListener("blur", hideTooltip);

      // Store cleanup function
      element._a11yTooltipCleanup = () => {
        element.removeEventListener("mouseenter", showTooltip);
        element.removeEventListener("mouseleave", hideTooltip);
        element.removeEventListener("focus", showTooltip);
        element.removeEventListener("blur", hideTooltip);
        hideTooltip();
      };
    }

    createTooltip(element, issue) {
      const tooltip = document.createElement("div");
      tooltip.className = "a11y-tooltip";

      const fixRecommendation =
        element.getAttribute("data-a11y-fix") || "No specific fix available";
      const codeExample = this.generateCodeExample(issue);

      tooltip.innerHTML = `
        <div class="a11y-tooltip-header">
          <span class="a11y-issue-id">${issue.id}</span>
          <span class="a11y-issue-impact ${
            issue.impact
          }">${issue.impact.toUpperCase()}</span>
        </div>
        <div class="a11y-tooltip-description">
          <strong>${issue.description || "Accessibility Issue"}</strong>
        </div>
        <div class="a11y-tooltip-help">
          ${issue.help || "Review accessibility guidelines for this element."}
        </div>
        <div class="a11y-tooltip-help">
          <strong>Fix:</strong> ${fixRecommendation}
        </div>
        ${
          codeExample
            ? `<div class="a11y-tooltip-code">${codeExample}</div>`
            : ""
        }
      `;

      return tooltip;
    }

    generateCodeExample(issue) {
      const examples = {
        "color-contrast":
          "color: #333; background: #fff; /* Ensure 4.5:1+ ratio */",
        "image-alt": '<img src="image.jpg" alt="Descriptive alt text">',
        label:
          '<label for="email">Email Address</label>\n<input type="email" id="email">',
        "heading-order":
          "<h1>Page Title</h1>\n<h2>Section</h2>\n<h3>Subsection</h3>",
        "link-name":
          '<a href="/page" aria-label="Read more about topic">Learn more</a>',
        "button-name": '<button aria-label="Close dialog">×</button>',
        landmark:
          '<main role="main">\n  <nav aria-label="Primary navigation">\n  <aside role="complementary">',
        list: "<ul>\n  <li>List item 1</li>\n  <li>List item 2</li>\n</ul>",
      };

      const issueId = issue.id.toLowerCase();
      for (const [key, example] of Object.entries(examples)) {
        if (issueId.includes(key)) {
          return example;
        }
      }

      return null;
    }

    hideTooltip() {
      const existingTooltip = document.querySelector(".a11y-tooltip");
      if (existingTooltip) {
        existingTooltip.remove();
      }
    }

    generateConsoleReport(issues) {
      console.groupCollapsed(
        `🔍 Accessibility Scan Results: ${issues.length} issues found`
      );

      const severityGroups = {
        critical: [],
        serious: [],
        moderate: [],
        minor: [],
      };

      issues.forEach((issue) => {
        const severity = issue.impact || "minor";
        if (severityGroups[severity]) {
          severityGroups[severity].push(issue);
        }
      });

      Object.entries(severityGroups).forEach(([severity, severityIssues]) => {
        if (severityIssues.length === 0) return;

        const colors = {
          critical: "#dc2626",
          serious: "#ea580c",
          moderate: "#d97706",
          minor: "#0284c7",
        };

        console.groupCollapsed(
          `%c${severity.toUpperCase()}: ${severityIssues.length} issues`,
          `color: ${colors[severity]}; font-weight: bold;`
        );

        severityIssues.forEach((issue, index) => {
          console.group(`${index + 1}. ${issue.id}`);
          console.log(
            `%cDescription: ${issue.description}`,
            "font-weight: bold;"
          );
          console.log(`%cHelp: ${issue.help}`, "color: #6b7280;");

          if (issue.nodes && issue.nodes.length > 0) {
            console.log(
              `%cElements (${issue.nodes.length}):`,
              "color: #059669;"
            );
            issue.nodes.forEach((node, nodeIndex) => {
              if (node.element) {
                console.log(`  ${nodeIndex + 1}.`, node.element);
                if (node.html) {
                  console.log(
                    `     HTML: ${node.html.substring(0, 100)}${
                      node.html.length > 100 ? "..." : ""
                    }`
                  );
                }
              }
            });
          }

          const fix = this.generateFixRecommendation(issue);
          console.log(
            `%cRecommended Fix: ${fix}`,
            "color: #7c3aed; font-style: italic;"
          );
          console.groupEnd();
        });

        console.groupEnd();
      });

      console.groupEnd();
    }

    announceResults(issues) {
      if (!this.ariaLiveRegion) return;

      const total = issues.length;
      const critical = issues.filter((i) => i.impact === "critical").length;
      const serious = issues.filter((i) => i.impact === "serious").length;

      let announcement = `Accessibility scan complete. Found ${total} issue${
        total !== 1 ? "s" : ""
      }`;
      if (critical > 0) {
        announcement += `, including ${critical} critical issue${
          critical !== 1 ? "s" : ""
        }`;
      }
      if (serious > 0) {
        announcement += `, ${serious} serious issue${serious !== 1 ? "s" : ""}`;
      }
      announcement += ". Use the navigator to review issues.";

      this.ariaLiveRegion.textContent = announcement;
    }

    showNavigator(issues) {
      this.currentIssues = issues || this.currentIssues;
      this.currentIssueIndex = 0;

      if (this.navigator) {
        this.navigator.remove();
      }

      if (this.currentIssues.length === 0) {
        console.log("No issues to display in navigator");
        return;
      }

      this.navigator = document.createElement("div");
      this.navigator.className = "accex-navigator";
      this.navigator.setAttribute("role", "dialog");
      this.navigator.setAttribute(
        "aria-label",
        "Accessibility Issues Navigator"
      );
      this.navigator.setAttribute("tabindex", "-1");

      this.updateNavigatorContent();
      document.body.appendChild(this.navigator);

      // Add keyboard event listeners
      this.addNavigatorKeyboardListeners();

      // Focus the navigator
      this.navigator.focus();

      console.log(`Navigator shown with ${this.currentIssues.length} issues`);
    }

    hideNavigator() {
      if (this.navigator) {
        this.navigator.remove();
        this.navigator = null;
      }
      this.clearTempHighlight();
      console.log("Navigator hidden");
    }

    updateNavigatorContent() {
      if (!this.navigator || this.currentIssues.length === 0) return;

      const currentIssue = this.currentIssues[this.currentIssueIndex];
      const element = currentIssue.nodes?.[0]?.element;
      const elementSelector = this.getElementSelector(element);

      this.navigator.innerHTML = `
        <div class="accex-navigator-header">
          <span class="accex-navigator-title">🔍 Accessibility Issues</span>
          <button class="accex-navigator-close" aria-label="Close navigator">×</button>
        </div>
        
        <div class="accex-navigator-counter">
          Issue <span class="accex-navigator-current">${
            this.currentIssueIndex + 1
          }</span> of ${this.currentIssues.length}
        </div>
        
        <div class="accex-navigator-controls">
          <button class="accex-navigator-btn" id="accex-prev" ${
            this.currentIssueIndex === 0 ? "disabled" : ""
          }>
            ← Previous
          </button>
          <button class="accex-navigator-btn" id="accex-next" ${
            this.currentIssueIndex >= this.currentIssues.length - 1
              ? "disabled"
              : ""
          }>
            Next →
          </button>
        </div>
        
        <div class="accex-navigator-issue">
          <div class="accex-navigator-issue-header">
            <span class="accex-navigator-severity ${
              currentIssue.impact || "minor"
            }">${(currentIssue.impact || "minor").toUpperCase()}</span>
            <span class="accex-navigator-issue-id">${currentIssue.id}</span>
          </div>
          
          <div class="accex-navigator-description">${
            currentIssue.description
          }</div>
          
          ${
            elementSelector
              ? `<div class="accex-navigator-element">${elementSelector}</div>`
              : ""
          }
          
          <div class="accex-navigator-actions">
            <button class="accex-navigator-action" id="accex-highlight">Highlight</button>
            <button class="accex-navigator-action" id="accex-details">Details</button>
          </div>
        </div>
        
        <div class="accex-keyboard-hint">
          Use ← → arrow keys to navigate • ESC to close • ENTER for details
        </div>
      `;

      // Add event listeners
      this.navigator
        .querySelector(".accex-navigator-close")
        .addEventListener("click", () => this.hideNavigator());
      this.navigator
        .querySelector("#accex-prev")
        .addEventListener("click", () => this.navigateToIssue("previous"));
      this.navigator
        .querySelector("#accex-next")
        .addEventListener("click", () => this.navigateToIssue("next"));
      this.navigator
        .querySelector("#accex-highlight")
        .addEventListener("click", () => this.highlightCurrentIssue());
      this.navigator
        .querySelector("#accex-details")
        .addEventListener("click", () => this.showIssueDetails());
    }

    addNavigatorKeyboardListeners() {
      if (!this.navigator) return;

      const keyHandler = (e) => {
        switch (e.key) {
          case "Escape":
            e.preventDefault();
            this.hideNavigator();
            break;
          case "ArrowLeft":
            e.preventDefault();
            this.navigateToIssue("previous");
            break;
          case "ArrowRight":
            e.preventDefault();
            this.navigateToIssue("next");
            break;
          case "Enter":
            e.preventDefault();
            this.showIssueDetails();
            break;
        }
      };

      this.navigator.addEventListener("keydown", keyHandler);
    }

    navigateToIssue(direction) {
      if (this.currentIssues.length === 0) return;

      if (
        direction === "next" &&
        this.currentIssueIndex < this.currentIssues.length - 1
      ) {
        this.currentIssueIndex++;
      } else if (direction === "previous" && this.currentIssueIndex > 0) {
        this.currentIssueIndex--;
      }

      this.updateNavigatorContent();
      this.announceCurrentIssue();

      console.log(
        `Navigated to issue ${this.currentIssueIndex + 1} of ${
          this.currentIssues.length
        }`
      );
    }

    announceCurrentIssue() {
      if (!this.ariaLiveRegion) return;

      const currentIssue = this.currentIssues[this.currentIssueIndex];
      const announcement = `Issue ${this.currentIssueIndex + 1} of ${
        this.currentIssues.length
      }: ${currentIssue.impact} - ${currentIssue.description}`;

      this.ariaLiveRegion.textContent = announcement;
    }

    highlightCurrentIssue() {
      const currentIssue = this.currentIssues[this.currentIssueIndex];
      if (!currentIssue?.nodes?.[0]?.element) return;

      this.clearTempHighlight();

      const element = currentIssue.nodes[0].element;
      element.classList.add("accex-temp-highlight");

      // Scroll element into view
      element.scrollIntoView({ behavior: "smooth", block: "center" });

      // Remove highlight after 3 seconds
      this.tempHighlightTimeout = setTimeout(() => {
        this.clearTempHighlight();
      }, 3000);

      console.log("Temporarily highlighted current issue element");
    }

    clearTempHighlight() {
      if (this.tempHighlightTimeout) {
        clearTimeout(this.tempHighlightTimeout);
        this.tempHighlightTimeout = null;
      }

      document.querySelectorAll(".accex-temp-highlight").forEach((el) => {
        el.classList.remove("accex-temp-highlight");
      });
    }

    showIssueDetails() {
      const currentIssue = this.currentIssues[this.currentIssueIndex];
      const fix = this.generateFixRecommendation(currentIssue);

      console.groupCollapsed(`🔍 Issue Details: ${currentIssue.id}`);
      console.log(
        `%cSeverity: ${currentIssue.impact || "minor"}`,
        "font-weight: bold;"
      );
      console.log(
        `%cDescription: ${currentIssue.description}`,
        "color: #374151;"
      );
      console.log(`%cHelp: ${currentIssue.help}`, "color: #6b7280;");
      console.log(
        `%cRecommended Fix: ${fix}`,
        "color: #7c3aed; font-style: italic;"
      );

      if (currentIssue.nodes?.[0]?.element) {
        console.log("Element:", currentIssue.nodes[0].element);
      }

      console.groupEnd();

      // Also announce the details
      if (this.ariaLiveRegion) {
        this.ariaLiveRegion.textContent = `Showing details for ${currentIssue.id}. Check console for full information.`;
      }
    }

    getElementSelector(element) {
      if (!element) return null;

      let selector = element.tagName.toLowerCase();

      if (element.id) {
        selector += `#${element.id}`;
      } else if (element.className) {
        const classes = element.className
          .split(" ")
          .filter((c) => c && !c.startsWith("accex-"));
        if (classes.length > 0) {
          selector += `.${classes.slice(0, 2).join(".")}`;
        }
      }

      return selector;
    }

    getImpactColor(impact) {
      const colors = {
        critical: "#e74c3c",
        serious: "#e67e22",
        moderate: "#f39c12",
        minor: "#3498db",
      };
      return colors[impact] || colors.minor;
    }

    addHighlightStyles() {
      if (document.getElementById("accex-highlight-styles")) return;

      const styles = document.createElement("style");
      styles.id = "accex-highlight-styles";
      styles.textContent = `
      /* Enhanced highlighting styles with better visibility */
      .a11y-highlight-critical {
        outline: 4px solid #ff0000 !important;
        outline-offset: 3px !important;
        position: relative !important;
        background: rgba(255, 0, 0, 0.15) !important;
        z-index: 999998 !important;
        box-shadow: 0 0 0 2px #ffffff, 0 0 0 6px #ff0000 !important;
        animation: a11y-pulse-critical 2s infinite !important;
      }
      
      .a11y-highlight-serious {
        outline: 4px solid #ff8c00 !important;
        outline-offset: 3px !important;
        position: relative !important;
        background: rgba(255, 140, 0, 0.15) !important;
        z-index: 999998 !important;
        box-shadow: 0 0 0 2px #ffffff, 0 0 0 6px #ff8c00 !important;
        animation: a11y-pulse-serious 2s infinite !important;
      }
      
      .a11y-highlight-moderate {
        outline: 4px solid #ffd700 !important;
        outline-offset: 3px !important;
        position: relative !important;
        background: rgba(255, 215, 0, 0.15) !important;
        z-index: 999998 !important;
        box-shadow: 0 0 0 2px #ffffff, 0 0 0 6px #ffd700 !important;
        animation: a11y-pulse-moderate 2s infinite !important;
      }
      
      .a11y-highlight-minor {
        outline: 4px solid #87ceeb !important;
        outline-offset: 3px !important;
        position: relative !important;
        background: rgba(135, 206, 235, 0.15) !important;
        z-index: 999998 !important;
        box-shadow: 0 0 0 2px #ffffff, 0 0 0 6px #87ceeb !important;
        animation: a11y-pulse-minor 2s infinite !important;
      }

      /* Pulsing animations for better visibility */
      @keyframes a11y-pulse-critical {
        0%, 100% { 
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 6px #ff0000 !important;
        }
        50% { 
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 8px #ff0000 !important;
        }
      }

      @keyframes a11y-pulse-serious {
        0%, 100% { 
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 6px #ff8c00 !important;
        }
        50% { 
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 8px #ff8c00 !important;
        }
      }

      @keyframes a11y-pulse-moderate {
        0%, 100% { 
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 6px #ffd700 !important;
        }
        50% { 
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 8px #ffd700 !important;
        }
      }

      @keyframes a11y-pulse-minor {
        0%, 100% { 
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 6px #87ceeb !important;
        }
        50% { 
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 8px #87ceeb !important;
        }
      }
      
      /* Tooltip styles */
      .a11y-tooltip {
        position: fixed !important;
        background: #2c3e50 !important;
        color: #ecf0f1 !important;
        padding: 12px !important;
        border-radius: 8px !important;
        font-size: 12px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important;
        z-index: 999999 !important;
        max-width: 300px !important;
        line-height: 1.4 !important;
        border: 1px solid #34495e !important;
        display: none !important;
      }
      
      .a11y-tooltip.visible {
        display: block !important;
      }
      
      .a11y-tooltip-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 8px !important;
        font-weight: bold !important;
        border-bottom: 1px solid #34495e !important;
        padding-bottom: 6px !important;
      }
      
      .a11y-issue-impact {
        padding: 2px 6px !important;
        border-radius: 3px !important;
        font-size: 10px !important;
        font-weight: bold !important;
        color: white !important;
      }
      
      .a11y-issue-impact.critical { background: #e74c3c !important; }
      .a11y-issue-impact.serious { background: #e67e22 !important; }
      .a11y-issue-impact.moderate { background: #f39c12 !important; }
      .a11y-issue-impact.minor { background: #3498db !important; }
      
      .a11y-issue-id {
        font-family: monospace !important;
        color: #bdc3c7 !important;
        font-size: 10px !important;
      }
      
      .a11y-tooltip-description {
        margin-bottom: 8px !important;
        line-height: 1.4 !important;
      }
      
      .a11y-tooltip-help {
        font-style: italic !important;
        color: #95a5a6 !important;
        line-height: 1.3 !important;
        margin-bottom: 8px !important;
      }
      
      .a11y-tooltip-code {
        background: #34495e !important;
        border: 1px solid #4a5f7a !important;
        border-radius: 4px !important;
        padding: 6px !important;
        font-family: 'Courier New', monospace !important;
        font-size: 11px !important;
        color: #e67e22 !important;
        margin-top: 6px !important;
        overflow-x: auto !important;
      }

      /* Pulse animation for highlights */
      @keyframes a11yPulse {
        0%, 100% { 
          outline-width: 3px !important;
          outline-color: var(--highlight-color) !important;
        }
        50% { 
          outline-width: 5px !important;
          outline-color: var(--highlight-color-bright) !important;
        }
      }
      
      .a11y-highlight-animated {
        animation: a11yPulse 2s ease-in-out infinite !important;
      }
      
      .a11y-highlight-critical.a11y-highlight-animated {
        --highlight-color: #ff0000;
        --highlight-color-bright: #ff4444;
      }
      
      .a11y-highlight-serious.a11y-highlight-animated {
        --highlight-color: #ff8c00;
        --highlight-color-bright: #ffaa44;
      }
      
      .a11y-highlight-moderate.a11y-highlight-animated {
        --highlight-color: #ffd700;
        --highlight-color-bright: #ffee44;
      }
      
      .a11y-highlight-minor.a11y-highlight-animated {
        --highlight-color: #87ceeb;
        --highlight-color-bright: #aaddff;
      }
    `;
      document.head.appendChild(styles);
    }

    addEnhancedHighlightStyles() {
      if (document.getElementById("accex-enhanced-styles")) return;

      const styles = document.createElement("style");
      styles.id = "accex-enhanced-styles";
      styles.textContent = `
      @keyframes accexSinglePulse {
        0% { 
          opacity: 0.8; 
          transform: scale(1);
          box-shadow: 0 0 20px var(--impact-color, #3498db)60, 
                      0 0 40px var(--impact-color, #3498db)30;
        }
        50% { 
          opacity: 1; 
          transform: scale(1.05);
          box-shadow: 0 0 30px var(--impact-color, #3498db)80, 
                      0 0 60px var(--impact-color, #3498db)50;
        }
        100% { 
          opacity: 0.8; 
          transform: scale(1);
          box-shadow: 0 0 20px var(--impact-color, #3498db)60, 
                      0 0 40px var(--impact-color, #3498db)30;
        }
      }
      
      .accex-single-highlight {
        border-width: 4px !important;
        animation: accexSinglePulse 1.5s ease-in-out infinite !important;
      }
      
      .accex-single-tooltip {
        opacity: 1 !important;
        visibility: visible !important;
        min-width: 280px !important;
        max-width: 450px !important;
        font-size: 14px !important;
        padding: 18px !important;
      }
      
      .accex-single-tooltip .accex-tooltip-description {
        font-size: 15px !important;
        margin-bottom: 8px !important;
        color: #ecf0f1 !important;
      }
      
      .accex-tooltip-element {
        margin-top: 10px;
        padding: 8px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        font-family: monospace;
        font-size: 11px;
        color: #bdc3c7;
        border-left: 3px solid var(--impact-color, #3498db);
      }
      
      .accex-tooltip-element code {
        background: transparent;
        color: inherit;
        padding: 0;
      }
    `;
      document.head.appendChild(styles);
    }

    clearHighlights() {
      console.log("🧹 Clearing all highlights and overlays");

      // Remove highlight classes and attributes from elements
      this.highlightedElements.forEach((elementOrOverlay) => {
        if (elementOrOverlay && elementOrOverlay.parentNode) {
          // Check if it's an overlay element
          if (elementOrOverlay.className === "accex-highlight-overlay") {
            // Remove overlay
            elementOrOverlay.remove();
            console.log("🗑️ Removed overlay");
          } else {
            // It's a regular element - clean it up
            element = elementOrOverlay;

            // Remove highlight classes
            element.classList.remove(
              "a11y-highlight-critical",
              "a11y-highlight-serious",
              "a11y-highlight-moderate",
              "a11y-highlight-minor",
              "a11y-highlight-animated"
            );

            // Remove forced inline styles
            element.style.removeProperty("outline");
            element.style.removeProperty("outline-offset");
            element.style.removeProperty("box-shadow");
            element.style.removeProperty("background-color");
            element.style.removeProperty("border");
            element.style.removeProperty("z-index");

            // Remove data attributes
            element.removeAttribute("data-a11y-issue");
            element.removeAttribute("data-a11y-impact");
            element.removeAttribute("data-a11y-description");
            element.removeAttribute("data-a11y-help");
            element.removeAttribute("data-a11y-fix");
            element.removeAttribute("data-a11y-highlighted");

            // Clean up tooltip event listeners
            if (element._a11yTooltipCleanup) {
              element._a11yTooltipCleanup();
              delete element._a11yTooltipCleanup;
            }

            console.log("🧽 Cleaned element:", element.tagName);
          }
        }
      });

      // Clear all overlays from container
      if (this.overlayContainer) {
        this.overlayContainer.innerHTML = "";
        console.log("🗑️ Cleared overlay container");
      }

      this.highlightedElements.clear();

      // Remove any existing tooltips
      this.hideTooltip();

      // Also remove any old overlay elements (backward compatibility)
      const overlays = document.querySelectorAll(
        ".accex-highlight, .accex-single-highlight"
      );
      overlays.forEach((overlay) => overlay.remove());
    }
  }

  // Store the class globally to prevent redeclaration
  window.AccessibilityHighlighter = AccessibilityHighlighter;

  // Initialize the highlighter only if not already initialized
  if (!window.accessibilityHighlighter) {
    console.log("🚀 Creating new AccessibilityHighlighter instance");
    window.accessibilityHighlighter = new AccessibilityHighlighter();
  } else {
    console.log(
      "✅ AccessibilityHighlighter already exists and initialized:",
      window.accessibilityHighlighter.isInitialized
    );
  }

  // Ensure global access for debugging
  window.accexDebug = {
    highlighter: window.accessibilityHighlighter,
    testPing: () => {
      console.log(
        "Manual ping test - highlighter exists:",
        !!window.accessibilityHighlighter
      );
      console.log(
        "Manual ping test - is initialized:",
        window.accessibilityHighlighter?.isInitialized
      );
      return { success: true, manual: true };
    },
  };
} // End of guard

console.log("🔧 Content script loaded. Global state:", {
  hasHighlighter: !!window.accessibilityHighlighter,
  isInitialized: window.accessibilityHighlighter?.isInitialized,
  timestamp: new Date().toISOString(),
});
