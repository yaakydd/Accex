// Accessibility Recommendations Engine
// Maps axe-core rules to specific fixes with clear recommendations

// Prevent duplicate loading
if (typeof window.AccessibilityRecommendations === "undefined") {
  class AccessibilityRecommendations {
    constructor() {
      this.ruleMap = {
        "color-contrast": {
          title: "Low Color Contrast",
          wcag: "WCAG 1.4.3",
          severity: "serious",
          description: "Text must have sufficient contrast against background",
          getRecommendation: (violation) =>
            this.getContrastRecommendation(violation),
          getQuickFix: (violation) => this.getContrastQuickFix(violation),
          resources: [
            "https://webaim.org/resources/contrastchecker/",
            "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
          ],
        },
        "image-alt": {
          title: "Missing Image Alt Text",
          wcag: "WCAG 1.1.1",
          severity: "critical",
          description: "Images must have descriptive alternative text",
          getRecommendation: (violation) =>
            this.getImageAltRecommendation(violation),
          getQuickFix: (violation) => this.getImageAltQuickFix(violation),
          resources: [
            "https://webaim.org/techniques/alttext/",
            "https://www.w3.org/WAI/tutorials/images/",
          ],
        },
        label: {
          title: "Missing Form Labels",
          wcag: "WCAG 3.3.2",
          severity: "critical",
          description: "Form inputs must have proper labels",
          getRecommendation: (violation) =>
            this.getLabelRecommendation(violation),
          getQuickFix: (violation) => this.getLabelQuickFix(violation),
          resources: [
            "https://webaim.org/techniques/forms/controls",
            "https://www.w3.org/WAI/tutorials/forms/labels/",
          ],
        },
        "link-name": {
          title: "Empty or Poor Link Text",
          wcag: "WCAG 2.4.4",
          severity: "serious",
          description: "Links must have descriptive text",
          getRecommendation: (violation) =>
            this.getLinkNameRecommendation(violation),
          getQuickFix: (violation) => this.getLinkNameQuickFix(violation),
          resources: [
            "https://webaim.org/techniques/hypertext/",
            "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
          ],
        },
      };
    }

    // Get recommendation for a specific violation
    getRecommendation(violation) {
      const rule = this.ruleMap[violation.id];
      if (!rule) {
        return this.getGenericRecommendation(violation);
      }

      return {
        id: violation.id,
        title: rule.title,
        wcag: rule.wcag,
        severity: rule.severity,
        description: rule.description,
        fix: rule.getRecommendation(violation),
        quickFix: rule.getQuickFix(violation),
        resources: rule.resources,
        element: violation.nodes?.[0]?.target?.[0] || "Unknown element",
      };
    }

    // Color contrast specific recommendations
    getContrastRecommendation(violation) {
      const node = violation.nodes?.[0];
      if (!node) return "Increase text contrast to meet WCAG standards";

      const currentRatio = this.extractContrastRatio(node);
      const minimumRatio = this.getMinimumContrastRatio(node);

      return (
        `Increase contrast ratio from current ${currentRatio} to minimum ${minimumRatio}:1. ` +
        `Current colors may be difficult for users with visual impairments to read.`
      );
    }

    getContrastQuickFix(violation) {
      const node = violation.nodes?.[0];
      if (!node)
        return {
          code: "/* Adjust text or background color */",
          instructions: "Check color contrast",
        };

      const element = this.getElementFromTarget(node.target);
      if (!element)
        return {
          code: "/* Element not found */",
          instructions: "Manually check contrast",
        };

      const styles = window.getComputedStyle(element);
      const currentColor = styles.color;
      const backgroundColor = styles.backgroundColor;

      const suggestedColor = this.suggestContrastColor(
        currentColor,
        backgroundColor
      );

      return {
        code: `color: ${suggestedColor};`,
        instructions: `Change the text color from ${currentColor} to ${suggestedColor}`,
        currentColor: currentColor,
        suggestedColor: suggestedColor,
        backgroundColor: backgroundColor,
      };
    }

    // Image alt text recommendations
    getImageAltRecommendation(violation) {
      const node = violation.nodes?.[0];
      if (!node) return "Add descriptive alt text to images";

      const element = this.getElementFromTarget(node.target);
      if (!element) return "Add alt attribute with descriptive text";

      const src = element.src || "unknown";
      const filename = src.split("/").pop() || "image";

      return (
        `Add meaningful alt text describing the image content. ` +
        `For decorative images, use alt="" (empty). ` +
        `Current image: ${filename}`
      );
    }

    getImageAltQuickFix(violation) {
      const node = violation.nodes?.[0];
      const element = this.getElementFromTarget(node?.target);
      const isDecorative = this.isDecorativeImage(element);

      if (isDecorative) {
        return {
          code: 'alt=""',
          instructions: "Add empty alt attribute for decorative image",
          type: "decorative",
        };
      }

      return {
        code: 'alt="[Describe the image content here]"',
        instructions:
          "Add descriptive alt text explaining what the image shows",
        type: "informative",
      };
    }

    // Form label recommendations
    getLabelRecommendation(violation) {
      const node = violation.nodes?.[0];
      if (!node) return "Add proper labels to form inputs";

      const element = this.getElementFromTarget(node.target);
      if (!element) return "Associate input with descriptive label";

      const inputType = element.type || "input";
      const inputName = element.name || element.id || "unnamed";

      return (
        `Add a <label> element or aria-label attribute to describe the ${inputType} field. ` +
        `Current field: ${inputName}`
      );
    }

    getLabelQuickFix(violation) {
      const node = violation.nodes?.[0];
      const element = this.getElementFromTarget(node?.target);
      const inputId = element?.id || `input-${Date.now()}`;
      const inputType = element?.type || "text";

      return {
        code: `<label for="${inputId}">[Label text]</label>`,
        instructions: `Add a label element with descriptive text for this ${inputType} input`,
        alternative: `aria-label="[Descriptive text]"`,
        inputId: inputId,
      };
    }

    // Link name recommendations
    getLinkNameRecommendation(violation) {
      const node = violation.nodes?.[0];
      if (!node) return "Add descriptive text to links";

      const element = this.getElementFromTarget(node.target);
      if (!element) return "Provide meaningful link text";

      const currentText = element.textContent?.trim() || "";
      const href = element.href || "";

      return (
        `Replace generic link text with descriptive text that explains the link's purpose. ` +
        `Current text: "${currentText}". Link destination: ${href}`
      );
    }

    getLinkNameQuickFix(violation) {
      const node = violation.nodes?.[0];
      const element = this.getElementFromTarget(node?.target);
      const href = element?.href || "";
      const currentText = element?.textContent?.trim() || "";

      return {
        code: `<a href="${href}">[Descriptive link text]</a>`,
        instructions: `Replace "${currentText}" with descriptive text explaining where the link goes`,
        alternative: `aria-label="[Descriptive text]"`,
        currentText: currentText,
      };
    }

    // Utility methods
    extractContrastRatio(node) {
      const any = node.any?.[0];
      if (any?.data?.contrastRatio) {
        return any.data.contrastRatio.toFixed(2);
      }
      return "unknown";
    }

    getMinimumContrastRatio(node) {
      const any = node.any?.[0];
      if (any?.data?.fontSize && parseFloat(any.data.fontSize) >= 18) {
        return "3"; // Large text minimum
      }
      return "4.5"; // Normal text minimum
    }

    getElementFromTarget(target) {
      if (!target || !target[0]) return null;
      try {
        return document.querySelector(target[0]);
      } catch (e) {
        return null;
      }
    }

    isDecorativeImage(element) {
      if (!element) return false;

      // Check if image is likely decorative based on context
      const parent = element.parentElement;
      const hasTextSibling = parent?.textContent?.trim().length > 0;
      const isInLink = element.closest("a") !== null;
      const hasEmptyAlt = element.alt === "";

      return hasEmptyAlt || (!isInLink && hasTextSibling);
    }

    suggestContrastColor(currentColor, backgroundColor) {
      // Simple contrast improvement algorithm
      // In a real implementation, this would use proper luminance calculations
      const rgb = this.parseColor(currentColor);
      if (!rgb) return "#000000";

      // Make text darker if it's light, lighter if it's dark
      const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

      if (luminance > 0.5) {
        // Make darker
        return `rgb(${Math.max(0, rgb.r - 100)}, ${Math.max(
          0,
          rgb.g - 100
        )}, ${Math.max(0, rgb.b - 100)})`;
      } else {
        // Make lighter
        return `rgb(${Math.min(255, rgb.r + 100)}, ${Math.min(
          255,
          rgb.g + 100
        )}, ${Math.min(255, rgb.b + 100)})`;
      }
    }

    parseColor(colorStr) {
      if (!colorStr) return null;

      // Handle rgb() format
      const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        return {
          r: parseInt(rgbMatch[1]),
          g: parseInt(rgbMatch[2]),
          b: parseInt(rgbMatch[3]),
        };
      }

      // Handle hex format
      const hexMatch = colorStr.match(
        /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i
      );
      if (hexMatch) {
        return {
          r: parseInt(hexMatch[1], 16),
          g: parseInt(hexMatch[2], 16),
          b: parseInt(hexMatch[3], 16),
        };
      }

      return null;
    }

    getGenericRecommendation(violation) {
      return {
        id: violation.id,
        title: violation.help || "Accessibility Issue",
        wcag: "WCAG Guidelines",
        severity: violation.impact || "moderate",
        description:
          violation.description || "This element has accessibility issues",
        fix: violation.helpUrl
          ? `See guidance at: ${violation.helpUrl}`
          : "Review accessibility guidelines",
        quickFix: {
          code: "/* Manual review required */",
          instructions: "Check accessibility guidelines",
        },
        resources: violation.helpUrl ? [violation.helpUrl] : [],
        element: violation.nodes?.[0]?.target?.[0] || "Unknown element",
      };
    }

    // Filter violations to focus on vision/UI issues
    filterVisionUIViolations(violations) {
      const targetRules = Object.keys(this.ruleMap);
      return violations.filter((violation) =>
        targetRules.includes(violation.id)
      );
    }

    // Group violations by severity
    groupBySeverity(violations) {
      return {
        critical: violations.filter((v) => v.impact === "critical"),
        serious: violations.filter((v) => v.impact === "serious"),
        moderate: violations.filter((v) => v.impact === "moderate"),
        minor: violations.filter((v) => v.impact === "minor"),
      };
    }
  }

  // Make the class available globally
  window.AccessibilityRecommendations = AccessibilityRecommendations;
  console.log("AccessibilityRecommendations class loaded successfully");
} // End of conditional check
