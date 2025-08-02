// Trading AI Assistant Content Script
console.log('🤖 Trading AI Assistant content script loaded');
console.log('🤖 Current URL:', window.location.href);
console.log('🤖 Chrome APIs available:', {
  runtime: !!chrome.runtime,
  storage: !!chrome.storage
});
console.log('🤖 Document ready state:', document.readyState);

// Global debug tracking
window.tradingAIDebug = {
  scriptLoaded: true,
  initCalled: false,
  domReady: false,
  extensionCreated: false
};

class TradingAIAssistant {
  constructor() {
    console.log('🔧 TradingAIAssistant constructor called');
    window.tradingAIDebug.extensionCreated = true;
    this.chatContainer = null;
    this.isOpen = false;
    this.messages = [];
    this.isAnalyzing = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.isResizing = false;
    this.startHeight = 0;
    this.screenshots = {};
    this.activeTimeframe = null;
    this.isMultiTimeframeMode = false;
    this.maxTimeframes = 4;
    this.isInitialized = false;
    
    // Memory management limits
    this.maxChatMessages = 50; // Maximum messages to keep (simple limit)
    this.maxConversationHistory = 20; // Limit conversation pairs for memory efficiency
    this.messageCount = 0;
    
    // Image quality presets (realistic sizes for TradingView charts)
    this.qualityPresets = {
      'ultra': { maxWidth: 2560, maxHeight: 1440, format: 'png', jpegQuality: 0.98, maxSizeMB: 1.0, maxSizeKB: 1000 },
      'high': { maxWidth: 1920, maxHeight: 1080, format: 'png', jpegQuality: 0.95, maxSizeMB: 0.8, maxSizeKB: 800 },  // Default
      'medium': { maxWidth: 1280, maxHeight: 720, format: 'auto', jpegQuality: 0.85, maxSizeMB: 0.5, maxSizeKB: 500 }
    };
    this.currentQuality = 'high'; // Default to high quality
    
    // Provider settings
    this.providerSettings = {
      openai: {
        enabled: false,
        apiKey: '',
        models: ['gpt-4o'], // Only vision-capable models
        selectedModel: 'gpt-4o'
      },
      grok: {
        enabled: false,
        apiKey: '',
        models: ['grok-4'], // Only vision-capable models  
        selectedModel: 'grok-4'
      }
    };
    
    this.currentProvider = 'openai'; // Default provider
    this.init();
  }

  async init() {
    console.log('🚀 TradingAI: Initializing assistant...');
    this.isInitialized = false;
    
    try {
      this.createChatInterface();
      console.log('✅ Chat interface created');
      
      // Update provider display to show correct model
      this.updateProviderDisplay();
      
      // Update chat status to show correct provider
      this.updateChatStatus();
      
      this.setupEventListeners();
      console.log('✅ Event listeners set up');
      
      // Load persistent chat history
      await this.loadChatHistory();
      console.log('✅ Chat history loaded');
      
      // Load persistent screenshots
      await this.loadScreenshots();
      console.log('✅ Screenshots loaded');
      
      // Verify button setup to ensure toggle works
      this.verifyButtonSetup();
      console.log('✅ Button setup verified');
      
      this.setupSettingsModal();
      console.log('✅ Settings modal set up');
      
      await this.loadProviderSettings();
      console.log('✅ Provider settings loaded');
      
      this.updateProviderDisplay();
      
      // Set up memory monitoring
      this.monitorMemoryUsage();
      
      // Set up page cleanup handlers
      this.setupPageCleanupHandlers();
      
      this.setupDragListeners();
      this.setupResizeListeners();
      
      this.isInitialized = true;
      console.log('✅ TradingAI Assistant fully initialized');
      
      // Force-ensure toggle button works with a small delay
      setTimeout(() => {
        this.forceAttachToggleListener();
        
        // Final verification of initial state
        const chatContainer = document.getElementById('trading-ai-chat');
        const toggle = document.getElementById('chat-toggle');
        console.log('🔍 FINAL STATE CHECK:');
        console.log('  Container exists:', !!chatContainer);
        console.log('  Container classes:', chatContainer?.className);
        console.log('  Toggle exists:', !!toggle);
        console.log('  Toggle text:', toggle?.textContent);
        console.log('  Toggle clickable:', toggle ? 'YES' : 'NO');
        
        if (toggle) {
          // Add final emergency handler
          const self = this;
          toggle.onclick = function() {
            console.log('🆘 EMERGENCY ONCLICK HANDLER TRIGGERED!');
            self.toggleChat();
          };
          
          // Make globally accessible for debugging
          window.tradingAIToggle = toggle;
          window.tradingAIInstance = this;
          window.debugToggle = () => this.toggleChat();
          window.setQuality = (level) => this.setImageQuality(level);  // Global quality control
          window.switchProvider = (provider) => {
            if (provider === 'openai' || provider === 'grok') {
              this.currentProvider = provider;
              this.updateProviderDisplay();
              this.updateChatStatus();  // Update status area too
              console.log(`🔄 Switched to ${provider} - Check the header AND status!`);
            } else {
              console.log('❌ Invalid provider. Use: switchProvider("openai") or switchProvider("grok")');
            }
          };
          
          // Global function to show current status
          window.showStatus = () => {
            const providerConfig = this.getProviderConfig();
            console.log('📊 CURRENT STATUS:');
            console.log(`  Provider: ${this.currentProvider} (${providerConfig.name})`);
            console.log(`  Model: ${providerConfig.model}`);
            console.log(`  Quality: ${this.currentQuality}`);
            console.log(`  Header shows: ${document.getElementById('provider-status')?.textContent || 'N/A'}`);
            console.log(`  Status shows: ${document.getElementById('status-text')?.textContent || 'N/A'}`);
            return { provider: this.currentProvider, model: providerConfig.model, quality: this.currentQuality };
          };
          
          // Global help function
          window.help = () => {
            this.addMessage('ai', `🔧 **Quick Reference Commands:**

**📸 Screenshot Analysis:**
- Click "📸 Analyze Chart" for single analysis
- Take multiple screenshots → "Compare All Timeframes"

**📤 Share Screenshots:**
- 📥 Download button → Save as PNG
- 📋 Copy button → Paste in Discord/Telegram

**🎛️ Console Commands:**
- \`showStatus()\` → Show current settings
- \`help()\` → Show this help again

**💬 Chat Tips:**
- Ask follow-up questions about screenshots
- Select text with mouse → Ctrl+C to copy
- History persists across page reloads

**🎯 Pro Usage:**
- Use multiple timeframes (1h + 4h + 1d) for context
- Clear charts before screenshots for better analysis
- Screenshots auto-detect symbol and timeframe

Ready to trade? 🚀`);
            return 'Help displayed in chat! 📖';
          };
        }
      }, 250);
      
    } catch (error) {
      console.error('❌ TradingAI initialization failed:', error);
      this.isInitialized = false;
    }
  }

  // Gallery Management Functions
  toggleGallery() {
    const gallery = document.getElementById('screenshot-gallery');
    const toggle = document.getElementById('gallery-toggle');
    
    if (gallery && toggle) {
      const isCollapsed = gallery.classList.contains('gallery-collapsed');
      
      if (isCollapsed) {
        gallery.classList.remove('gallery-collapsed');
        toggle.textContent = '▼';
      } else {
        gallery.classList.add('gallery-collapsed');
        toggle.textContent = '▶';
      }
    }
  }

  updateGallery() {
    const gallery = document.getElementById('screenshot-gallery');
    const galleryEmpty = document.getElementById('gallery-empty');
    const galleryItems = document.getElementById('gallery-items');
    
    if (!gallery || !galleryEmpty || !galleryItems) return;
    
    const timeframes = Object.keys(this.screenshots);
    
    // Show/hide gallery based on whether we have screenshots
    if (timeframes.length === 0) {
      console.log(`📭 Gallery empty: hiding screenshot gallery`);
      gallery.style.display = 'none';
      return;
    } else {
      console.log(`📸 Gallery update: showing ${timeframes.length} screenshots`);
      gallery.style.display = 'block';
      // Auto-expand when adding first screenshot OR when compare button should be visible
      if (timeframes.length >= 1) {
        gallery.classList.remove('gallery-collapsed');
        const toggle = document.getElementById('gallery-toggle');
        if (toggle) toggle.textContent = '▼';
      }
    }
    
    // Show/hide empty state
    if (timeframes.length === 0) {
      galleryEmpty.style.display = 'block';
      galleryItems.style.display = 'none';
    } else {
      galleryEmpty.style.display = 'none';
      galleryItems.style.display = 'flex';
    }
    
    // Clear existing items
    galleryItems.innerHTML = '';
    
    // Sort timeframes by timestamp (newest first)
    const sortedTimeframes = timeframes.sort((a, b) => {
      return this.screenshots[b].timestamp - this.screenshots[a].timestamp;
    });
    
    // Add gallery items
    sortedTimeframes.forEach(timeframe => {
      const screenshot = this.screenshots[timeframe];
      const item = this.createGalleryItem(timeframe, screenshot);
      galleryItems.appendChild(item);
    });
    
    // Update gallery title with count
    const galleryTitle = document.querySelector('.gallery-title');
    if (galleryTitle) {
      const modeText = this.isMultiTimeframeMode ? ' - Compare Mode' : '';
      galleryTitle.textContent = `📸 Stored Screenshots (${timeframes.length}/${this.maxTimeframes})${modeText}`;
    }

    // Show/hide compare button
    const galleryActions = document.getElementById('gallery-actions');
    if (galleryActions) {
      if (timeframes.length >= 2) {
        galleryActions.style.display = 'block';
      } else {
        galleryActions.style.display = 'none';
      }
    }
  }

  createGalleryItem(timeframe, screenshot) {
    const item = document.createElement('div');
    item.className = `gallery-item ${this.activeTimeframe === timeframe ? 'active' : ''}`;
    item.dataset.timeframe = timeframe;
    
    const timeAgo = this.formatTimeAgo(screenshot.timestamp);
    
    const symbol = screenshot.symbol || 'Unknown';
    
    item.innerHTML = `
      <div class="gallery-item-info">
        <div class="gallery-item-timeframe">${symbol} • ${timeframe}</div>
        <div class="gallery-item-timestamp">${timeAgo} • ${screenshot.conversation.length / 2} exchanges</div>
      </div>
      <div class="gallery-item-actions">
        <button class="gallery-item-btn download" title="Download screenshot">📥</button>
        <button class="gallery-item-btn copy" title="Copy to clipboard">📋</button>
        <button class="gallery-item-btn select" title="Use this timeframe for chat">💬</button>
        <button class="gallery-item-btn delete" title="Delete this screenshot">🗑️</button>
      </div>
    `;
    
    // Add event listeners
    const downloadBtn = item.querySelector('.download');
    const copyBtn = item.querySelector('.copy');
    const selectBtn = item.querySelector('.select');
    const deleteBtn = item.querySelector('.delete');
    
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.downloadScreenshot(timeframe, screenshot);
    });
    
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyScreenshotToClipboard(timeframe, screenshot, copyBtn);
    });
    
    selectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectTimeframe(timeframe);
    });
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteTimeframe(timeframe);
    });
    
    item.addEventListener('click', () => {
      this.selectTimeframe(timeframe);
    });
    
    return item;
  }

  selectTimeframe(timeframe) {
    if (this.screenshots[timeframe]) {
      this.activeTimeframe = timeframe;
      this.isMultiTimeframeMode = false; // Exit multi-timeframe mode
      this.updateGallery();
      this.updateChatStatus();
      this.addMessage('ai', `✅ **Switched to ${timeframe} timeframe!**

Now using ${timeframe} screenshot for chat context. You can ask questions about this timeframe analysis.

💡 **Available conversations:** ${this.screenshots[timeframe].conversation.length / 2} exchanges recorded.`);
    }
  }

  enableMultiTimeframeMode() {
    const timeframes = Object.keys(this.screenshots);
    
    if (timeframes.length < 2) {
      this.addMessage('ai', `❌ **Need More Screenshots**

You need at least 2 screenshots to compare timeframes. Currently have: ${timeframes.length}

📸 Take more screenshots with different timeframes to enable comparison mode.`);
      return;
    }

    this.isMultiTimeframeMode = true;
    this.activeTimeframe = null; // Clear single timeframe selection
    this.updateGallery();
    this.updateChatStatus();

    // Create a list showing symbol and timeframe for each screenshot
    const timeframeWithSymbols = timeframes.sort().map(tf => {
      const symbol = this.screenshots[tf].symbol || 'Unknown';
      return `${symbol} (${tf})`;
    }).join(', ');
    
    this.addMessage('ai', `📊 **Multi-Timeframe Comparison Mode Enabled!**

Now analyzing ALL stored timeframes simultaneously: **${timeframeWithSymbols}**

🎯 **You can now ask questions like:**
• "Compare the trends across all timeframes"
• "What's the overall market structure?"
• "Are the 15m and 4h timeframes aligned?"
• "Which timeframe shows the strongest signal?"
• "What do all timeframes suggest for entry/exit?"

💡 **${timeframes.length} screenshots** loaded for comprehensive analysis!`);
  }

  deleteTimeframe(timeframe) {
    if (this.screenshots[timeframe]) {
      const symbol = this.screenshots[timeframe].symbol || 'Unknown';
      delete this.screenshots[timeframe];
      
      // If we deleted the active timeframe, clear it
      if (this.activeTimeframe === timeframe) {
        this.activeTimeframe = null;
        this.isMultiTimeframeMode = false;
      }
      
      this.updateGallery();
      this.updateChatStatus();
      
      // Save screenshots to storage after deletion
      this.saveScreenshots();
      
      this.addMessage('ai', `🗑️ **${symbol} • ${timeframe} screenshot deleted!**

Screenshot and conversation history for ${symbol} ${timeframe} timeframe has been removed.

📸 **Remaining timeframes:** ${Object.keys(this.screenshots).length}/${this.maxTimeframes}`);
    }
  }

  // Download screenshot as image file
  downloadScreenshot(timeframe, screenshot) {
    try {
      console.log(`📥 Downloading screenshot for ${timeframe} timeframe`);
      
      // Check if image data exists
      if (!screenshot.image) {
        throw new Error('Screenshot image data not found');
      }
      
      // Convert base64 to blob
      const base64Data = screenshot.image.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Generate filename with symbol, timeframe and timestamp
      const symbol = screenshot.symbol || 'CHART';
      const timestamp = new Date(screenshot.timestamp).toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${symbol}_${timeframe}_${timestamp}.png`;
      
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      this.addMessage('ai', `📥 **Screenshot Downloaded!**

✅ ${filename}

💡 You can now share this screenshot in Discord, Telegram, or any other platform!`);
      
      console.log(`✅ Screenshot downloaded successfully: ${filename}`);
      
    } catch (error) {
      console.error('❌ Failed to download screenshot:', error);
      this.addMessage('ai', `❌ **Download Failed**

Sorry, couldn't download the screenshot. Please try again or check browser permissions.

Error: ${error.message}`);
    }
  }

  // Copy screenshot to clipboard
  async copyScreenshotToClipboard(timeframe, screenshot, buttonElement) {
    try {
      console.log(`📋 Copying screenshot for ${timeframe} timeframe to clipboard`);
      
      // Check if image data exists
      if (!screenshot.image) {
        throw new Error('Screenshot image data not found');
      }
      
      // Check if Clipboard API is supported
      if (!navigator.clipboard || !navigator.clipboard.write) {
        throw new Error('Clipboard API not supported in this browser');
      }
      
      // Convert base64 to blob
      const base64Data = screenshot.image.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // Create ClipboardItem and write to clipboard
      const clipboardItem = new ClipboardItem({
        'image/png': blob
      });
      
      await navigator.clipboard.write([clipboardItem]);
      
      // Visual feedback on button
      const originalText = buttonElement.textContent;
      const originalTitle = buttonElement.title;
      
      buttonElement.textContent = '✅';
      buttonElement.title = 'Copied!';
      buttonElement.style.color = '#28a745';
      
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.title = originalTitle;
        buttonElement.style.color = '';
      }, 2000);
      
      const symbol = screenshot.symbol || 'CHART';
      this.addMessage('ai', `📋 **Screenshot Copied!**

✅ ${symbol} ${timeframe} screenshot copied to clipboard

💡 You can now paste (Ctrl+V) in Discord, Telegram, or any chat platform!`);
      
      console.log(`✅ Screenshot copied to clipboard successfully`);
      
    } catch (error) {
      console.error('❌ Failed to copy screenshot to clipboard:', error);
      
      // Visual feedback for error
      const originalText = buttonElement.textContent;
      const originalTitle = buttonElement.title;
      
      buttonElement.textContent = '❌';
      buttonElement.title = 'Copy failed';
      buttonElement.style.color = '#dc3545';
      
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.title = originalTitle;
        buttonElement.style.color = '';
      }, 2000);
      
      // Fallback: suggest manual download
      this.addMessage('ai', `❌ **Clipboard Copy Failed**

Error: ${error.message}

💡 **Try the download button (📥) instead!** You can save the image and share it manually.

💡 **Alternative:** Most browsers support copying images to clipboard, but it might be disabled.`);
    }
  }

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'just now';
    }
  }

  // Manage memory by cleaning up old timeframes when limit is reached
  manageTimeframeMemory(newTimeframe) {
    // Memory management: Remove oldest screenshots when limit exceeded, replace same timeframes
    // 30-minute auto-expiration REMOVED - screenshots persist until manually cleared or tab closed
    // Same-timeframe replacement PRESERVED - new screenshots replace existing ones for the same timeframe
    
    if (!this.screenshots) {
      this.screenshots = {};
    }
    
    const currentCount = Object.keys(this.screenshots).length;
    console.log(`📊 Memory check: ${currentCount}/${this.maxTimeframes} timeframes stored`);
    
    // If we're at capacity and adding a new timeframe, remove the oldest
    if (currentCount >= this.maxTimeframes && newTimeframe && !this.screenshots[newTimeframe]) {
      console.log(`🧹 CAPACITY REACHED: Removing oldest screenshot to make room for ${newTimeframe}`);
      
      // Find the oldest screenshot by timestamp
      let oldestTimeframe = null;
      let oldestTimestamp = Infinity;
      
      for (const [tf, data] of Object.entries(this.screenshots)) {
        if (data.timestamp < oldestTimestamp) {
          oldestTimestamp = data.timestamp;
          oldestTimeframe = tf;
        }
      }
      
      if (oldestTimeframe) {
        console.log(`🗑️ Removing oldest: ${oldestTimeframe} (${Math.floor((Date.now() - oldestTimestamp) / 1000 / 60)} minutes old)`);
        delete this.screenshots[oldestTimeframe];
        
        // If we were using the removed timeframe, clear active selection
        if (this.activeTimeframe === oldestTimeframe) {
          this.activeTimeframe = null;
        }
        
        this.updateGallery();
        
        // Save screenshots to storage after removing oldest
        this.saveScreenshots();
      }
    } else if (newTimeframe && this.screenshots[newTimeframe]) {
      console.log(`🔄 REPLACING existing ${newTimeframe} screenshot - no cleanup needed`);
    } else if (newTimeframe) {
      console.log(`✅ ADDING ${newTimeframe}: No cleanup needed (${currentCount}/${this.maxTimeframes})`);
    }
    
    // Note: 30-minute auto-expiration removed - screenshots persist until manually cleared or tab closed
  }

  checkExtensionHealth() {
    // Check extension context every 5 seconds and monitor memory
    this.memoryCheckInterval = setInterval(() => {
      if (!chrome.runtime || !chrome.runtime.id) {
        // Extension context invalidated - show warning
        const existingWarning = document.getElementById('extension-warning');
        if (!existingWarning) {
          const warning = document.createElement('div');
          warning.id = 'extension-warning';
          warning.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #ff6b35;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 1000000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          warning.innerHTML = `
            🔄 <strong>Extension Reloaded</strong><br>
            Please refresh this page to continue using Trading AI Assistant.
            <button onclick="location.reload()" style="margin-top:8px;padding:5px 10px;background:white;color:#ff6b35;border:none;border-radius:4px;cursor:pointer;">Refresh Page</button>
          `;
          document.body.appendChild(warning);
        }
      }
      
      // Monitor memory usage and cleanup if needed
      this.monitorMemoryUsage();
      
      // Update chat status and auto-expire old screenshots
      this.manageTimeframeMemory();
      this.updateChatStatus();
    }, 5000);
  }

  monitorMemoryUsage() {
    if (typeof window.performance !== 'undefined' && window.performance.memory) {
      const memoryInfo = window.performance.memory;
      const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
      const totalMB = memoryInfo.totalJSHeapSize / 1024 / 1024;
      const limitMB = memoryInfo.jsHeapSizeLimit / 1024 / 1024;
      
      // Log memory usage occasionally (every minute)
      if (Date.now() % 60000 < 5000) {
        console.log(`Trading AI Memory: ${usedMB.toFixed(1)}MB used of ${totalMB.toFixed(1)}MB (limit: ${limitMB.toFixed(1)}MB)`);
      }
      
      // Emergency cleanup if memory usage is high (>80% of limit)
      if (usedMB > limitMB * 0.8) {
        console.warn('Trading AI: High memory usage detected, performing emergency cleanup');
        this.emergencyMemoryCleanup();
      }
    }
    
    // Clean up old messages periodically
    if (this.messageCount > this.maxMessages) {
      this.cleanupOldMessages();
    }
  }

  emergencyMemoryCleanup() {
    // Only run if extension is fully initialized
    if (!this.isInitialized) {
      console.log('Trading AI: Extension not initialized, skipping emergency cleanup');
      return;
    }
    
    // Clear screenshots immediately to free large memory
    if (Object.keys(this.screenshots).length > 0) {
      console.log('Emergency: Clearing all screenshots to free memory');
      this.screenshots = {};
      this.activeTimeframe = null;
    }
    
    // Aggressively clean up messages
    const messagesContainer = document.getElementById('chat-messages');
    
    // Check if messagesContainer exists before accessing children
    if (!messagesContainer) {
      console.warn('Messages container not found during emergency cleanup, skipping message cleanup');
    } else {
      const messages = messagesContainer.children;
      
      // Keep only last 10 messages in emergency
      while (messages.length > 10) {
        messagesContainer.removeChild(messages[0]);
        this.messageCount--;
      }
    }
    
    // Clear conversation history
    this.conversationHistory.length = 0;
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    // Show warning to user
    this.addMessage('ai', '⚠️ Memory cleanup performed. Screenshot cleared to prevent browser slowdown.');
  }

  createChatInterface() {
    if (document.getElementById('trading-ai-chat')) {
      console.log('Chat interface already exists');
      return;
    }

    const chatContainer = document.createElement('div');
    chatContainer.id = 'trading-ai-chat';
    chatContainer.className = 'trading-ai-chat-container';

    chatContainer.innerHTML = `
      <div class="chat-header" id="chat-header">
        <div class="drag-handle">⋮⋮</div>
        <div class="header-content">
          <h3>🤖 Trading AI</h3>
          <div class="current-provider-display" id="provider-status">Loading...</div>
        </div>
        <div class="header-controls">
          <button id="settings-btn" class="settings-btn" title="Settings">⚙️</button>
          <button id="chat-toggle" class="chat-toggle" title="Expand chat">+</button>
        </div>
      </div>
      
      <div class="chat-content" id="chat-content">
        <div class="chat-status" id="chat-status">
          <span id="status-text">Loading AI provider...</span>
          <div class="status-buttons">
            <button id="clear-history" class="clear-btn" title="Clear chat history">🗑️</button>
            <button id="clear-screenshot" class="clear-btn" title="Clear screenshot">×</button>
          </div>
        </div>
        
        <div class="chat-messages" id="chat-messages"></div>
        
        <div class="chat-controls">
          <div class="analyze-container">
            <button id="screenshot-btn" class="screenshot-btn">📸 Analyze Current Chart</button>
            <div style="text-align: center; margin-top: 8px; font-size: 11px; color: #888; line-height: 1.3;">
              💡 Timeframe is auto-detected from TradingView.<br>
              Select your desired interval in TradingView first!
            </div>
          </div>
          
          <div class="input-container">
            <input type="text" id="chat-input" placeholder="Ask about the chart..." />
            <button id="send-btn" class="send-btn">Send</button>
          </div>
        </div>
        
        <div class="screenshot-gallery" id="screenshot-gallery" style="display: none;">
          <div class="gallery-header" id="gallery-header">
            <span class="gallery-title">📸 Stored Screenshots (0/4)</span>
            <button id="gallery-toggle" class="gallery-toggle">▼</button>
          </div>
          <div class="gallery-content" id="gallery-content">
            <div class="gallery-empty" id="gallery-empty">
              No screenshots stored. Take a screenshot to get started!
            </div>
            <div class="gallery-items" id="gallery-items"></div>
            <div class="gallery-actions" id="gallery-actions" style="display: none;">
              <button id="compare-all-btn" class="compare-all-btn">📊 Compare All Timeframes</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="resize-handle" id="resize-handle">
        <div class="resize-grip">⋯</div>
      </div>
    `;

    // Add settings modal HTML
    const settingsModal = document.createElement('div');
    settingsModal.id = 'settings-modal';
    settingsModal.className = 'settings-modal';
    settingsModal.style.display = 'none';
    
    settingsModal.innerHTML = `
      <div class="settings-modal-content">
        <div class="settings-header">
          <h2>⚙️ Settings</h2>
          <button id="close-settings" class="close-settings">✕</button>
        </div>
        
        <div class="settings-body">
          <div class="current-selection">
            <h3>Current Provider</h3>
            <div class="provider-selector">
              <select id="active-provider-select">
                <option value="openai">🧠 OpenAI</option>
                <option value="grok">🚀 Grok (xAI)</option>
              </select>
            </div>
          </div>

          <div class="provider-config">
            <div class="provider-section" id="openai-section">
              <div class="provider-header">
                <div class="provider-info">
                  <span class="provider-icon">🧠</span>
                  <span class="provider-name">OpenAI</span>
                </div>
                <label class="provider-toggle">
                  <input type="checkbox" id="openai-enabled" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="provider-settings">
                <div class="model-selection">
                  <label class="model-label">Model:</label>
                  <select id="openai-model-select">
                    <option value="gpt-4o">GPT-4o (Recommended)</option>
                  </select>
                </div>
                
                <div class="api-key-section">
                  <label>API Key:</label>
                  <div class="key-input-group">
                    <input type="password" id="openai-api-key" placeholder="sk-..." />
                    <button id="test-openai" class="test-btn">Test</button>
                  </div>
                  <div class="key-status" id="openai-status"></div>
                </div>
              </div>
            </div>

            <div class="provider-section" id="grok-section">
              <div class="provider-header">
                <div class="provider-info">
                  <span class="provider-icon">🚀</span>
                  <span class="provider-name">Grok (xAI)</span>
                </div>
                <label class="provider-toggle">
                  <input type="checkbox" id="grok-enabled">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="provider-settings">
                <div class="model-selection">
                  <label class="model-label">Model:</label>
                  <select id="grok-model-select">
                    <option value="grok-4">Grok-4 (Recommended)</option>
                  </select>
                </div>
                
                <div class="api-key-section">
                  <label>API Key:</label>
                  <div class="key-input-group">
                    <input type="password" id="grok-api-key" placeholder="xai-..." />
                    <button id="test-grok" class="test-btn">Test</button>
                  </div>
                  <div class="key-status" id="grok-status"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="screenshot-settings-section">
            <h3>📸 Screenshot Quality</h3>
            <div class="quality-config">
              <div class="quality-selection">
                <label class="quality-label">Quality Level:</label>
                <select id="quality-select">
                  <option value="ultra">🔥 Ultra (up to 1MB, 2560x1440)</option>
                  <option value="high">⚡ High (up to 800KB, 1920x1080) - Default</option>
                  <option value="medium">📊 Medium (up to 500KB, 1280x720)</option>
                </select>
              </div>
              
              <div class="quality-info" id="quality-info">
                <div class="quality-preview">
                  <strong>Current Quality: </strong><span id="current-quality-display">High</span>
                  <div class="quality-details" id="quality-details">
                    Resolution: 1920x1080 • Format: PNG • Up to: 800KB
                  </div>
                </div>
              </div>
              
              <div class="quality-description">
                <p style="font-size: 12px; color: #888; margin: 8px 0;">
                  💡 <strong>Ultra:</strong> Best quality (up to 1MB) - Maximum detail for complex charts<br>
                  ⚡ <strong>High:</strong> Great balance (up to 800KB) - Recommended for most use<br>
                  📊 <strong>Medium:</strong> Good quality (up to 500KB) - Faster uploads
                </p>
              </div>
            </div>
          </div>

          <div class="settings-footer">
            <div class="api-key-help">
              <h4>🔑 Getting API Keys</h4>
              <p style="font-size: 12px; color: #888; margin-bottom: 12px;">
                🚀 Currently showing the best vision models. More models will be added soon for advanced users.
              </p>
              <div class="help-links">
                <a href="https://platform.openai.com/api-keys" target="_blank">
                  🧠 Get OpenAI API Key
                </a>
                <a href="https://console.x.ai/" target="_blank">
                  🚀 Get Grok API Key
                </a>
              </div>
            </div>
            
            <div class="settings-actions">
              <button id="save-settings" class="save-btn">💾 Save Settings</button>
              <button id="cancel-settings" class="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Store reference to chat container
    this.chatContainer = chatContainer;
    
    document.body.appendChild(chatContainer);
    document.body.appendChild(settingsModal);

    // Ensure DOM elements are ready before setting up listeners
    setTimeout(() => {
      console.log('🔧 Setting up event listeners after DOM ready...');
      window.tradingAIDebug.domReady = true;
      this.setupEventListeners();
      this.setupSettingsModal();
      this.loadProviderSettings();
      this.loadSettingsIntoModal();
      this.updateProviderDisplay();
      
      // Extra verification that button works
      this.verifyButtonSetup();
      
      // Add visual indicator that extension loaded
      this.addLoadIndicator();
      
      // Final backup: Force attach click listener with document query
      this.forceAttachToggleListener();
      
      // Mark initialization as complete
      this.isInitialized = true;
      console.log('✅ TradingAIAssistant fully initialized');
    }, 500);
    
    // Add debugging info
    console.log('🎯 Chat interface created, adding global debug function...');
    
    // Add global debug functions for testing
    window.debugToggleChat = () => {
      console.log('🧪 Manual toggle test...');
      this.toggleChat();
    };
    
    window.debugClickButton = () => {
      console.log('🧪 Manual button click test...');
      const btn = document.getElementById('chat-toggle');
      if (btn) {
        console.log('📋 Button found, simulating click...');
        btn.click();
      } else {
        console.log('❌ Button not found!');
      }
    };

    window.debugProviderToggle = (provider) => {
      console.log('🧪 Manual provider toggle test...');
      const toggle = document.getElementById(`${provider}-enabled`);
      if (toggle) {
        console.log(`📋 ${provider} toggle found, current state: ${toggle.checked}`);
        toggle.click();
        console.log(`📋 ${provider} toggle new state: ${toggle.checked}`);
      } else {
        console.log(`❌ ${provider} toggle not found!`);
      }
    };
    
    window.debugSaveSettings = () => {
      console.log('🧪 Manual save settings test...');
      this.saveSettingsFromModal();
    };

    console.log('💡 Debug commands:');
    console.log('  debugToggleChat() - Direct function call');
    console.log('  debugClickButton() - Simulate button click');
    console.log('  debugProviderToggle("openai") - Test OpenAI toggle');
    console.log('  debugProviderToggle("grok") - Test Grok toggle');
    console.log('  debugSaveSettings() - Test save validation');
  }

  verifyButtonSetup() {
    console.log('🔍 Verifying button setup...');
    
    const toggle = document.getElementById('chat-toggle');
    const chatContainer = document.getElementById('trading-ai-chat');
    
    console.log('📋 Button verification:');
    console.log('  Toggle button exists:', !!toggle);
    console.log('  Chat container exists:', !!chatContainer);
    
    if (toggle) {
      console.log('  Button text:', toggle.textContent);
      console.log('  Button classes:', toggle.className);
      console.log('  Button parent:', toggle.parentElement?.tagName);
      
      // Try to manually add the event listener again as backup
      console.log('🔧 Adding backup event listener...');
      toggle.addEventListener('click', () => {
        console.log('🎯 BACKUP LISTENER: Toggle clicked!');
        this.toggleChat();
      });
      
      console.log('✅ Backup event listener added');
    } else {
      console.error('❌ Toggle button not found in DOM!');
      console.log('Available buttons:', Array.from(document.querySelectorAll('button')).map(b => b.id || b.className));
    }
  }

  addLoadIndicator() {
     console.log('🎯 Adding load indicator...');
     
     // Add a temporary visual indicator 
     const indicator = document.createElement('div');
     indicator.style.cssText = `
       position: fixed;
       top: 10px;
       right: 10px;
       background: #00d4ff;
       color: white;
       padding: 8px 12px;
       border-radius: 4px;
       font-size: 12px;
       z-index: 99999;
       font-family: Arial, sans-serif;
     `;
     indicator.textContent = '🤖 Trading AI Loaded';
     document.body.appendChild(indicator);
     
     // Remove after 3 seconds
     setTimeout(() => {
       if (indicator.parentNode) {
         indicator.remove();
       }
     }, 3000);
     
     console.log('✅ Load indicator added');
  }

  forceAttachToggleListener() {
     console.log('🆘 FORCE: Attempting to attach toggle listener with all methods...');
     
     // Method 1: Query selector
     const toggle1 = document.querySelector('#chat-toggle');
     if (toggle1) {
       console.log('🔧 FORCE: Found toggle with querySelector, attaching listener...');
       toggle1.addEventListener('click', (e) => {
         console.log('🎯 FORCE LISTENER: Click detected via querySelector!');
         e.preventDefault();
         e.stopPropagation();
         this.toggleChat();
       });
     }
     
     // Method 2: Query all buttons and find by text
     const allButtons = document.querySelectorAll('button');
     for (let btn of allButtons) {
       if (btn.textContent === '+' || btn.textContent === '−') {
         console.log('🔧 FORCE: Found toggle by text content, attaching listener...');
         btn.addEventListener('click', (e) => {
           console.log('🎯 FORCE LISTENER: Click detected via text search!');
           e.preventDefault();
           e.stopPropagation();
           this.toggleChat();
         });
         break;
       }
     }
     
     // Method 3: Event delegation on parent
     const header = document.querySelector('.chat-header');
     if (header) {
       console.log('🔧 FORCE: Setting up event delegation on header...');
       header.addEventListener('click', (e) => {
         if (e.target.textContent === '+' || e.target.textContent === '−') {
           console.log('🎯 FORCE LISTENER: Click detected via delegation!');
           e.preventDefault();
           e.stopPropagation();
           this.toggleChat();
         }
       });
     }
     
     console.log('✅ FORCE: All backup listeners attached');
  }
  
    // Helper method for safe event listener attachment
  safeAddEventListener(elementId, event, handler) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener(event, handler);
      console.log(`✅ Event listener attached: ${elementId} -> ${event}`);
    } else {
      console.warn(`❌ Element ${elementId} not found, skipping event listener`);
    }
  }

  setupEventListeners() {
    console.log('🔧 setupEventListeners called');
    
    // Debug: Check what elements exist
    const elements = [
      'settings-btn', 'chat-toggle', 'screenshot-btn', 'send-btn', 
      'chat-input', 'compare-all-btn', 'clear-screenshot', 'gallery-toggle'
    ];
    
    console.log('🔍 Element availability:');
    elements.forEach(id => {
      const el = document.getElementById(id);
      console.log(`  ${id}: ${el ? '✅ Found' : '❌ Not found'}`);
    });
    
    // Settings button in header
    this.safeAddEventListener('settings-btn', 'click', () => {
      this.openSettingsModal();
    });

    // Chat toggle button - CRITICAL, try multiple approaches
    this.safeAddEventListener('chat-toggle', 'click', () => {
      console.log('🎯 SAFE LISTENER: Toggle clicked!');
      this.toggleChat();
    });
    
    // Direct backup approach for chat toggle
    const chatToggle = document.getElementById('chat-toggle');
    if (chatToggle) {
      console.log('🔧 Adding DIRECT event listener to chat-toggle');
      chatToggle.onclick = () => {
        console.log('🎯 DIRECT ONCLICK: Toggle clicked!');
        this.toggleChat();
      };
      
      // Additional addEventListener for redundancy
      chatToggle.addEventListener('click', (e) => {
        console.log('🎯 ADDITIONAL LISTENER: Toggle clicked!');
        e.preventDefault();
        e.stopPropagation();
        this.toggleChat();
      });
      
    } else {
      console.error('❌ CRITICAL: chat-toggle button not found for direct listener!');
      
      // Emergency fallback - try to find the button with a slight delay
      setTimeout(() => {
        const delayedToggle = document.getElementById('chat-toggle');
        if (delayedToggle) {
          console.log('🔧 DELAYED: Found chat-toggle button, adding listener');
          delayedToggle.onclick = () => {
            console.log('🎯 DELAYED ONCLICK: Toggle clicked!');
            this.toggleChat();
          };
        } else {
          console.error('❌ EMERGENCY: Still cannot find chat-toggle button after delay!');
        }
      }, 100);
    }

    // Screenshot button
    this.safeAddEventListener('screenshot-btn', 'click', () => {
      this.captureAndAnalyze();
    });

    // Send button and enter key
    this.safeAddEventListener('send-btn', 'click', () => {
      this.sendMessage();
    });

    this.safeAddEventListener('chat-input', 'keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });

    // Compare all button
    this.safeAddEventListener('compare-all-btn', 'click', () => {
      this.enableMultiTimeframeMode();
    });

    // Clear screenshot button
    this.safeAddEventListener('clear-screenshot', 'click', () => {
      this.clearScreenshot();
    });

    // Clear chat history button
    this.safeAddEventListener('clear-history', 'click', () => {
      if (confirm('Clear all chat history? This cannot be undone.')) {
        this.clearChatHistory();
      }
    });

    // Gallery toggle
    this.safeAddEventListener('gallery-toggle', 'click', () => {
      this.toggleGallery();
    });

    // Listen for provider changes from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'providerChanged' || message.action === 'providerChanged') {
        this.handleProviderChange(message.provider, message.model);
      }
    });

    // Drag and resize functionality
    this.setupDragListeners();
    this.setupResizeListeners();
  }

  toggleChat() {
    console.log('🔄 toggleChat called');
    const chatContainer = document.getElementById('trading-ai-chat');
    const toggle = document.getElementById('chat-toggle');
    
    console.log('📋 Elements found:', {
      chatContainer: !!chatContainer,
      toggle: !!toggle,
      containerClasses: chatContainer?.className,
      toggleText: toggle?.textContent
    });
    
    // Debug: Show all available elements for comparison
    console.log('🔍 All elements with IDs in page:', 
      Array.from(document.querySelectorAll('[id]')).map(el => el.id).filter(id => id)
    );
    
    // Check if elements exist
    if (!chatContainer || !toggle) {
      console.warn('❌ Chat container or toggle button not found');
      console.log('Available buttons:', document.querySelectorAll('button'));
      return;
    }
    
    const isOpen = chatContainer.classList.contains('chat-open');
    console.log('📊 Current state:', { isOpen, classes: chatContainer.className });
    
    if (isOpen) {
      console.log('🔽 Closing chat...');
      chatContainer.classList.remove('chat-open');
      toggle.textContent = '+';
      toggle.title = 'Expand chat';
    } else {
      console.log('🔼 Opening chat...');
      chatContainer.classList.add('chat-open');
      toggle.textContent = '−';
      toggle.title = 'Minimize chat';
      
      // Add welcome message if this is the first time opening
      const messages = document.getElementById('chat-messages');
      if (messages && messages.children.length === 0) {
        this.addMessage('ai', `👋 **Welcome to Trading AI Assistant!**

🚀 **Quick Setup:** Click ⚙️ → Enter API key → Save → Start analyzing! 📸

📸 **Single Chart:** Click "📸 Analyze Chart" → Get instant AI analysis with auto-detected symbol & timeframe

🔄 **Multi-Timeframe:** Take screenshots on different timeframes → "Compare All Timeframes" for cross-analysis

💬 **Chat:** Ask follow-ups, select text to copy, persistent history across reloads

📤 **Share:** 📥 Download or 📋 Copy screenshots with smart naming (ETHUSD_4h_timestamp.png)

💡 **Pro Tips:** Multiple timeframes give better context • Clear charts for better analysis • Ask specific questions

Ready to analyze? Click **📸 Analyze Chart** to start! 🚀

💬 **Try these commands anytime:** Type "help", "status", "memory", or "commands" in the chat!

💾 **Auto-Management:** 50 message limit with automatic cleanup - just chat and analyze! 🚀`);
      }
    }
    
    console.log('✅ Toggle complete. New classes:', chatContainer.className);
  }

  // Auto-detect the current timeframe from TradingView's interface using stable selectors
  detectCurrentTimeframe() {
    try {
      console.log(`🔍 Starting timeframe detection using stable selectors (ID + semantic attributes)...`);
      
      // First, let's see what's available in the intervals section
      const intervalsContainer = document.querySelector('#header-toolbar-intervals');
      if (intervalsContainer) {
        console.log(`✅ Found intervals container:`, intervalsContainer);
        
        // Log all buttons in the container for debugging (using stable attributes only)
        const allButtons = intervalsContainer.querySelectorAll('button, [role="button"]');
        console.log(`📊 Found ${allButtons.length} interval buttons:`, 
          Array.from(allButtons).map(btn => {
            return {
              text: btn.textContent?.trim(),
              ariaLabel: btn.getAttribute('aria-label'),
              dataTooltip: btn.getAttribute('data-tooltip'),
              ariaHaspopup: btn.getAttribute('aria-haspopup'),
              tagName: btn.tagName.toLowerCase(),
              hasStableAttributes: !!(btn.getAttribute('aria-label') || btn.getAttribute('data-tooltip'))
            };
          })
        );
      } else {
        console.warn(`❌ Intervals container #header-toolbar-intervals not found`);
      }
      
      // Method 1: Use stable ID + semantic attributes (most reliable)
      const intervalButton = document.querySelector('#header-toolbar-intervals button[aria-haspopup="menu"]');
      if (intervalButton) {
        console.log(`🔍 Found interval menu button using stable selectors`);
        
        // Priority 1: aria-label (stable, semantic)
        const ariaLabel = intervalButton.getAttribute('aria-label');
        if (ariaLabel) {
          console.log(`🎯 Method 1a - Found from aria-label: "${ariaLabel}"`);
          return this.mapTimeframeText(ariaLabel);
        }
        
        // Priority 2: data-tooltip (stable)
        const dataTooltip = intervalButton.getAttribute('data-tooltip');
        if (dataTooltip) {
          console.log(`🎯 Method 1b - Found from data-tooltip: "${dataTooltip}"`);
          return this.mapTimeframeText(dataTooltip);
        }
        
        // Priority 3: button text content (fallback)
        const buttonText = intervalButton.textContent?.trim();
        if (buttonText) {
          console.log(`🎯 Method 1c - Found from button text: "${buttonText}"`);
          return this.mapTimeframeText(buttonText);
        }
      }
      
      // Method 2: Any button in intervals container using stable attributes
      const anyIntervalButton = document.querySelector('#header-toolbar-intervals button');
      if (anyIntervalButton) {
        console.log(`🔍 Found any button in intervals container`);
        
        // Use stable attributes only
        const ariaLabel = anyIntervalButton.getAttribute('aria-label');
        const dataTooltip = anyIntervalButton.getAttribute('data-tooltip');
        const timeframeText = ariaLabel || dataTooltip;
        
        if (timeframeText) {
          console.log(`🎯 Method 2 - Found from stable attributes: "${timeframeText}"`);
          return this.mapTimeframeText(timeframeText);
        }
      }
      
      // Method 3: Look for radio buttons with aria-checked (stable semantic attribute)
      const checkedInterval = document.querySelector('#header-toolbar-intervals [aria-checked="true"]');
      if (checkedInterval) {
        const ariaLabel = checkedInterval.getAttribute('aria-label');
        const dataTooltip = checkedInterval.getAttribute('data-tooltip');
        const timeframeText = ariaLabel || dataTooltip || checkedInterval.textContent?.trim();
        console.log(`🎯 Method 3 - Found aria-checked element: "${timeframeText}"`);
        return this.mapTimeframeText(timeframeText);
      }
      
      // Method 4: Look for pressed buttons (stable semantic attribute)
      const pressedButton = document.querySelector('#header-toolbar-intervals [aria-pressed="true"]');
      if (pressedButton) {
        const ariaLabel = pressedButton.getAttribute('aria-label');
        const dataTooltip = pressedButton.getAttribute('data-tooltip');
        const timeframeText = ariaLabel || dataTooltip || pressedButton.textContent?.trim();
        console.log(`🎯 Method 4 - Found aria-pressed button: "${timeframeText}"`);
        return this.mapTimeframeText(timeframeText);
      }
      
      console.warn('⚠️ Could not auto-detect timeframe from TradingView using stable selectors, using default 1h');
      console.log('💡 Tip: Ensure timeframe is selected in TradingView first, then analyze!');
      console.log('🔧 Detection uses stable selectors: #header-toolbar-intervals + aria-label/data-tooltip');
      return '1h';
      
    } catch (error) {
      console.error('❌ Error detecting timeframe:', error);
      return '1h'; // Safe fallback
    }
  }
  
  // Helper function to map TradingView timeframe text to our internal format
  mapTimeframeText(timeframeText) {
    if (!timeframeText) return '1h';
    
    // Clean up the text first
    const cleanText = timeframeText.trim();
    
    // Map TradingView display text to our internal format
    const timeframeMap = {
      // Direct value mappings (from .value-gwXludjS)
      '1m': '1m',
      '3m': '3m', 
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '45m': '45m',
      '1h': '1h',
      '2h': '2h',
      '3h': '3h',
      '4h': '4h',
      '1d': '1d',
      '3d': '3d',
      '1w': '1w',
      '1M': '1M',
      // Legacy formats
      '1': '1m',
      '3': '3m', 
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '45': '45m',
      '1H': '1h',
      '2H': '2h',
      '3H': '3h',
      '4H': '4h',
      '1D': '1d',
      '3D': '3d',
      '1W': '1w',
      // Aria-label/tooltip formats (from data-tooltip="4 hours")
      '1 minute': '1m',
      '3 minutes': '3m',
      '5 minutes': '5m',
      '15 minutes': '15m',
      '30 minutes': '30m',
      '45 minutes': '45m',
      '1 hour': '1h',
      '2 hours': '2h',
      '3 hours': '3h',
      '4 hours': '4h',
      '1 day': '1d',
      '3 days': '3d',
      '1 week': '1w',
      '1 month': '1M',
      // Alternative formats
      '1min': '1m',
      '5min': '5m',
      '15min': '15m',
      '30min': '30m',
      '1hour': '1h',
      '4hour': '4h',
      '1day': '1d',
      '1week': '1w',
      '1month': '1M'
    };
    
    const mappedTimeframe = timeframeMap[cleanText] || cleanText.toLowerCase();
    console.log(`📝 Mapped timeframe: "${cleanText}" → "${mappedTimeframe}"`);
    return mappedTimeframe;
  }

  async captureAndAnalyze() {
    if (this.isAnalyzing) return;

    const startTime = performance.now();
    console.log('⏱️ 🚀 Starting capture and analyze process...');

    this.isAnalyzing = true;
    const btn = document.getElementById('screenshot-btn');
    
    // Check if button exists
    if (!btn) {
      console.warn('Screenshot button not found');
      this.isAnalyzing = false;
      return;
    }
    
    // Auto-detect timeframe and symbol from TradingView
    const timeframe = this.detectCurrentTimeframe();
    const symbol = this.detectCurrentSymbol();
    
    console.log(`🎯 Using timeframe: ${timeframe}`);
    console.log(`🎯 Using symbol: ${symbol || 'Not detected'}`);
    const originalText = btn.textContent;
    btn.textContent = `📸 Analyzing ${symbol || 'chart'} ${timeframe}...`;
    btn.disabled = true;

    let response = null; // Declare response outside try block

    try {
      // Add user message
      this.addMessage('user', 'Analyze current chart');

      console.log('🤖 Screenshot button clicked');
      console.log('🤖 Sending message to background...');

      // Check if extension context is valid
      if (!chrome.runtime || !chrome.runtime.id) {
        throw new Error('Extension context invalidated. Please refresh the page.');
      }

      // Temporarily hide chat wingit d blocking the chart
      const chatContainer = document.getElementById('trading-ai-chat');
      const wasVisible = chatContainer && chatContainer.style.display !== 'none';
      
      if (chatContainer && wasVisible) {
        console.log('📸 Temporarily hiding chat window for clean screenshot');
        chatContainer.style.display = 'none';
        // Give browser time to render without the chat window
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      try {
        // Capture screenshot via background script
        response = await chrome.runtime.sendMessage({
          action: 'captureScreenshot'
        });
      } finally {
        // Always restore chat window visibility
        if (chatContainer && wasVisible) {
          console.log('📸 Restoring chat window visibility');
          chatContainer.style.display = '';
        }
      }

      console.log('🤖 Background response:', response);

      if (response && response.success) {
        console.log(`📸 Processing new screenshot for ${symbol || 'chart'} ${timeframe}. Current count: ${Object.keys(this.screenshots).length}`);
        
        // Balanced: Optimize image size for faster API calls while maintaining quality
        const optimizedImage = await this.optimizeImageSize(response.dataUrl);
        
        // Check if we need to free up memory before storing new screenshot
        this.manageTimeframeMemory(timeframe);
        
        // Send to AI for analysis with symbol and timeframe context
        const analysis = await this.analyzeWithAI(optimizedImage, timeframe, true, null, symbol);
        
        this.addMessage('ai', analysis);
        
        // Store screenshot with timeframe as key (for multi-timeframe comparison)
        this.screenshots[timeframe] = {
          image: optimizedImage,  // Use optimized image
          timestamp: Date.now(),
          symbol: symbol, // Store detected symbol
          conversation: [
            { role: 'user', content: `Analyze ${symbol || 'chart'} ${timeframe} timeframe`, provider: this.currentProvider },
            { role: 'assistant', content: analysis, provider: this.currentProvider }
          ]
        };
        
        console.log(`✅ Screenshot stored for ${timeframe} (${symbol || 'unknown symbol'}). New count: ${Object.keys(this.screenshots).length}`);
        
        // Save screenshots to storage
        this.saveScreenshots();
        
        // Verify final state
        const finalTimeframes = Object.keys(this.screenshots);
        console.log(`📊 FINAL STATE: ${finalTimeframes.length} screenshots stored: [${finalTimeframes.join(', ')}]`);
        
        if (finalTimeframes.length > this.maxTimeframes) {
          console.error(`❌ ERROR: Exceeded maximum timeframes! Have ${finalTimeframes.length}, max is ${this.maxTimeframes}`);
        }
        
        // Set as active timeframe for follow-up questions
        this.activeTimeframe = timeframe;
        
        // Enable chat input after first analysis
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (chatInput) chatInput.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        
        // Update UI to show screenshot is available for follow-up
        this.updateChatStatus();
        this.updateGallery();
      } else {
        this.addMessage('ai', '❌ Failed to capture screenshot. Please try again.');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Provide specific error messages with better error handling
      let errorMessage;
      const errorText = error?.message || error?.toString() || String(error);
      
      if (errorText.includes('Extension context invalidated')) {
        errorMessage = '🔄 Extension was reloaded. Please refresh this page and try again.';
      } else if (errorText.includes('Rate limit exceeded')) {
        errorMessage = '⏱️ API rate limit reached. Please wait 60 seconds and try again.';
      } else if (errorText.includes('Invalid API key')) {
        errorMessage = '🔑 Invalid API key. Please check your API key in the extension settings.';
      } else if (errorText.includes('Access denied')) {
        errorMessage = '🚫 API access denied. Make sure your API key has vision model access.';
      } else if (errorText.includes('API key')) {
        errorMessage = '🔑 Please check your API key in the extension settings.';
      } else if (errorText.includes('Failed to capture')) {
        errorMessage = '📸 Screenshot failed. Please grant permissions and try again.';
      } else if (errorText.includes('DOMException') || error instanceof DOMException) {
        errorMessage = '📸 Screenshot capture failed. Please try again or refresh the page.';
      } else {
        errorMessage = `❌ Analysis failed: ${errorText}`;
      }
      
      this.addMessage('ai', errorMessage);
      
      // Clear screenshot from memory even on error
      if (response && response.dataUrl) {
        response.dataUrl = null;
      }
    } finally {
      const endTime = performance.now();
      const totalTime = Math.round(endTime - startTime);
      console.log(`⏱️ 🏁 Complete capture and analyze process: ${totalTime}ms`);
      
      // Performance analysis
      if (totalTime > 10000) {
        console.warn(`⚠️ Slow response detected: ${totalTime}ms. Consider:
        1. Checking internet connection
        2. Using a faster AI model
        3. Reducing image quality`);
      } else if (totalTime > 5000) {
        console.log(`ℹ️ Response time: ${totalTime}ms (acceptable but could be faster)`);
      } else {
        console.log(`✅ Fast response: ${totalTime}ms`);
      }
      
      this.isAnalyzing = false;
      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
  }

  async analyzeWithAI(imageData, timeframe = '1h', isInitialAnalysis = false, userMessage = null, symbol = null) {
    const startTime = performance.now();
    console.log(`⏱️ Starting AI analysis for ${timeframe}...`);
    
    const apiKey = await this.getStoredApiKey();
    if (!apiKey) {
      const providerConfig = this.getProviderConfig();
      throw new Error(`${providerConfig.name} API key not found. Please check your API key in the extension settings.`);
    }

    let messages;
    const isMultiTimeframe = Array.isArray(imageData);
    
    if (isInitialAnalysis) {
      if (isMultiTimeframe) {
        // This shouldn't happen in current flow, but handle it
        throw new Error('Multi-timeframe mode not supported for initial analysis');
      }
      
      // Initial chart analysis (single timeframe)
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this TradingView chart for **${symbol || 'the main symbol'} on ${timeframe} timeframe**. 

**🚨 CRITICAL SYMBOL IDENTIFICATION 🚨**
${symbol ? 
  `**YOU ARE ANALYZING: ${symbol} (detected from chart header)**` : 
  '**THE MAIN SYMBOL IS SHOWN IN THE CHART HEADER AT THE TOP CENTER OF THE SCREEN**'
}
**IGNORE ALL WATCHLISTS, SIDE PANELS, AND SYMBOL LISTS - THEY CONTAIN DIFFERENT SYMBOLS**
**ANALYZE ONLY THE LARGE CENTRAL CANDLESTICK CHART AND ITS HEADER SYMBOL**
**DO NOT ANALYZE ANY SYMBOLS FROM RIGHT-SIDE PANELS OR WATCHLISTS**

**FOCUS EXCLUSIVELY ON: ${symbol || 'the symbol shown in the main chart header'}**
**TIMEFRAME: ${timeframe}**
**IGNORE: All other symbols in watchlists, side panels, or additional charts**

Provide structured analysis covering:

**1. Price Action** - Current trend, key support/resistance levels
**2. Support/Resistance** - Specific price levels with reasoning  
**3. Technical Setup** - Visible indicators and signals
**4. Trading Opportunities** - Entry/exit points for ${timeframe}
**5. Risk Management** - Stop-loss and take-profit levels

Be specific with price levels and actionable. **IMPORTANT: Keep response under 500 words maximum. Be concise and focus only on the most critical insights.**`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData
              }
            }
          ]
        }
      ];
    } else {
      if (isMultiTimeframe) {
        // Multi-timeframe comparison analysis
        const timeframes = imageData.map(item => item.timeframe).sort().join(', ');
        
        const content = [
          {
            type: 'text',
            text: `**MULTI-TIMEFRAME ANALYSIS**

**🚨 CRITICAL SYMBOL IDENTIFICATION FOR ALL SCREENSHOTS 🚨**
${symbol ? 
  `**YOU ARE ANALYZING: ${symbol} (detected from chart headers)**
**ALL SCREENSHOTS SHOULD BE OF THE SAME SYMBOL: ${symbol}**` : 
  '**FOR EACH SCREENSHOT: THE MAIN SYMBOL IS IN THE CHART HEADER AT TOP CENTER**'
}
**IGNORE ALL WATCHLISTS, SIDE PANELS, AND SYMBOL LISTS IN EVERY SCREENSHOT**
**ANALYZE ONLY THE LARGE CENTRAL CANDLESTICK CHARTS AND THEIR HEADER SYMBOLS**
**DO NOT ANALYZE ANY SYMBOLS FROM RIGHT-SIDE PANELS OR WATCHLISTS IN ANY SCREENSHOT**

I'm providing you with screenshots from multiple TradingView timeframes for **${symbol || 'the main symbol'}**: **${timeframes}**

Please analyze ALL the provided timeframes comprehensively and focus on:

🔍 **Cross-Timeframe Analysis:**
• Compare trends across all timeframes - are they aligned or conflicting?
• Identify which timeframe shows the strongest/clearest signals
• How do support/resistance levels appear across different timeframes?

📊 **Market Structure:**
• What's the overall market bias when considering all timeframes?
• Are we in a trending or ranging market across timeframes?
• Which timeframe provides the best entry/exit timing?

⚖️ **Timeframe Harmony:**
• Do the timeframes confirm each other or show divergence?
• What does each timeframe suggest for position sizing and timing?
• Which conflicts should traders be aware of?

💡 **Trading Recommendations:**
• What's the best approach considering all timeframes?
• Provide specific entry/exit strategies that work across timeframes
• Risk management advice based on multi-timeframe view

**IMPORTANT: Keep response under 500 words maximum. Focus only on the most critical cross-timeframe insights and actionable recommendations.**

Here are the charts for analysis:`
          }
        ];

        // Add all timeframe images
        imageData.forEach(item => {
          content.push({
            type: 'text',
            text: `\n**${item.timeframe} Timeframe:**`
          });
          content.push({
            type: 'image_url',
            image_url: {
              url: item.image
            }
          });
        });

        messages = [
          {
            role: 'system',
            content: `Quick multi-timeframe analysis. Be very brief and focused. Keep response under 500 words maximum - only the most critical insights.`
          },
          {
            role: 'user',
            content: content
          }
        ];

        // Add user question
        messages.push({
          role: 'user',
          content: userMessage
        });

      } else {
        // Single timeframe follow-up - conversational mode
        messages = [
          {
            role: 'system',
            content: `You are a knowledgeable, friendly, and slightly humorous trading assistant. You're analyzing TradingView charts and chatting with traders. Your personality:

🎯 **Style**: Conversational, engaging, and fun (not overly formal or structured)
📈 **Expertise**: Deep trading knowledge but explain things in a relatable way  
😄 **Tone**: Enthusiastic about trading, use appropriate emojis, occasional trading humor
💡 **Approach**: Give practical advice like you're chatting with a fellow trader

For regular chat responses (not initial analysis), be natural and conversational. Use trading slang when appropriate, add personality, and make it enjoyable. Think like a knowledgeable friend who happens to be great at TA.

**IMPORTANT: Keep responses under 500 words maximum. Be very concise - answer the specific question directly without lengthy explanations.**`
          },
          {
            role: 'user',
            content: [
              {
                                  type: 'text',
                  text: `🚨 **SYMBOL IDENTIFICATION REMINDER** 🚨 Here is the TradingView chart we are discussing${symbol ? ` for **${symbol}**` : ''}. ${symbol ? `**YOU ARE ANALYZING: ${symbol}**` : '**The main symbol is in the chart header at top center.**'} Focus ONLY on the large central candlestick chart. IGNORE ALL watchlists, side panels, and symbol lists.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ];
        
        // Add conversation history for the active timeframe
        if (this.activeTimeframe && this.screenshots[this.activeTimeframe]) {
          messages = messages.concat(this.screenshots[this.activeTimeframe].conversation);
        }
        
        // Add current user question
        messages.push({
          role: 'user',
          content: userMessage
        });
      }
    }

    // Get provider-specific API configuration
    const apiConfig = this.getProviderConfig();
    const messagesPrepTime = performance.now();
    console.log(`⏱️ Messages prepared in: ${Math.round(messagesPrepTime - startTime)}ms`);
    
    // Calculate request size for performance monitoring
    const requestBody = JSON.stringify({
      model: apiConfig.model,
      messages: messages,
      max_tokens: 1000,  // Balanced: ~750 words - comprehensive but reliable
      temperature: 0.5  // Balanced: Good creativity with consistency
    });
    const requestSizeKB = Math.round(requestBody.length / 1024);
    console.log(`⏱️ Sending ${requestSizeKB}KB request to ${apiConfig.name} (${apiConfig.model})...`);
    console.log(`🎯 Balanced limits: max_tokens=1000 (~750 words) for comprehensive yet reliable responses`);
    console.log(`🔍 API Details:`, {
      endpoint: apiConfig.endpoint,
      model: apiConfig.model,
      provider: this.currentProvider,
      messageCount: messages.length
    });
    
    // Debug: Log the exact request being sent
    console.log(`🔍 Request Body Preview:`, JSON.stringify({
      model: apiConfig.model,
      messages: messages.slice(0, 1), // Just show first message structure
      max_tokens: 1000,
      temperature: 0.5
    }, null, 2));
    
    const apiStartTime = performance.now();
    
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Extended: 30 second timeout for larger responses
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    console.log(`🔍 Request Headers:`, requestHeaders);
    console.log(`🔍 Model supports vision:`, this.isVisionCapableModel(apiConfig.model, this.currentProvider));
    
    // Debug the image data format
    if (isInitialAnalysis && imageData) {
      console.log(`📸 Image data format check:`, {
        isDataUrl: imageData.startsWith('data:image/'),
        length: imageData.length,
        prefix: imageData.substring(0, 50)
      });
    }
    
    console.log(`🚀 Making ${apiConfig.name} API call... (If it fails, check console for detailed error info including billing/credit issues)`);
                  console.log(`📸 Note: Full page screenshot captured - AI has symbol and timeframe context`);
        console.log(`🛡️ Timeframe detection: ${timeframe} (stable selectors: #header-toolbar-intervals)`);
        console.log(`🎯 Symbol detection: ${symbol || 'not detected'} (stable selectors: #header-toolbar-symbol-search)`);
        console.log(`💡 AI prompt includes: ${symbol ? symbol + ' ' + timeframe : 'auto-detection instructions'}`);
    
    const response = await fetch(apiConfig.endpoint, {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const apiEndTime = performance.now();
    
    const apiResponseTime = Math.round(apiEndTime - apiStartTime);
    console.log(`⏱️ ${apiConfig.name} API responded in: ${apiResponseTime}ms`);

    if (!response.ok) {
      const providerName = apiConfig.name;
      let errorMessage;
      
      // Try to get the response body for debugging
      let responseBody = '';
      try {
        responseBody = await response.text();
        console.error(`🔥 ${providerName} API Error Response:`, responseBody);
      } catch (e) {
        console.error(`🔥 Could not read ${providerName} error response body`);
      }
      
      if (response.status === 429) {
        errorMessage = `Rate limit exceeded. Please wait a moment and try again, or check your ${providerName} credits.`;
      } else if (response.status === 401) {
        errorMessage = `Invalid API key. Please check your ${providerName} API key in the extension settings.`;
      } else if (response.status === 403) {
        errorMessage = `Access denied - likely no credits or billing issue. Check your ${providerName} billing dashboard.`;
        console.error(`💳 ${providerName} 403: Access denied during analysis - This usually means:`);
        console.error(`   • No credits/billing set up in your account`);
        console.error(`   • Exceeded spending limits`);
        console.error(`   • Account suspended or restricted`);
        if (providerName === 'OpenAI') {
          console.error(`   • Visit: https://platform.openai.com/account/billing`);
        } else if (providerName === 'Grok') {
          console.error(`   • Visit: https://console.x.ai/ or contact xAI support`);
        }
      } else if (response.status === 404) {
        errorMessage = `${providerName} model not found. Model "${apiConfig.model}" may not be available. Try a different vision-capable model.`;
      } else if (response.status === 400) {
        // Check if it's a vision-related error
        if (responseBody.includes('image') || responseBody.includes('vision') || responseBody.includes('multimodal')) {
          errorMessage = `Vision not supported. The model "${apiConfig.model}" may not support image analysis. Please check your API key and model settings.`;
        } else {
          errorMessage = `Bad request. ${responseBody.slice(0, 200)}`;
        }
      } else {
        errorMessage = `${providerName} API error: ${response.status}`;
        if (responseBody) {
          errorMessage += ` - ${responseBody.slice(0, 200)}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const parseStartTime = performance.now();
    const data = await response.json();
    const parseEndTime = performance.now();
    
    const parseTime = Math.round(parseEndTime - parseStartTime);
    const totalTime = Math.round(parseEndTime - startTime);
    
    console.log(`⏱️ Response parsed in: ${parseTime}ms`);
    console.log(`⏱️ Total AI analysis time: ${totalTime}ms`);
    console.log(`⏱️ Response length: ${data.choices[0].message.content.length} characters`);
    
    return data.choices[0].message.content;
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    
    // Check if input element exists
    if (!input) {
      console.warn('Chat input element not found');
      return;
    }
    
    const message = input.value.trim();
    
    if (!message) return;

    // Handle special commands that don't require screenshots
    const lowerMessage = message.toLowerCase();
    if (lowerMessage === 'help' || lowerMessage === '/help') {
      this.addMessage('ai', `🔧 **Quick Reference Commands:**

**📸 Screenshot Analysis:**
- Click "📸 Analyze Chart" for single analysis
- Take multiple screenshots → "Compare All Timeframes"

**📤 Share Screenshots:**
- 📥 Download button → Save as PNG
- 📋 Copy button → Paste in Discord/Telegram

**💬 Chat Tips:**
- Ask follow-up questions about screenshots
- Select text with mouse → Ctrl+C to copy
- **Persistent history** → Chat survives page reloads (24 hours)
- Click 🗑️ button to clear chat history anytime
- Type "memory" to check current usage (50 messages max)

**🎯 Pro Usage:**
- Use multiple timeframes (1h + 4h + 1d) for context
- Clear charts before screenshots for better analysis
- Screenshots auto-detect symbol and timeframe

Ready to analyze? Click **📸 Analyze Chart** to start! 🚀`);
      input.value = '';
      return;
    }

    // Handle other useful commands
    if (lowerMessage === 'status') {
      const providerConfig = this.getProviderConfig();
      const messagesContainer = document.getElementById('chat-messages');
      const messageCount = messagesContainer ? messagesContainer.querySelectorAll('.ai-message, .user-message').length : 0;
      
      this.addMessage('ai', `📊 **Current Status:**
- **Provider:** ${this.currentProvider} (${providerConfig.name})
- **Model:** ${providerConfig.model}
- **Quality:** ${this.currentQuality}
- **Screenshots:** ${Object.keys(this.screenshots).length}/4 stored
- **Messages:** ${messageCount}/${this.maxChatMessages} (auto-cleanup at limit)`);
      input.value = '';
      return;
    }

    if (lowerMessage === 'memory') {
      const messagesContainer = document.getElementById('chat-messages');
      const messageCount = messagesContainer ? messagesContainer.querySelectorAll('.ai-message, .user-message').length : 0;
      
      // Get stored symbols and timeframes
      const storedInfo = Object.keys(this.screenshots).map(tf => {
        const screenshot = this.screenshots[tf];
        return `${screenshot.symbol || 'Unknown'} (${tf})`;
      }).join(', ');
      
      this.addMessage('ai', `🧠 **Memory Status:**

📊 **Current Usage:**
- **Messages:** ${messageCount}/${this.maxChatMessages} stored
- **Screenshots:** ${Object.keys(this.screenshots).length}/4 timeframes stored
${storedInfo ? `- **Stored:** ${storedInfo}` : ''}

⚙️ **Auto-Management:**
- When messages exceed 50, oldest messages are automatically removed
- Screenshot limit is 4 timeframes (removes oldest when adding 5th)
- Persistent storage survives page reloads (24 hours)

✅ **Simple & Efficient** - No complex cleanup needed with these limits!

💡 **Manual Control:** Click 🗑️ button to clear everything anytime.`);
      input.value = '';
      return;
    }

    if (lowerMessage === 'commands' || lowerMessage === '/commands') {
      this.addMessage('ai', `🎛️ **Available Chat Commands:**
- **help** - Show complete usage guide
- **status** - Show current AI provider and settings
- **memory** - Show detailed storage usage analysis
- **commands** - Show this list

💬 After taking a screenshot, you can ask questions about the chart!`);
      input.value = '';
      return;
    }

    // Check if we have any screenshots to discuss
    if (Object.keys(this.screenshots).length === 0) {
      this.addMessage('ai', '📸 Please take a screenshot first by clicking "Analyze Chart" button.\n\n💡 **Tip:** Type "help" for usage guide anytime!');
      input.value = '';
      return;
    }

    // Auto-cleanup expired screenshots
    this.manageTimeframeMemory();
    
    input.value = '';
    this.addMessage('user', message);

    // Show loading state
    const loadingMessage = this.addMessage('ai', '🤔 Thinking...');
    
    try {
      let response;
      
      if (this.isMultiTimeframeMode) {
        // Multi-timeframe comparison mode
        const timeframes = Object.keys(this.screenshots);
        const allImages = timeframes.map(tf => ({
          timeframe: tf,
          image: this.screenshots[tf].image
        }));
        
        // Get symbol from most recent screenshot and store conversation there
        const recentTimeframe = timeframes.sort((a, b) => 
          this.screenshots[b].timestamp - this.screenshots[a].timestamp
        )[0];
        const symbol = this.screenshots[recentTimeframe]?.symbol;
        
        response = await this.analyzeWithAI(allImages, 'multi-timeframe', false, message, symbol);
        
        this.screenshots[recentTimeframe].conversation.push({
          role: 'user',
          content: `[Multi-TF] ${message}`,
          provider: this.currentProvider
        });
        this.screenshots[recentTimeframe].conversation.push({
          role: 'assistant',
          content: response,
          provider: this.currentProvider
        });
        
      } else {
        // Single timeframe mode
        if (!this.activeTimeframe || !this.screenshots[this.activeTimeframe]) {
          // No active timeframe, suggest available ones
          const availableTimeframes = Object.keys(this.screenshots);
          if (availableTimeframes.length > 0) {
            this.activeTimeframe = availableTimeframes[0]; // Use most recent
            this.addMessage('ai', `📸 Using ${this.activeTimeframe} timeframe for context. Available timeframes: ${availableTimeframes.join(', ')}`);
          } else {
            this.addMessage('ai', '📸 All screenshots have expired. Please take a new screenshot for analysis.');
            loadingMessage.remove();
            return;
          }
        }
        
        const activeScreenshot = this.screenshots[this.activeTimeframe];
        const symbol = activeScreenshot.symbol;
        response = await this.analyzeWithAI(activeScreenshot.image, this.activeTimeframe, false, message, symbol);
        
        // Update conversation history for this timeframe
        activeScreenshot.conversation.push({
          role: 'user',
          content: message,
          provider: this.currentProvider
        });
        activeScreenshot.conversation.push({
          role: 'assistant',
          content: response,
          provider: this.currentProvider
        });
        
        // Limit conversation history to save costs and memory
        if (activeScreenshot.conversation.length > this.maxConversationHistory) {
          this.compressTimeframeConversation(this.activeTimeframe);
        }
      }
      
      // Remove loading message and add real response
      loadingMessage.remove();
      this.addMessage('ai', response);
      
    } catch (error) {
      // Remove loading message and show error
      loadingMessage.remove();
      console.error('Follow-up analysis failed:', error);
      
      let errorMessage;
      if (error.message.includes('Rate limit exceeded')) {
        errorMessage = '⏱️ Rate limit reached. Please wait 60 seconds and try again.';
      } else if (error.message.includes('Invalid API key')) {
        errorMessage = '🔑 Invalid API key. Please check your OpenAI API key.';
      } else {
        errorMessage = `❌ Analysis failed: ${error.message}`;
      }
      
      this.addMessage('ai', errorMessage);
    }
  }

  // Chat history persistence functions
  async saveChatHistory() {
    try {
      const messagesContainer = document.getElementById('chat-messages');
      if (!messagesContainer) return;

      const messages = [];
      const messageElements = messagesContainer.querySelectorAll('.ai-message, .user-message');
      
      // Only save recent messages based on current limit
      const recentMessages = Array.from(messageElements).slice(-this.maxChatMessages);
      
      recentMessages.forEach(msgElement => {
        const isAI = msgElement.classList.contains('ai-message');
        const contentElement = msgElement.querySelector('.message-content');
        const timeElement = msgElement.querySelector('.message-time');
        
        if (contentElement) {
          // For AI messages, try to get original content with formatting, fallback to innerHTML for structured content
          let content;
          if (isAI) {
            // Check if element has original content stored, otherwise use innerHTML to preserve structure
            content = contentElement.dataset.originalContent || contentElement.innerHTML;
          } else {
            content = contentElement.textContent || contentElement.innerText;
          }
          

          
          messages.push({
            type: isAI ? 'ai' : 'user',
            content: content,
            timestamp: timeElement ? timeElement.textContent : new Date().toLocaleTimeString(),
            isFormatted: isAI && !!contentElement.dataset.originalContent
          });
        }
      });

      await chrome.storage.local.set({
        'chat_history': messages,
        'chat_history_timestamp': Date.now()
      });
      
      console.log(`💾 Saved ${messages.length} messages to chat history (max: ${this.maxChatMessages})`);
    } catch (error) {
      console.error('❌ Failed to save chat history:', error);
    }
  }

  async loadChatHistory() {
    try {
      const result = await chrome.storage.local.get(['chat_history', 'chat_history_timestamp']);
      
      if (!result.chat_history || result.chat_history.length === 0) {
        console.log('📝 No chat history found, starting fresh');
        return;
      }

      // Check if history is recent (within last 24 hours)
      const historyAge = Date.now() - (result.chat_history_timestamp || 0);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (historyAge > maxAge) {
        console.log('🗑️ Chat history expired, starting fresh');
        await this.clearStoredChatHistory();
        return;
      }

      const messagesContainer = document.getElementById('chat-messages');
      if (!messagesContainer) return;

      // Add history separator
      this.addHistorySeparator();

      // Restore messages
      for (const msg of result.chat_history) {
        this.restoreMessageToDOM(msg);
      }

      console.log(`📖 Restored ${result.chat_history.length} messages from chat history`);
      
      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
    } catch (error) {
      console.error('❌ Failed to load chat history:', error);
    }
  }

  addHistorySeparator() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const separator = document.createElement('div');
    separator.className = 'history-separator';
    separator.innerHTML = `
      <div class="separator-line"></div>
      <div class="separator-text">📖 Previous Session</div>
      <div class="separator-line"></div>
    `;
    
    messagesContainer.appendChild(separator);
  }

  restoreMessageToDOM(msg) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const { type, content, timestamp, isFormatted } = msg;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message restored-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Handle AI content restoration
    if (type === 'ai') {
      if (isFormatted) {
        // Original formatted content - reformat it
        contentDiv.innerHTML = this.formatAIResponse(content);
        contentDiv.dataset.originalContent = content;
      } else {
        // Already formatted HTML content - use as is
        contentDiv.innerHTML = content;
      }
    } else {
      contentDiv.textContent = content;
    }
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = timestamp;
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    
    // Add copy button for AI messages
    if (type === 'ai') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.title = 'Copy message';
      copyBtn.textContent = '📋';
      copyBtn.style.cssText = 'position: absolute; top: 6px; right: 6px;';
      messageDiv.appendChild(copyBtn);
      
      // Use original content for copying if available, otherwise use the content
      const copyContent = isFormatted ? content : (contentDiv.dataset.originalContent || content);
      this.setupCopyButton(copyBtn, copyContent);
    }
    
    messageDiv.style.position = 'relative';
    messageDiv.style.overflow = 'visible';
    
    messagesContainer.appendChild(messageDiv);
  }

  async clearStoredChatHistory() {
    try {
      await chrome.storage.local.remove(['chat_history', 'chat_history_timestamp']);
      console.log('🗑️ Chat history cleared from storage');
    } catch (error) {
      console.error('❌ Failed to clear chat history:', error);
    }
  }

  // Screenshot persistence functions
  async saveScreenshots() {
    try {
      if (Object.keys(this.screenshots).length === 0) {
        await chrome.storage.local.remove(['screenshots', 'screenshots_timestamp']);
        return;
      }

      await chrome.storage.local.set({
        'screenshots': this.screenshots,
        'screenshots_timestamp': Date.now(),
        'activeTimeframe': this.activeTimeframe
      });
      
      console.log(`💾 Saved ${Object.keys(this.screenshots).length} screenshots to storage (max: 4)`);
    } catch (error) {
      console.error('❌ Failed to save screenshots:', error);
    }
  }

  async loadScreenshots() {
    try {
      const result = await chrome.storage.local.get(['screenshots', 'screenshots_timestamp', 'activeTimeframe']);
      
      if (!result.screenshots || Object.keys(result.screenshots).length === 0) {
        console.log('📸 No screenshots found, starting fresh');
        return;
      }

      // Check if screenshots are recent (within last 24 hours)
      const screenshotsAge = Date.now() - (result.screenshots_timestamp || 0);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (screenshotsAge > maxAge) {
        console.log('🗑️ Screenshots expired, starting fresh');
        await this.clearStoredScreenshots();
        return;
      }

      this.screenshots = result.screenshots;
      this.activeTimeframe = result.activeTimeframe || null;
      
      console.log(`📸 Restored ${Object.keys(this.screenshots).length} screenshots from storage`);
      
      // Update gallery and status after loading
      this.updateGallery();
      this.updateChatStatus();
      
    } catch (error) {
      console.error('❌ Failed to load screenshots:', error);
    }
  }

  async clearStoredScreenshots() {
    try {
      await chrome.storage.local.remove(['screenshots', 'screenshots_timestamp', 'activeTimeframe']);
      console.log('🗑️ Screenshots cleared from storage');
    } catch (error) {
      console.error('❌ Failed to clear screenshots:', error);
    }
  }



  clearChatHistory() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
      this.clearStoredChatHistory();
      
      // Also clear screenshots when clearing chat history
      this.screenshots = {};
      this.activeTimeframe = null;
      this.clearStoredScreenshots();
      this.updateGallery();
      this.updateChatStatus();
      
      this.addMessage('ai', '🗑️ **Chat History & Screenshots Cleared**\n\nAll previous messages and screenshots have been deleted. Starting fresh! 🚀');
    }
  }

  addMessage(type, content) {
    const messagesContainer = document.getElementById('chat-messages');
    
    // Check if messagesContainer exists
    if (!messagesContainer) {
      console.warn('Messages container not found, cannot add message');
      return null;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    
    // Format markdown-like content for better readability
    let formattedContent = content;
    if (type === 'ai') {
      formattedContent = this.formatAIResponse(content);
    }
    
    // Handle large content with chunked DOM processing to prevent DOMException
    if (formattedContent.length > 3000) {
      console.log(`📄 Large content detected (${formattedContent.length} chars), using chunked processing`);
      return this.addLargeMessage(messageDiv, type, content, formattedContent, messagesContainer);
    }
    
    // Add copy button for AI messages
    const copyButton = type === 'ai' ? `
      <button class="copy-btn" title="Copy message" style="position: absolute; top: 6px; right: 6px;">
        📋
      </button>
    ` : '';
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    try {
      contentDiv.innerHTML = formattedContent;
      // Store original content for chat history persistence
      if (type === 'ai') {
        contentDiv.dataset.originalContent = content;
      }
    } catch (error) {
      console.warn('🔧 innerHTML failed, using textContent fallback:', error);
      contentDiv.textContent = content; // Fallback to plain text
      if (type === 'ai') {
        contentDiv.dataset.originalContent = content;
      }
    }
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString();
    
    fragment.appendChild(contentDiv);
    fragment.appendChild(timeDiv);
    
    // Add copy button for AI messages
    if (type === 'ai') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.title = 'Copy message';
      copyBtn.textContent = '📋';
      copyBtn.style.cssText = 'position: absolute; top: 6px; right: 6px;';
      fragment.appendChild(copyBtn);
    }
    
    messageDiv.appendChild(fragment);
    
    // Ensure messageDiv has proper positioning context
    messageDiv.style.position = 'relative';
    messageDiv.style.overflow = 'visible';

    // Add copy functionality to AI messages
    if (type === 'ai') {
      const copyBtn = messageDiv.querySelector('.copy-btn');
      if (copyBtn) {
        this.setupCopyButton(copyBtn, content);
      }
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    this.messageCount++;
    
    // Clean up old messages to prevent memory issues
    this.cleanupOldMessages();
    
    // Save chat history after adding new message
    this.saveChatHistory();
    
    return messageDiv; // Return element for manipulation (e.g., removing loading messages)
  }

  // Handle large messages with progressive DOM loading to prevent DOMException
  // This system processes responses >3KB in 1KB chunks to avoid DOM overload while maintaining formatting
  addLargeMessage(messageDiv, type, originalContent, formattedContent, messagesContainer) {
    console.log(`🔄 Processing large message with progressive loading...`);
    
    // Create basic structure first
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Store original content for chat history persistence
    if (type === 'ai') {
      contentDiv.dataset.originalContent = originalContent;
    }
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString();
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    
    // Add copy button for AI messages
    if (type === 'ai') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.title = 'Copy message';
      copyBtn.textContent = '📋';
      copyBtn.style.cssText = 'position: absolute; top: 6px; right: 6px;';
      messageDiv.appendChild(copyBtn);
      
      // Set up copy functionality
      this.setupCopyButton(copyBtn, originalContent);
    }
    
    messageDiv.style.position = 'relative';
    messageDiv.style.overflow = 'visible';
    
    // Add to DOM first
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Show loading state initially with progress indicator
    contentDiv.innerHTML = '🔄 Loading comprehensive response...<br><small style="color: #888;">Processing large content for optimal display</small>';
    
    // Process content in chunks to avoid DOM limitations
    setTimeout(() => {
      try {
        this.processLargeContentInChunks(contentDiv, formattedContent);
      } catch (error) {
        console.warn('🔧 Chunked processing failed, using plain text:', error);
        contentDiv.textContent = originalContent;
      }
    }, 50); // Small delay to allow DOM to stabilize
    
    this.messageCount++;
    this.cleanupOldMessages();
    
    // Save chat history after adding large message
    this.saveChatHistory();
    
    return messageDiv;
  }

  // Process large content in small chunks to prevent DOM overload
  processLargeContentInChunks(contentDiv, formattedContent) {
    const chunkSize = 1000; // Process 1KB at a time for maximum reliability
    const chunks = [];
    
    // Split content into manageable chunks
    for (let i = 0; i < formattedContent.length; i += chunkSize) {
      chunks.push(formattedContent.slice(i, i + chunkSize));
    }
    
    console.log(`📦 Split large content into ${chunks.length} chunks`);
    
    // Clear loading message
    contentDiv.innerHTML = '';
    
    // Process chunks progressively
    let currentChunk = 0;
    
    const processNextChunk = () => {
      if (currentChunk < chunks.length) {
        try {
          // Create a temporary container for this chunk
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = chunks[currentChunk];
          
          // Move all children from temp container to main content
          while (tempDiv.firstChild) {
            contentDiv.appendChild(tempDiv.firstChild);
          }
          
          currentChunk++;
          
          // Process next chunk after a tiny delay
          if (currentChunk < chunks.length) {
            setTimeout(processNextChunk, 5);
          } else {
            console.log('✅ Large content processing complete');
          }
        } catch (error) {
          console.error(`❌ Error processing chunk ${currentChunk}:`, error);
          // Fallback: append remaining content as text
          const remainingText = chunks.slice(currentChunk).join('');
          const textNode = document.createTextNode(remainingText);
          contentDiv.appendChild(textNode);
        }
      }
    };
    
    processNextChunk();
  }

  // Separate function to set up copy button functionality
  setupCopyButton(copyBtn, originalContent) {
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      console.log('🖱️ Copy button clicked');
      
      try {
        await navigator.clipboard.writeText(originalContent);
        
        // Success feedback
        const originalText = copyBtn.textContent;
        const originalTitle = copyBtn.title;
        
        copyBtn.textContent = '✅';
        copyBtn.title = 'Copied!';
        copyBtn.classList.add('copy-success');
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.title = originalTitle;
          copyBtn.classList.remove('copy-success');
        }, 2000);
        
        console.log('✅ Text copied successfully');
        
      } catch (err) {
        console.error('❌ Failed to copy text:', err);
        
        const originalText = copyBtn.textContent;
        const originalTitle = copyBtn.title;
        
        copyBtn.textContent = '❌';
        copyBtn.title = 'Copy failed!';
        copyBtn.classList.add('copy-error');
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.title = originalTitle;
          copyBtn.classList.remove('copy-error');
        }, 2000);
      }
    });
  }

  cleanupOldMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    
    // Check if messagesContainer exists before accessing children
    if (!messagesContainer) {
      console.warn('Messages container not found, skipping cleanup');
      return;
    }
    
    const messages = messagesContainer.children;
    const maxMessages = 25; // Reduced for better memory management with large responses
    
    // Keep only the last maxMessages messages in DOM
    while (messages.length > maxMessages) {
      const oldMessage = messages[0];
      
      // Clear large content before removal to help GC
      const contentEl = oldMessage.querySelector('.message-content');
      if (contentEl && contentEl.innerHTML.length > 3000) {
        console.log('🗑️ Clearing large message content before removal');
        contentEl.innerHTML = '';
      }
      
      messagesContainer.removeChild(oldMessage);
      this.messageCount--;
    }
    
    // Log cleanup for debugging
    if (messages.length >= maxMessages - 5) {
      console.log(`🧹 Message cleanup: ${messages.length}/${maxMessages} messages in DOM`);
    }
    
    // Force garbage collection hint (if available)
    if (window.gc) {
      setTimeout(() => window.gc(), 100);
    }
  }

  formatAIResponse(content) {
    return content
      // Convert ### headers to styled headers
      .replace(/###\s*(\d+)\.\s*\*\*(.*?)\*\*/g, '<div class="ai-section"><span class="ai-number">$1.</span> <span class="ai-header">$2</span></div>')
      // Convert **text** to bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert - bullet points to proper list items
      .replace(/^-\s*\*\*(.*?)\*\*:\s*(.*?)$/gm, '<div class="ai-bullet"><strong>$1:</strong> $2</div>')
      // Convert simple - bullet points
      .replace(/^-\s*(.*)$/gm, '<div class="ai-bullet">• $1</div>')
      // Convert line breaks to proper spacing
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  async loadProviderSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'ai_provider', 
        'openai_model', 
        'grok_model',
        'screenshot_quality'
      ]);
      
      this.currentProvider = result.ai_provider || 'openai';
      
      // Load screenshot quality setting
      this.currentQuality = result.screenshot_quality || 'high';
      console.log(`📸 Screenshot Quality: ${this.currentQuality}`);
      
      // Load models for both providers and ensure they support vision
      const openaiModel = result.openai_model || 'gpt-4o';
      const grokModel = result.grok_model || 'grok-4';
      
      // Ensure we're using vision-capable models
      if (!this.isVisionCapableModel(openaiModel, 'openai')) {
        console.warn(`⚠️ Model ${openaiModel} may not support vision, switching to gpt-4o`);
        this.providerSettings.openai.selectedModel = 'gpt-4o';
      } else {
        this.providerSettings.openai.selectedModel = openaiModel;
      }
      
      if (!this.isVisionCapableModel(grokModel, 'grok')) {
        console.warn(`⚠️ Model ${grokModel} may not support vision, switching to grok-4`);
        this.providerSettings.grok.selectedModel = 'grok-4';
      } else {
        this.providerSettings.grok.selectedModel = grokModel;
      }
      
      console.log(`🤖 Current AI Provider: ${this.currentProvider}`);
      console.log(`🎯 OpenAI Model: ${this.providerSettings.openai.selectedModel}`);
      console.log(`🎯 Grok Model: ${this.providerSettings.grok.selectedModel}`);
      
      // Update the provider display in the header and status
      this.updateProviderDisplay();
      this.updateChatStatus();
      
    } catch (error) {
      console.error('Failed to load provider settings:', error);
      this.currentProvider = 'openai'; // Fallback to OpenAI
      this.providerSettings.openai.selectedModel = 'gpt-4o'; // Fallback to best model
      this.updateProviderDisplay();
      this.updateChatStatus();
    }
  }

  isVisionCapableModel(model, provider) {
    const visionModels = {
      openai: ['gpt-4o'],
      grok: ['grok-4']
    };
    
    return visionModels[provider]?.includes(model) || false;
  }

  getProviderConfig() {
    const currentProviderSettings = this.providerSettings[this.currentProvider];
    
    const configs = {
      openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: currentProviderSettings?.selectedModel || 'gpt-4o',
        name: 'OpenAI'
      },
      grok: {
        endpoint: 'https://api.x.ai/v1/chat/completions',
        model: currentProviderSettings?.selectedModel || 'grok-4',
        name: 'Grok'
      }
    };
    
    return configs[this.currentProvider] || configs.openai;
  }

  async getStoredApiKey() {
    return new Promise((resolve) => {
      const storageKey = this.currentProvider === 'openai' ? 'openai_api_key' : 'grok_api_key';
      chrome.storage.sync.get([storageKey], (result) => {
        resolve(result[storageKey]);
      });
    });
  }

  setupDragListeners() {
    const header = document.getElementById('chat-header');
    
    // Check if header exists
    if (!header) {
      console.warn('Chat header element not found, skipping drag listeners');
      return;
    }
    
    // Prevent dragging when clicking on buttons
    const preventDrag = (e) => {
      if (e.target.closest('.header-controls')) {
        return true;
      }
      return false;
    };
    
    // Mouse events
    header.addEventListener('mousedown', (e) => {
      if (!preventDrag(e)) {
        this.startDrag(e);
      }
    });
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.stopDrag());
    
    // Touch events for mobile
    header.addEventListener('touchstart', (e) => {
      if (!preventDrag(e.touches[0])) {
        this.startDrag(e.touches[0]);
      }
    });
    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        this.drag(e.touches[0]);
      }
    });
    document.addEventListener('touchend', () => this.stopDrag());
  }

  startDrag(e) {
    this.isDragging = true;
    const rect = this.chatContainer.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    this.chatContainer.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }

  drag(e) {
    if (!this.isDragging) return;
    
    let x = e.clientX - this.dragOffset.x;
    let y = e.clientY - this.dragOffset.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - this.chatContainer.offsetWidth;
    const maxY = window.innerHeight - this.chatContainer.offsetHeight;
    
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
    
    this.chatContainer.style.left = x + 'px';
    this.chatContainer.style.top = y + 'px';
    this.chatContainer.style.right = 'auto';
  }

  stopDrag() {
    this.isDragging = false;
    this.chatContainer.style.cursor = '';
    document.body.style.userSelect = '';
  }

  setupResizeListeners() {
    const resizeHandle = document.getElementById('resize-handle');
    
    // Check if resize handle exists
    if (!resizeHandle) {
      console.warn('Resize handle element not found, skipping resize listeners');
      return;
    }
    
    // Mouse events
    resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
    document.addEventListener('mousemove', (e) => this.resize(e));
    document.addEventListener('mouseup', () => this.stopResize());
    
    // Touch events
    resizeHandle.addEventListener('touchstart', (e) => this.startResize(e.touches[0]));
    document.addEventListener('touchmove', (e) => {
      if (this.isResizing) {
        e.preventDefault();
        this.resize(e.touches[0]);
      }
    });
    document.addEventListener('touchend', () => this.stopResize());
  }

  setupPageCleanupHandlers() {
    // Clear screenshots on page refresh/navigation to prevent memory leaks
    window.addEventListener('beforeunload', () => {
      console.log('🧹 Page unloading (refresh/navigate) - clearing all screenshots to prevent memory leaks');
      this.clearAllScreenshots();
    });

    // Clear screenshots on page visibility change (tab switch, minimize)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('🧹 Page hidden (tab switch/minimize) - performing light cleanup');
        this.lightCleanup();
      }
    });

    // Clear screenshots when tab is closed or page is hidden
    window.addEventListener('pagehide', () => {
      console.log('🧹 Page hiding (tab close/back button) - clearing all screenshots to prevent memory leaks');
      this.clearAllScreenshots();
    });

    // Enhanced: Clear screenshots on browser close/extension reload
    window.addEventListener('unload', () => {
      console.log('🧹 Page unload event - clearing all screenshots');
      this.clearAllScreenshots();
    });

    // Clear screenshots on extension context invalidation
    const originalSendMessage = chrome.runtime.sendMessage;
    if (originalSendMessage) {
      chrome.runtime.sendMessage = (...args) => {
        if (!chrome.runtime || !chrome.runtime.id) {
          console.log('🧹 Extension context invalid - clearing all screenshots to prevent memory leaks');
          this.clearAllScreenshots();
          return;
        }
        return originalSendMessage.apply(chrome.runtime, args);
      };
    }

    console.log('✅ Comprehensive page cleanup handlers registered - screenshots will be cleared on tab close');
  }

  clearAllScreenshots() {
    if (!this.screenshots) return;
    
    console.log('🧹 Clearing all stored screenshots and conversation history from browser memory');
    
    const screenshotCount = Object.keys(this.screenshots).length;
    if (screenshotCount > 0) {
      console.log(`📊 Clearing ${screenshotCount} stored screenshots to prevent memory leaks`);
    }
    
    // Clear all screenshots from memory
    this.screenshots = {};
    this.activeTimeframe = null;
    
    // Update UI if extension is still active
    if (this.isInitialized) {
      this.updateChatStatus();
      this.updateGallery();
      
      // Add a temporary message to inform user (only if not closing tab)
      if (!document.hidden) {
        this.addMessage('ai', `🧹 **Screenshots Cleared**

All stored screenshots and conversation history have been cleared from browser memory.

📸 Ready for new analysis - screenshots now persist until manually cleared or tab closed (no more 30-minute auto-expiration).`);
      }
    }
    
    // Force garbage collection to free up memory
    this.forceGarbageCollection();
    
    console.log('✅ All screenshots cleared from browser memory');
  }

  // High Quality: Optimize image size while maintaining excellent detail for chart analysis
  optimizeImageSize(dataUrl) {
    const sizeKB = Math.round(dataUrl.length / 1024);
    console.log(`📸 Original image size: ${sizeKB}KB`);
    
    // Get current quality preset
    const preset = this.qualityPresets[this.currentQuality];
    console.log(`📸 Using quality preset: ${this.currentQuality} (${preset.maxWidth}x${preset.maxHeight})`);
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let { width, height } = img;
        
        // Only resize if image is larger than preset dimensions
        if (width > preset.maxWidth || height > preset.maxHeight) {
          const ratio = Math.min(preset.maxWidth / width, preset.maxHeight / height);
          width *= ratio;
          height *= ratio;
          console.log(`📸 Resizing from ${img.width}x${img.height} to ${Math.round(width)}x${Math.round(height)}`);
        } else {
          console.log(`📸 Keeping original size: ${width}x${height} (within ${this.currentQuality} preset limits)`);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Use high-quality canvas rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Choose format based on preset
        let finalDataUrl;
        let finalFormat;
        let finalSizeKB;
        
        if (preset.format === 'png') {
          // Use PNG for maximum quality
          finalDataUrl = canvas.toDataURL('image/png');
          finalFormat = 'PNG';
          finalSizeKB = Math.round(finalDataUrl.length / 1024);
        } else if (preset.format === 'jpeg') {
          // Use JPEG with specified quality
          finalDataUrl = canvas.toDataURL('image/jpeg', preset.jpegQuality);
          finalFormat = `JPEG (${Math.round(preset.jpegQuality * 100)}%)`;
          finalSizeKB = Math.round(finalDataUrl.length / 1024);
        } else {
          // Auto format: try PNG first, fallback to JPEG if too large
          const pngDataUrl = canvas.toDataURL('image/png');
          const pngSizeKB = Math.round(pngDataUrl.length / 1024);
          const maxSizeKB = preset.maxSizeMB * 1024;
          
          if (pngSizeKB <= maxSizeKB) {
            finalDataUrl = pngDataUrl;
            finalFormat = 'PNG (auto)';
            finalSizeKB = pngSizeKB;
          } else {
            finalDataUrl = canvas.toDataURL('image/jpeg', preset.jpegQuality);
            finalFormat = `JPEG (auto, ${Math.round(preset.jpegQuality * 100)}%)`;
            finalSizeKB = Math.round(finalDataUrl.length / 1024);
          }
        }
        
        console.log(`📸 Final image: ${finalSizeKB}KB ${finalFormat} (was ${sizeKB}KB)`);
        console.log(`📸 Quality: ${this.currentQuality} preset - Max: ${preset.maxSizeMB}MB`);
        
        resolve(finalDataUrl);
      };
      img.src = dataUrl;
    });
  }

  // Debug helper to check current screenshot state
  debugScreenshotState() {
    const timeframes = Object.keys(this.screenshots);
    console.log('🔍 DEBUG: Current Screenshot State');
    console.log(`📊 Count: ${timeframes.length}/${this.maxTimeframes}`);
    console.log(`📋 Timeframes: [${timeframes.join(', ')}]`);
    console.log(`🎯 Active: ${this.activeTimeframe || 'None'}`);
    
    timeframes.forEach(tf => {
      const age = Math.floor((Date.now() - this.screenshots[tf].timestamp) / 1000 / 60);
      console.log(`  - ${tf}: ${age} minutes old, ${this.screenshots[tf].conversation.length} messages`);
    });
    
    if (timeframes.length > this.maxTimeframes) {
      console.error(`❌ VIOLATION: Too many screenshots! ${timeframes.length} > ${this.maxTimeframes}`);
    }
    
    return {
      count: timeframes.length,
      maxAllowed: this.maxTimeframes,
      timeframes: timeframes,
      active: this.activeTimeframe
    };
  }

  async handleProviderChange(newProvider, newModel) {
    console.log(`🔄 Switching AI provider from ${this.currentProvider} to ${newProvider}`);
    this.currentProvider = newProvider;
    
    // Update model in provider settings if provided
    if (newModel) {
      this.providerSettings[newProvider].selectedModel = newModel;
    }
    
    // Update the provider display in the header
    this.updateProviderDisplay();
    
    // Update the chat status area
    this.updateChatStatus();
    
    // Get current provider config for display
    const providerConfig = this.getProviderConfig();
    const providerIcon = newProvider === 'openai' ? '🤖' : '🚀';
    
    this.addMessage('ai', `${providerIcon} **Switched to ${providerConfig.name}!**
    
**Model:** ${providerConfig.model}

Hey! I'm now running on ${providerConfig.name} with the ${providerConfig.model} model. Don't worry - I remember everything we've discussed! 

🧠 **Memory Intact:** All our previous conversations are still here, so we can pick up right where we left off. Let's keep trading! 🚀`);
  }

  startResize(e) {
    this.isResizing = true;
    this.startHeight = this.chatContainer.offsetHeight;
    this.startY = e.clientY;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
  }

  resize(e) {
    if (!this.isResizing) return;
    
    const deltaY = e.clientY - this.startY;
    let newHeight = this.startHeight + deltaY;
    
    // Constrain height
    const minHeight = 300;
    const maxHeight = window.innerHeight * 0.9;
    newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
    
    this.chatContainer.style.height = newHeight + 'px';
  }

  stopResize() {
    this.isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  updateChatStatus() {
    const statusText = document.getElementById('status-text');
    if (!statusText) return;
    
    const timeframes = Object.keys(this.screenshots);
    const providerIcon = this.currentProvider === 'openai' ? '🤖' : '🔥';
    const modelName = this.providerSettings[this.currentProvider].selectedModel;
    const qualityIcon = this.currentQuality === 'ultra' ? '🔥' : this.currentQuality === 'high' ? '⚡' : this.currentQuality === 'medium' ? '📊' : '🔧';
    
    if (timeframes.length === 0) {
      statusText.innerHTML = `${providerIcon} ${this.currentProvider.toUpperCase()} (${modelName}) - ${qualityIcon} ${this.currentQuality} quality - Ready!`;
      console.log(`📊 Status updated: ${this.currentProvider.toUpperCase()} (${modelName}) - Ready!`);
    } else if (this.isMultiTimeframeMode) {
      statusText.innerHTML = `${providerIcon} Compare Mode: ${timeframes.length} timeframes - ${qualityIcon} ${this.currentQuality} quality`;
      console.log(`📊 Status updated: ${this.currentProvider.toUpperCase()} (${modelName}) - Compare Mode`);
    } else if (this.activeTimeframe) {
      const conversation = this.screenshots[this.activeTimeframe].conversation;
      const exchanges = Math.floor(conversation.length / 2);
      statusText.innerHTML = `${providerIcon} ${this.activeTimeframe} timeframe - ${exchanges} exchanges - ${qualityIcon} ${this.currentQuality} quality`;
      console.log(`📊 Status updated: ${this.currentProvider.toUpperCase()} (${modelName}) - ${this.activeTimeframe} active`);
    } else {
      statusText.innerHTML = `${providerIcon} ${timeframes.length} timeframes stored - ${qualityIcon} ${this.currentQuality} quality`;
      console.log(`📊 Status updated: ${this.currentProvider.toUpperCase()} (${modelName}) - ${timeframes.length} timeframes`);
    }
  }

  // Method to change image quality preset
  setImageQuality(qualityLevel) {
    if (this.qualityPresets[qualityLevel]) {
      const oldQuality = this.currentQuality;
      this.currentQuality = qualityLevel;
      console.log(`📸 Image quality changed from ${oldQuality} to ${qualityLevel}`);
      
      // Update UI to show new quality
      this.updateChatStatus();
      
      // Show quality change message
      const preset = this.qualityPresets[qualityLevel];
      this.addMessage('ai', `📸 **Quality Changed to ${qualityLevel.toUpperCase()}**

**Settings:**
- Resolution: ${preset.maxWidth} x ${preset.maxHeight}
- Format: ${preset.format.toUpperCase()}
- Max Size: ${preset.maxSizeMB}MB
${preset.jpegQuality ? `- JPEG Quality: ${Math.round(preset.jpegQuality * 100)}%` : ''}

💡 **Next screenshots will use this quality level.**`);
    } else {
      console.error(`❌ Invalid quality level: ${qualityLevel}`);
      this.addMessage('ai', `❌ **Invalid Quality Level**

Available quality levels:
- **ultra**: 2560x1440, PNG, up to 1MB
- **high**: 1920x1080, PNG, up to 800KB (current)
- **medium**: 1280x720, auto format, up to 500KB

Use the settings menu to change quality.`);
    }
  }

  clearScreenshot() {
    // Clear all screenshots or just active timeframe
    if (this.activeTimeframe && this.screenshots[this.activeTimeframe]) {
      const timeframe = this.activeTimeframe;
      delete this.screenshots[timeframe];
      this.activeTimeframe = null;
      this.addMessage('ai', `🗑️ ${timeframe} screenshot cleared manually. Screenshots now persist until manually cleared or tab closed (no auto-expiration).`);
    } else {
      // Clear all screenshots
      this.screenshots = {};
      this.activeTimeframe = null;
      this.addMessage('ai', '🗑️ All screenshots cleared manually. Screenshots now persist until manually cleared or tab closed (no auto-expiration).');
    }
    
    // Update gallery UI after clearing screenshots
    this.updateGallery();
    this.updateChatStatus();
    
    // Save screenshots to storage after clearing
    this.saveScreenshots();
    
    // Force garbage collection if available
    this.forceGarbageCollection();
  }

  forceGarbageCollection() {
    // Request garbage collection (Chrome dev tools --enable-precise-memory-info)
    if (window.gc) {
      window.gc();
    }
    
    // Alternative: create temporary memory pressure to trigger GC
    if (typeof window.performance !== 'undefined' && window.performance.memory) {
      const memoryInfo = window.performance.memory;
      console.log(`Memory usage: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  openSettings() {
    const apiKey = prompt('Enter your OpenAI API Key:');
    if (apiKey) {
      chrome.storage.sync.set({ openai_api_key: apiKey }, () => {
        alert('API Key saved successfully!');
      });
    }
  }

  compressTimeframeConversation(timeframe) {
    // Smart compression for specific timeframe
    if (this.screenshots[timeframe] && this.screenshots[timeframe].conversation.length > this.maxConversationHistory) {
      const conversation = this.screenshots[timeframe].conversation;
      const firstAnalysis = conversation.slice(0, 2); // Original question + analysis
      const recentMessages = conversation.slice(-(this.maxConversationHistory - 2));
      
      // Create compressed summary if we're losing too much context
      if (conversation.length > this.maxConversationHistory + 4) {
        const summary = {
          role: 'assistant',
          content: `(Previous ${timeframe} discussion covered chart analysis, price levels, and trading signals)`
        };
        this.screenshots[timeframe].conversation = [...firstAnalysis, summary, ...recentMessages];
      } else {
        this.screenshots[timeframe].conversation = [...firstAnalysis, ...recentMessages];
      }
      
      console.log(`Trading AI: Compressed ${timeframe} conversation to ${this.screenshots[timeframe].conversation.length} messages`);
    }
  }

  compressConversationHistory() {
    // Legacy function - now compress all timeframes
    for (const timeframe of Object.keys(this.screenshots)) {
      this.compressTimeframeConversation(timeframe);
    }
  }

  lightCleanup() {
    // Light cleanup when page is hidden
    // Only run if extension is fully initialized
    if (!this.isInitialized) {
      console.log('Trading AI: Extension not initialized, skipping light cleanup');
      return;
    }
    
    // Compress conversations for all timeframes
    for (const timeframe of Object.keys(this.screenshots)) {
      if (this.screenshots[timeframe].conversation.length > 3) {
        this.screenshots[timeframe].conversation = this.screenshots[timeframe].conversation.slice(-3);
      }
    }
    
    // Clean up old messages
    this.cleanupOldMessages();
  }

  cleanup() {
    // Full cleanup on page unload
    console.log('Trading AI: Performing cleanup');
    
    // Clear memory intervals
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    // Clear screenshot data
    this.screenshots = {};
    this.activeTimeframe = null;
    
    // Remove DOM elements
    if (this.chatContainer && this.chatContainer.parentNode) {
      this.chatContainer.parentNode.removeChild(this.chatContainer);
    }
    
    // Clear references
    this.chatContainer = null;
    this.messages = null;
    
    // Force garbage collection if available
    this.forceGarbageCollection();
  }

  setupSettingsModal() {
    // Close settings modal
    this.safeAddEventListener('close-settings', 'click', () => {
      this.closeSettingsModal();
    });

    this.safeAddEventListener('cancel-settings', 'click', () => {
      this.closeSettingsModal();
    });

    // Save settings
    this.safeAddEventListener('save-settings', 'click', () => {
      this.saveSettingsFromModal();
    });

    // Provider toggles
    this.safeAddEventListener('openai-enabled', 'change', (e) => {
      this.handleProviderToggle('openai', e.target.checked);
    });

    this.safeAddEventListener('grok-enabled', 'change', (e) => {
      this.handleProviderToggle('grok', e.target.checked);
    });

    // Test buttons
    this.safeAddEventListener('test-openai', 'click', () => {
      this.testProviderConnection('openai');
    });

    this.safeAddEventListener('test-grok', 'click', () => {
      this.testProviderConnection('grok');
    });

    // Active provider selection
    this.safeAddEventListener('active-provider-select', 'change', (e) => {
      this.handleActiveProviderChange(e.target.value);
    });

    // Quality selection
    this.safeAddEventListener('quality-select', 'change', (e) => {
      this.handleQualityChange(e.target.value);
    });

    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('settings-modal');
      if (e.target === modal) {
        this.closeSettingsModal();
      }
    });
  }

  async loadSettingsIntoModal() {
    try {
      const settings = await chrome.storage.sync.get([
        'ai_provider', 'openai_api_key', 'grok_api_key',
        'openai_model', 'grok_model', 'openai_enabled', 'grok_enabled',
        'screenshot_quality'
      ]);

      // Set active provider - ensure it matches the currently enabled provider
      const activeProviderSelect = document.getElementById('active-provider-select');
      if (activeProviderSelect) {
        // Determine which provider should be active based on enabled state
        let activeProvider = settings.ai_provider || 'openai';
        
        // If stored provider doesn't match enabled state, correct it
        if (settings.grok_enabled === true && settings.openai_enabled !== true) {
          activeProvider = 'grok';
        } else if (settings.openai_enabled !== false && settings.grok_enabled !== true) {
          activeProvider = 'openai';
        }
        
        activeProviderSelect.value = activeProvider;
        console.log(`🔧 Active provider set to: ${activeProvider}`);
      }

      // Set OpenAI settings
      const openaiEnabled = document.getElementById('openai-enabled');
      const openaiModel = document.getElementById('openai-model-select');
      const openaiKey = document.getElementById('openai-api-key');
      
      if (openaiEnabled) openaiEnabled.checked = settings.openai_enabled !== false;
      if (openaiModel) openaiModel.value = settings.openai_model || 'gpt-4o';
      if (openaiKey && settings.openai_api_key) {
        openaiKey.value = settings.openai_api_key;
      }

      // Set Grok settings
      const grokEnabled = document.getElementById('grok-enabled');
      const grokModel = document.getElementById('grok-model-select');
      const grokKey = document.getElementById('grok-api-key');
      
      if (grokEnabled) grokEnabled.checked = settings.grok_enabled === true;
      if (grokModel) grokModel.value = settings.grok_model || 'grok-4';
      if (grokKey && settings.grok_api_key) {
        grokKey.value = settings.grok_api_key;
      }

      // Set screenshot quality settings
      const qualitySelect = document.getElementById('quality-select');
      const savedQuality = settings.screenshot_quality || this.currentQuality;
      
      if (qualitySelect) {
        qualitySelect.value = savedQuality;
        this.currentQuality = savedQuality;
        this.updateQualityPreview(savedQuality);
        console.log(`📸 Quality loaded: ${savedQuality}`);
      }

      // Update provider sections based on enabled state
      this.updateProviderSections();

    } catch (error) {
      console.error('Error loading settings into modal:', error);
    }
  }

  updateProviderSections() {
    const openaiEnabled = document.getElementById('openai-enabled')?.checked;
    const grokEnabled = document.getElementById('grok-enabled')?.checked;
    
    const openaiSection = document.getElementById('openai-section');
    const grokSection = document.getElementById('grok-section');
    
    if (openaiSection) {
      openaiSection.classList.toggle('disabled', !openaiEnabled);
    }
    
    if (grokSection) {
      grokSection.classList.toggle('disabled', !grokEnabled);
    }

    // Update active provider dropdown to only show enabled providers
    this.updateActiveProviderOptions();
  }

  updateActiveProviderOptions() {
    const openaiEnabled = document.getElementById('openai-enabled')?.checked;
    const grokEnabled = document.getElementById('grok-enabled')?.checked;
    const activeSelect = document.getElementById('active-provider-select');
    
    if (!activeSelect) return;

    // Clear and rebuild options
    activeSelect.innerHTML = '';
    
    if (openaiEnabled) {
      const option = document.createElement('option');
      option.value = 'openai';
      option.textContent = '🧠 OpenAI';
      activeSelect.appendChild(option);
    }
    
    if (grokEnabled) {
      const option = document.createElement('option');
      option.value = 'grok';
      option.textContent = '🚀 Grok (xAI)';
      activeSelect.appendChild(option);
    }

    // Set current provider if it's still available
    if (this.currentProvider) {
      const isCurrentAvailable = (this.currentProvider === 'openai' && openaiEnabled) || 
                                 (this.currentProvider === 'grok' && grokEnabled);
      
      if (isCurrentAvailable) {
        activeSelect.value = this.currentProvider;
      } else {
        // Switch to first available provider
        if (activeSelect.options.length > 0) {
          activeSelect.value = activeSelect.options[0].value;
        }
      }
    }
  }

  handleProviderToggle(provider, enabled) {
    console.log(`🔄 Provider toggle: ${provider} -> ${enabled}`);
    
    if (enabled) {
      // If enabling this provider, disable the other (only one active at a time)
      if (provider === 'openai') {
        const grokToggle = document.getElementById('grok-enabled');
        if (grokToggle) {
          grokToggle.checked = false;
          console.log('🔄 Disabled Grok when enabling OpenAI');
        }
      } else if (provider === 'grok') {
        const openaiToggle = document.getElementById('openai-enabled');
        if (openaiToggle) {
          openaiToggle.checked = false;
          console.log('🔄 Disabled OpenAI when enabling Grok');
        }
      }
    } else {
      // When disabling a provider, automatically enable the other one
      if (provider === 'openai') {
        const grokToggle = document.getElementById('grok-enabled');
        if (grokToggle) {
          grokToggle.checked = true;
          console.log('🔄 Auto-enabled Grok when disabling OpenAI');
        }
      } else if (provider === 'grok') {
        const openaiToggle = document.getElementById('openai-enabled');
        if (openaiToggle) {
          openaiToggle.checked = true;
          console.log('🔄 Auto-enabled OpenAI when disabling Grok');
        }
      }
    }

    this.updateProviderSections();
    console.log('✅ Provider toggle complete');
  }

  handleActiveProviderChange(newProvider) {
    // Update the display immediately in the modal
    this.updateProviderDisplay(newProvider);
  }

  handleQualityChange(qualityLevel) {
    // Update current quality
    this.currentQuality = qualityLevel;
    
    // Update the preview display
    this.updateQualityPreview(qualityLevel);
    
    // Update chat status to reflect the change
    this.updateChatStatus();
    
    console.log(`📸 Quality changed to ${qualityLevel} in settings`);
  }

  updateQualityPreview(qualityLevel) {
    const preset = this.qualityPresets[qualityLevel];
    const displayElement = document.getElementById('current-quality-display');
    const detailsElement = document.getElementById('quality-details');
    
    if (displayElement) {
      displayElement.textContent = qualityLevel.charAt(0).toUpperCase() + qualityLevel.slice(1);
    }
    
    if (detailsElement && preset) {
      const jpegInfo = preset.jpegQuality ? ` • JPEG Quality: ${Math.round(preset.jpegQuality * 100)}%` : '';
      detailsElement.textContent = `Resolution: ${preset.maxWidth}x${preset.maxHeight} • Format: ${preset.format.toUpperCase()} • Up to: ${preset.maxSizeKB}KB${jpegInfo}`;
    }
  }

  async saveSettingsFromModal() {
    try {
      const activeProvider = document.getElementById('active-provider-select')?.value;
      const openaiEnabled = document.getElementById('openai-enabled')?.checked;
      const grokEnabled = document.getElementById('grok-enabled')?.checked;
      const openaiModel = document.getElementById('openai-model-select')?.value;
      const grokModel = document.getElementById('grok-model-select')?.value;
      const openaiKey = document.getElementById('openai-api-key')?.value;
      const grokKey = document.getElementById('grok-api-key')?.value;
      const selectedQuality = document.getElementById('quality-select')?.value;

      // Validation: Check if the active provider has an API key
      if (activeProvider === 'openai' && (!openaiKey || !openaiKey.trim())) {
        this.showSettingsStatus('❌ OpenAI API key is required. Please enter your API key.', 'error');
        return;
      }
      
      if (activeProvider === 'grok' && (!grokKey || !grokKey.trim())) {
        this.showSettingsStatus('❌ Grok API key is required. Please enter your API key.', 'error');
        return;
      }

      const settings = {
        ai_provider: activeProvider,
        openai_enabled: openaiEnabled,
        grok_enabled: grokEnabled,
        openai_model: openaiModel,
        grok_model: grokModel,
        screenshot_quality: selectedQuality || this.currentQuality
      };

      // Only save keys if they're provided
      if (openaiKey && openaiKey.trim()) {
        settings.openai_api_key = openaiKey.trim();
      }
      if (grokKey && grokKey.trim()) {
        settings.grok_api_key = grokKey.trim();
      }

      await chrome.storage.sync.set(settings);

      // Store old quality before updating
      const oldQuality = this.currentQuality;
      
      // Update current instance to match the saved settings
      this.currentProvider = activeProvider;
      this.providerSettings[activeProvider].selectedModel = activeProvider === 'openai' ? openaiModel : grokModel;
      if (selectedQuality) {
        this.currentQuality = selectedQuality;
      }
      
      console.log(`🔧 Updated instance: ${this.currentProvider} with model ${this.providerSettings[activeProvider].selectedModel}`);

      this.updateProviderDisplay();
      this.updateChatStatus();  // Update status area with new provider
      
      // Show success message in settings modal
      this.showSettingsStatus('✅ Settings saved successfully!', 'success');
      
      // Only add chat message if quality was changed to inform user
      if (selectedQuality && selectedQuality !== oldQuality) {
        const preset = this.qualityPresets[selectedQuality];
        this.addMessage('ai', `📸 **Screenshot Quality Updated**

**New Quality:** ${selectedQuality.toUpperCase()}
**Resolution:** ${preset.maxWidth} x ${preset.maxHeight}
**Format:** ${preset.format.toUpperCase()}
**File Size:** Up to ${preset.maxSizeKB}KB

Next screenshots will use this quality level! 🚀`);
      }
      
      console.log(`✅ Settings saved successfully. Active provider: ${activeProvider}`);

      // Auto-close modal after short delay
      setTimeout(() => {
        this.closeSettingsModal();
      }, 1500);

    } catch (error) {
      console.error('Error saving settings:', error);
      this.showSettingsStatus('Error saving settings. Please try again.', 'error');
    }
  }

  async testProviderConnection(provider) {
    const keyInput = document.getElementById(`${provider}-api-key`);
    const statusDiv = document.getElementById(`${provider}-status`);
    const testBtn = document.getElementById(`test-${provider}`);
    
    if (!keyInput || !statusDiv || !testBtn) return;

    const apiKey = keyInput.value.trim();
    if (!apiKey) {
      this.showProviderStatus(provider, 'Please enter an API key first', 'error');
      return;
    }

    testBtn.textContent = 'Testing...';
    testBtn.disabled = true;
    
    console.log(`🧪 Testing ${provider.toUpperCase()} API connection... (Check console for detailed error info if it fails)`);
    console.log(`🔍 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

    try {
      if (provider === 'openai') {
        await this.testOpenAIConnection(apiKey);
        console.log(`✅ OpenAI API Test Successful: GPT-4 Vision available`);
        this.showProviderStatus(provider, '✅ API key valid and GPT-4 Vision available!', 'success');
      } else if (provider === 'grok') {
        await this.testGrokConnection(apiKey);
        console.log(`✅ Grok API Test Successful: Grok Vision available`);
        this.showProviderStatus(provider, '✅ API key valid and Grok Vision available!', 'success');
      }
    } catch (error) {
      console.error(`🔑 ${provider.toUpperCase()} API Test Failed:`, error);
      console.error(`📋 Error Details:`, {
        message: error.message,
        status: error.status || 'unknown',
        provider: provider,
        timestamp: new Date().toISOString()
      });
      this.showProviderStatus(provider, `❌ ${error.message}`, 'error');
    } finally {
      testBtn.textContent = 'Test';
      testBtn.disabled = false;
    }
  }

  async testOpenAIConnection(apiKey) {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage;
      let responseBody = '';
      
      // Try to get the response body for more details
      try {
        responseBody = await response.text();
        console.error(`🔥 OpenAI API Error Response Body:`, responseBody);
      } catch (e) {
        console.error(`🔥 Could not read OpenAI error response body`);
      }

      if (response.status === 401) {
        errorMessage = 'Invalid API key - check your OpenAI API key';
        console.error(`🔑 OpenAI 401: Invalid API key provided`);
      } else if (response.status === 403) {
        errorMessage = 'Access denied - likely no credits or billing issue. Check your OpenAI billing dashboard';
        console.error(`💳 OpenAI 403: Access denied - This usually means:`);
        console.error(`   • No credits/billing set up in OpenAI account`);
        console.error(`   • Exceeded spending limits`);
        console.error(`   • Account suspended or restricted`);
        console.error(`   • Visit: https://platform.openai.com/account/billing`);
      } else if (response.status === 429) {
        errorMessage = 'Rate limited - API key valid but quota exceeded';
        console.error(`⏱️ OpenAI 429: Rate limit exceeded - slow down requests`);
      } else if (response.status === 404) {
        errorMessage = 'API endpoint not found - service may be down';
        console.error(`🔍 OpenAI 404: API endpoint not found`);
      } else {
        errorMessage = `API error: ${response.status} - check console for details`;
        console.error(`❌ OpenAI ${response.status}: Unknown error`);
        console.error(`📄 Response body:`, responseBody.slice(0, 500));
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const hasVisionModel = data.data.some(model => 
      model.id.includes('gpt-4') && (model.id.includes('vision') || model.id === 'gpt-4o')
    );

    if (!hasVisionModel) {
      throw new Error('API key valid but GPT-4 Vision not available');
    }
  }

  async testGrokConnection(apiKey) {
    const response = await fetch('https://api.x.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage;
      let responseBody = '';
      
      // Try to get the response body for more details
      try {
        responseBody = await response.text();
        console.error(`🔥 Grok API Error Response Body:`, responseBody);
      } catch (e) {
        console.error(`🔥 Could not read Grok error response body`);
      }

      if (response.status === 401) {
        errorMessage = 'Invalid API key - check your xAI/Grok API key';
        console.error(`🔑 Grok 401: Invalid API key provided`);
      } else if (response.status === 403) {
        errorMessage = 'Access denied - likely no credits or billing issue. Check your xAI billing dashboard';
        console.error(`💳 Grok 403: Access denied - This usually means:`);
        console.error(`   • No credits/billing set up in xAI account`);
        console.error(`   • Exceeded spending limits`);
        console.error(`   • Account suspended or restricted`);
        console.error(`   • API access not enabled for your account`);
        console.error(`   • Visit: https://console.x.ai/ or contact xAI support`);
      } else if (response.status === 429) {
        errorMessage = 'Rate limited - API key valid but quota exceeded';
        console.error(`⏱️ Grok 429: Rate limit exceeded - slow down requests`);
      } else if (response.status === 404) {
        errorMessage = 'API endpoint not found - xAI service may be down';
        console.error(`🔍 Grok 404: API endpoint not found`);
      } else if (response.status === 502 || response.status === 503) {
        errorMessage = 'xAI service temporarily unavailable - try again later';
        console.error(`🚧 Grok ${response.status}: Service temporarily unavailable`);
      } else {
        errorMessage = `API error: ${response.status} - check console for details`;
        console.error(`❌ Grok ${response.status}: Unknown error`);
        console.error(`📄 Response body:`, responseBody.slice(0, 500));
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const hasVisionModel = data.data.some(model => 
      model.id.includes('vision') || model.id.includes('grok')
    );

    if (!hasVisionModel) {
      throw new Error('API key valid but Grok Vision not available');
    }
  }

  showProviderStatus(provider, message, type) {
    const statusDiv = document.getElementById(`${provider}-status`);
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `key-status ${type}`;
    }
  }

  showSettingsStatus(message, type) {
    // Create or update a status message in the settings footer
    let statusDiv = document.querySelector('.settings-status');
    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.className = 'settings-status';
      const footer = document.querySelector('.settings-footer');
      if (footer) {
        footer.insertBefore(statusDiv, footer.firstChild);
      }
    }
    
    statusDiv.textContent = message;
    statusDiv.className = `settings-status ${type}`;
    
    // Auto-clear after 5 seconds
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.remove();
      }
    }, 5000);
  }

  updateProviderDisplay(provider = null) {
    const currentProvider = provider || this.currentProvider;
    const providerConfig = this.getProviderConfig();
    const providerElement = document.getElementById('provider-status');
    
    if (providerElement && providerConfig) {
      // Better icons and formatting for each provider
      const icons = {
        openai: '🤖',
        grok: '🚀'
      };
      
      const icon = icons[this.currentProvider] || '🤖';
      const displayName = providerConfig.name;
      const modelName = providerConfig.model;
      
      // Show provider and model clearly
      providerElement.textContent = `${icon} ${modelName}`;
      providerElement.title = `Active AI: ${displayName} (${modelName})`;
      
      console.log(`🔄 Provider display updated: ${displayName} ${modelName}`);
    } else {
      console.warn('❌ Could not update provider display - element or config missing');
    }
  }

  openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.style.display = 'flex';
      this.loadSettingsIntoModal(); // Refresh settings when opening
    }
  }

  closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Auto-detect the current symbol from TradingView's interface using stable selectors
  detectCurrentSymbol() {
    try {
      console.log(`🔍 Starting symbol detection using stable selectors (ID + text content)...`);
      
      // Method 1: Use stable ID selector for symbol search button
      const symbolButton = document.querySelector('#header-toolbar-symbol-search');
      if (symbolButton) {
        console.log(`✅ Found symbol search button using stable ID selector`);
        
        // Priority 1: Text content from js-button-text div (most reliable)
        const textDiv = symbolButton.querySelector('.js-button-text');
        if (textDiv && textDiv.textContent) {
          const symbolText = textDiv.textContent.trim();
          console.log(`🎯 Method 1a - Found symbol from js-button-text: "${symbolText}"`);
          return symbolText;
        }
        
        // Priority 2: aria-label fallback
        const ariaLabel = symbolButton.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.includes('Symbol')) {
          console.log(`🎯 Method 1b - Found from aria-label: "${ariaLabel}"`);
          // aria-label might be "Symbol Search", so this is just for debugging
        }
        
        // Priority 3: data-tooltip fallback
        const dataTooltip = symbolButton.getAttribute('data-tooltip');
        if (dataTooltip && dataTooltip !== 'Symbol Search') {
          console.log(`🎯 Method 1c - Found from data-tooltip: "${dataTooltip}"`);
          return dataTooltip;
        }
        
        // Priority 4: Any text content in the button
        const buttonText = symbolButton.textContent?.trim().replace('Symbol Search', '').trim();
        if (buttonText) {
          console.log(`🎯 Method 1d - Found from button text: "${buttonText}"`);
          return buttonText;
        }
      }
      
      // Method 2: Look for any element with symbol-like text patterns in the header toolbar
      const headerToolbar = document.querySelector('[role="toolbar"]');
      if (headerToolbar) {
        console.log(`🔍 Searching header toolbar for symbol patterns...`);
        
        // Look for text that matches common trading pair patterns
        const allButtons = headerToolbar.querySelectorAll('button, div');
        for (const element of allButtons) {
          const text = element.textContent?.trim();
          if (text && /^[A-Z]{2,6}USD$|^[A-Z]{2,6}USDT$|^[A-Z]{2,6}BTC$|^[A-Z]{2,6}ETH$/.test(text)) {
            console.log(`🎯 Method 2 - Found symbol pattern: "${text}"`);
            return text;
          }
        }
      }
      
      console.warn('⚠️ Could not auto-detect symbol from TradingView using stable selectors');
      console.log('💡 Tip: Ensure a trading pair is selected in TradingView!');
      console.log('🔧 Detection uses stable selectors: #header-toolbar-symbol-search + .js-button-text');
      return null;
      
    } catch (error) {
      console.error('❌ Symbol detection failed:', error);
      return null;
    }
  }
}

// Initialize when page loads
let tradingAI = null;

function initializeExtension() {
  console.log('🎯 initializeExtension() called');
  
  try {
    tradingAI = new TradingAIAssistant();
    console.log('✅ TradingAIAssistant instance created');
    
    // Set up cleanup event listeners only after initialization
    window.addEventListener('beforeunload', () => {
      if (tradingAI && tradingAI.isInitialized) {
        tradingAI.cleanup();
      }
    });
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && tradingAI && tradingAI.isInitialized) {
        // Page is hidden, perform light cleanup
        tradingAI.lightCleanup();
      }
    });
    
    console.log('✅ Extension initialization complete');
  } catch (error) {
    console.error('❌ Extension initialization failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
} 