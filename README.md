# 🔍 Accex - Accessibility Scanner

**Making the web accessible for everyone** 🌐

Accex is a comprehensive browser extension that helps web developers identify and fix accessibility issues to ensure their websites are usable by people with disabilities and meet WCAG (Web Content Accessibility Guidelines) standards.

## ✨ Features

### 🎯 Core Functionality

- **Real-time Accessibility Scanning** - Instantly scan any webpage for accessibility issues
- **WCAG Compliance Checking** - Supports WCAG 2.0/2.1 Level A, AA, and AAA standards
- **Visual Issue Highlighting** - Color-coded highlighting of accessibility problems directly on the page
- **Detailed Issue Reports** - Comprehensive explanations of issues and how to fix them
- **Severity Classification** - Issues categorized as Critical, Serious, Moderate, or Minor

### 🔧 Key Accessibility Issues Detected

#### 1. **Color Contrast Problems** 🎨

- Detects insufficient color contrast ratios
- Helps ensure text is readable for users with visual impairments
- Suggests compliant color alternatives

#### 2. **Missing Image Alt Text** 🖼️

- Identifies images without descriptive alternative text
- Essential for screen reader users
- AI-powered alt text suggestions (planned feature)

#### 3. **Keyboard Navigation Issues** ⌨️

- Finds elements that can't be accessed via keyboard
- Critical for users who cannot use a mouse
- Detects keyboard traps and focus issues

#### 4. **Form Accessibility Problems** 📝

- Identifies unlabeled form fields
- Ensures proper form field associations
- Checks for clear form instructions

#### 5. **Document Structure Issues** 🏗️

- Validates heading hierarchy (h1, h2, h3...)
- Checks for proper landmark usage
- Ensures logical document structure

#### 6. **Media Accessibility** 🎵

- Detects auto-playing media without controls
- Checks for media captions and transcripts
- Ensures media doesn't interfere with screen readers

### 🎛️ Advanced Features

- **Category Filtering** - Filter issues by type (Contrast, Images, Keyboard, Forms, Structure)
- **Customizable Highlighting** - Choose which severity levels to highlight
- **Export Reports** - Generate detailed accessibility reports in JSON, CSV, or PDF formats
- **Scan History** - Keep track of previous scans and improvements over time
- **Browser Badge** - Shows issue count directly on the extension icon
- **Context Menu Integration** - Right-click to scan pages or specific elements

## 🚀 Installation

### From Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link pending publication)
2. Search for "Accex Accessibility Scanner"
3. Click "Add to Chrome"

### Manual Installation (Development)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Accex icon should appear in your browser toolbar

## 🎮 How to Use

### Basic Scanning

1. **Navigate** to any webpage you want to test
2. **Click** the Accex extension icon in your browser toolbar
3. **Click** the "Scan Page" button
4. **Review** the results in the popup

### Understanding Results

- **Critical** 🔴 - Must fix immediately (legal compliance issues)
- **Serious** 🟠 - Should fix soon (major accessibility barriers)
- **Moderate** 🟡 - Should fix eventually (moderate barriers)
- **Minor** 🔵 - Nice to fix (enhancement opportunities)

### Viewing Issues on Page

- Issues are highlighted directly on the webpage with color-coded outlines
- Hover over highlighted elements to see detailed tooltips
- Click violation items in the popup to focus on specific issues

### Filtering and Organizing

- Use category filters (Contrast, Images, Keyboard, Forms, Structure)
- Sort by severity level
- Export detailed reports for documentation

## ⚙️ Configuration

Access settings by:

1. Right-clicking the extension icon → "Options"
2. Or clicking the gear icon in the popup

### Available Settings

- **Scanning Rules** - Choose which WCAG levels to check
- **Visual Highlighting** - Customize how issues are displayed
- **Notifications** - Control when to receive alerts
- **Export Options** - Set default report formats
- **Advanced Options** - Debug mode, scan timeouts, etc.

## 📊 Understanding WCAG Compliance

### WCAG Levels

- **Level A** - Basic accessibility (minimum level)
- **Level AA** - Standard compliance (recommended for most sites)
- **Level AAA** - Enhanced accessibility (highest level)

### Success Criteria Categories

1. **Perceivable** - Information must be presentable in ways users can perceive
2. **Operable** - Interface components must be operable by all users
3. **Understandable** - Information and UI operation must be understandable
4. **Robust** - Content must work with various assistive technologies

## 🛠️ Development

### Project Structure

```
Accex/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for background tasks
├── content-script.js      # Injected script for page scanning
├── axe.min.js            # Axe-core accessibility engine
├── popup/
│   ├── popup.html        # Extension popup interface
│   ├── popup.css         # Popup styling
│   └── popup.js          # Popup functionality
├── options.html          # Settings page
├── options.css           # Settings page styling
├── options.js            # Settings functionality
└── icons/
    └── icon48.png        # Extension icon
```

### Technologies Used

- **Axe-core** - Industry-standard accessibility testing engine
- **Chrome Extension APIs** - Manifest V3 for modern Chrome extensions
- **Vanilla JavaScript** - No external frameworks for performance
- **CSS Grid/Flexbox** - Modern responsive layouts
- **Chrome Storage API** - Persistent settings and scan history

### Building from Source

1. Clone the repository
2. Ensure `axe.min.js` is present (download from axe-core releases)
3. Load as unpacked extension in Chrome
4. Test on various websites

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Types of Contributions

- **Bug Reports** - Found an issue? Report it!
- **Feature Requests** - Have an idea? Share it!
- **Code Contributions** - Submit pull requests
- **Documentation** - Help improve our docs
- **Testing** - Test on different websites and report findings

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Coding Standards

- Use ES6+ JavaScript features
- Follow accessibility best practices in the extension itself
- Write descriptive commit messages
- Include comments for complex logic
- Test on multiple websites

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **axe-core** by Deque Systems - The accessibility testing engine that powers our scans
- **WCAG Guidelines** by W3C - The standards that guide our accessibility checks
- **Chrome Extension APIs** by Google - The platform that makes this extension possible
- **Accessibility Community** - For continuous feedback and improvement suggestions

## � Troubleshooting

### Common Issues and Solutions

#### "axe-core script loaded, but 'axe' object is still undefined"

**Cause:** The axe-core library failed to initialize properly
**Solutions:**

1. **Reload the page** and try scanning again
2. **Check the browser console** (F12) for additional error messages
3. **Try the diagnostic page** (`diagnostic.html`) to test the extension
4. **Disable other extensions** temporarily to check for conflicts
5. **Update Chrome** to the latest version

#### Extension not working on specific pages

**Cause:** Some pages have security restrictions (CSP, CORS)
**Solutions:**

1. **Refresh the page** and try again
2. **Try on a different website** to verify the extension works
3. **Check if the page is restricted** (banking sites, secure portals)
4. **Use the test page** (`test-page.html`) to verify functionality

#### "Cannot access this page" error

**Cause:** Browser restrictions on certain URLs
**Solutions:**

1. **Avoid internal Chrome pages** (chrome://, about:)
2. **Enable file access** if testing local files (chrome://extensions/ → Details → Allow access to file URLs)
3. **Try a regular website** instead of restricted pages

#### Scan button stays disabled

**Cause:** Previous scan didn't complete properly
**Solutions:**

1. **Close and reopen the popup**
2. **Refresh the page** you're trying to scan
3. **Reload the extension** in chrome://extensions/

### Diagnostic Tools

#### Use the Diagnostic Page

1. Open `diagnostic.html` in your browser
2. Click "Run Full Diagnostic"
3. Review the test results and console output
4. Follow any specific recommendations

#### Manual Testing Steps

1. **Test on simple pages first** - try Google or Wikipedia
2. **Check browser console** - look for error messages
3. **Verify extension permissions** - ensure all required permissions are granted
4. **Test with minimal setup** - disable other extensions temporarily

### Performance Tips

- **Scan smaller pages first** - large pages may take longer
- **Increase timeout** in settings if scans fail
- **Close other tabs** to free up memory
- **Use filtering** to focus on specific issue types

## �📞 Support

### Getting Help

- **Issues** - Report bugs or request features on GitHub
- **Documentation** - Check this README and inline help
- **Community** - Join accessibility forums for general questions
- **Diagnostic Tools** - Use `diagnostic.html` for troubleshooting

### Known Limitations

- Cannot scan Chrome internal pages (chrome://, about:)
- Requires page reload for content script injection on some sites
- Limited to client-side accessibility testing
- Cannot test dynamic content that requires user interaction

## 🔄 Changelog

### Version 2.0 (Current)

- ✨ Complete UI redesign with modern interface
- 🎯 Enhanced categorization and filtering
- 📊 Detailed compliance scoring
- ⚙️ Comprehensive settings page
- 🔔 Smart notifications system
- 📤 Multiple export formats
- 🎨 Improved visual highlighting
- 📱 Better responsive design

### Version 1.0

- 🎉 Initial release
- 🔍 Basic accessibility scanning
- 📋 Simple violation reporting
- 🎨 Basic element highlighting

## 🚀 Roadmap
Will be updated soon

### Upcoming Features

- **AI-Powered Alt Text** - Automatic alt text generation for images
- **Custom Rule Sets** - Create your own accessibility rules
- **Team Collaboration** - Share reports and track progress
- **API Integration** - Connect with development workflows
- **Mobile Testing** - Test mobile-specific accessibility issues
- **Performance Monitoring** - Track accessibility improvements over time

---

**Making the web accessible is not just about compliance—it's about creating an inclusive digital world where everyone can participate fully.** 🌍♿

_Built with ❤️ for the accessibility community_
