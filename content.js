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
    // Multi-timeframe screenshot storage
    this.screenshots = {}; // Store multiple timeframe screenshots
    this.activeTimeframe = null; // Currently selected timeframe for conversation
    this.maxTimeframes = 4; // Maximum number of timeframes to store
    this.isMultiTimeframeMode = false; // Whether we're comparing multiple timeframes
    this.currentProvider = 'openai'; // Current AI provider (openai or grok)
    this.currentModel = 'gpt-4o'; // Current model for the selected provider
    this.messageCount = 0; // Track total messages for cleanup
    this.maxMessages = 20; // Maximum messages in DOM
    this.maxConversationHistory = 6; // Maximum conversation history for API
    this.memoryCheckInterval = null; // Memory monitoring interval
    this.isInitialized = false; // Track if extension is fully initialized
    this.init();
  }

  init() {
    console.log('🚀 TradingAIAssistant.init() called');
    window.tradingAIDebug.initCalled = true;
    this.createChatInterface();
    this.checkExtensionHealth();
    this.setupPageCleanupHandlers();
    // NOTE: setupEventListeners, loadProviderSettings, and initialization completion 
    // are handled in createChatInterface() after DOM is ready
    
    // Expose debug function globally for testing
    window.debugScreenshots = () => this.debugScreenshotState();
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
      gallery.style.display = 'none';
      return;
    } else {
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
    
    item.innerHTML = `
      <div class="gallery-item-info">
        <div class="gallery-item-timeframe">${timeframe}</div>
        <div class="gallery-item-timestamp">${timeAgo} • ${screenshot.conversation.length / 2} exchanges</div>
      </div>
      <div class="gallery-item-actions">
        <button class="gallery-item-btn select" title="Use this timeframe for chat">💬</button>
        <button class="gallery-item-btn delete" title="Delete this screenshot">🗑️</button>
      </div>
    `;
    
    // Add event listeners
    const selectBtn = item.querySelector('.select');
    const deleteBtn = item.querySelector('.delete');
    
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

    const timeframeList = timeframes.sort().join(', ');
    this.addMessage('ai', `📊 **Multi-Timeframe Comparison Mode Enabled!**

Now analyzing ALL stored timeframes simultaneously: **${timeframeList}**

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
      delete this.screenshots[timeframe];
      
      // If we deleted the active timeframe, select another one
      if (this.activeTimeframe === timeframe) {
        const remainingTimeframes = Object.keys(this.screenshots);
        this.activeTimeframe = remainingTimeframes.length > 0 ? remainingTimeframes[0] : null;
      }
      
      this.updateGallery();
      this.updateChatStatus();
      this.addMessage('ai', `🗑️ **Deleted ${timeframe} screenshot**

Screenshot and conversation history removed to free up memory.

${Object.keys(this.screenshots).length > 0 ? 
  `📸 **Remaining timeframes:** ${Object.keys(this.screenshots).join(', ')}` : 
  '📸 **No screenshots remaining.** Take a new screenshot to continue analysis.'}`);
      
      // Force garbage collection
      this.forceGarbageCollection();
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
    const timeframes = Object.keys(this.screenshots);
    const currentCount = timeframes.length;
    
    console.log(`🔍 Memory check for ${newTimeframe}:`);
    console.log(`  - Current screenshots: ${currentCount}`);
    console.log(`  - Max allowed: ${this.maxTimeframes}`);
    console.log(`  - Existing timeframes: [${timeframes.join(', ')}]`);
    console.log(`  - Is new timeframe?: ${newTimeframe ? !this.screenshots[newTimeframe] : 'N/A'}`);
    
    // Only cleanup if we would exceed the limit by adding a new unique timeframe
    // We allow exactly maxTimeframes (4) screenshots
    if (newTimeframe && !this.screenshots[newTimeframe] && currentCount >= this.maxTimeframes) {
      // We're adding a NEW timeframe and we're at or over the limit
      console.log(`⚠️ CLEANUP REQUIRED: Adding new ${newTimeframe} would exceed limit`);
      
      // Remove the oldest timeframe to make room for the new one
      const oldestTimeframe = timeframes.reduce((oldest, tf) => {
        return this.screenshots[tf].timestamp < this.screenshots[oldest].timestamp ? tf : oldest;
      });
      
      console.log(`🧹 Memory management: Removing old ${oldestTimeframe} screenshot to make room for ${newTimeframe}`);
      
      this.addMessage('ai', `🧹 Cleaned up ${oldestTimeframe} timeframe to save memory. You can take a new ${oldestTimeframe} screenshot anytime.`);
      
      delete this.screenshots[oldestTimeframe];
      
      // If we were using the removed timeframe, clear active selection
      if (this.activeTimeframe === oldestTimeframe) {
        this.activeTimeframe = null;
      }
      
      this.updateGallery();
    } else if (newTimeframe && this.screenshots[newTimeframe]) {
      console.log(`🔄 REPLACING existing ${newTimeframe} screenshot - no cleanup needed`);
    } else if (newTimeframe) {
      console.log(`✅ ADDING ${newTimeframe}: No cleanup needed (${currentCount}/${this.maxTimeframes})`);
    }
    
    // Auto-cleanup: Remove screenshots older than 30 minutes
    const thirtyMinutes = 30 * 60 * 1000;
    const now = Date.now();
    
    for (const tf of Object.keys(this.screenshots)) {
      if (now - this.screenshots[tf].timestamp > thirtyMinutes) {
        console.log(`⏰ Auto-cleanup: Removing expired ${tf} screenshot (>30 min old)`);
        this.addMessage('ai', `⏰ ${tf} timeframe expired (30+ minutes old) and was cleaned up to save memory.`);
        delete this.screenshots[tf];
        
        if (this.activeTimeframe === tf) {
          this.activeTimeframe = null;
        }
      }
    }
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
        <h3>🤖 Trading AI</h3>
        <div class="header-controls">
          <button id="settings-btn" class="settings-btn" title="Settings">⚙️</button>
          <button id="chat-toggle" class="chat-toggle" title="Expand chat">+</button>
        </div>
      </div>
      
      <div class="chat-content" id="chat-content">
        <div class="chat-status" id="chat-status">
          <span id="status-text">🤖 OpenAI (gpt-4o) - Ready to analyze!</span>
          <button id="clear-screenshot" class="clear-btn" title="Clear screenshot">×</button>
        </div>
        
        <div class="chat-messages" id="chat-messages"></div>
        
        <div class="chat-controls">
          <div class="analyze-container">
            <select id="timeframe-select" class="timeframe-select">
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="30m">30 Minutes</option>
              <option value="1h" selected>1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
              <option value="1w">1 Week</option>
            </select>
            <button id="screenshot-btn" class="screenshot-btn">📸 Analyze Chart</button>
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
          <h2>⚙️ AI Provider Settings</h2>
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
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-vision-preview">GPT-4 Vision Preview</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
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
                    <option value="grok-3-beta" selected>Grok-3 Beta (Recommended)</option>
                    <option value="grok-3-mini-beta">Grok-3 Mini Beta</option>
                    <option value="grok-2-vision-1212">Grok-2 Vision 1212</option>
                    <option value="grok-vision-beta">Grok Vision Beta (Legacy)</option>
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

          <div class="settings-footer">
            <div class="api-key-help">
              <h4>🔑 Getting API Keys</h4>
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
    } else {
      console.error('❌ CRITICAL: chat-toggle button not found for direct listener!');
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
      this.compareAllTimeframes();
    });

    // Clear screenshot button
    this.safeAddEventListener('clear-screenshot', 'click', () => {
      this.clearScreenshot();
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
        this.addMessage('ai', '👋 Hey trader! Click ⚙️ to configure your AI provider, then use "📸 Analyze Chart" to get started!');
      }
    }
    
    console.log('✅ Toggle complete. New classes:', chatContainer.className);
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
    
    // Get timeframe from dropdown
    const timeframeSelect = document.getElementById('timeframe-select');
    if (!timeframeSelect) {
      console.warn('Timeframe selector not found');
      this.isAnalyzing = false;
      return;
    }
    
    const timeframe = timeframeSelect.value;
    const originalText = btn.textContent;
    btn.textContent = `📸 Analyzing ${timeframe}...`;
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

      // Capture screenshot via background script
      response = await chrome.runtime.sendMessage({
        action: 'captureScreenshot'
      });

      console.log('🤖 Background response:', response);

      if (response && response.success) {
        console.log(`📸 Processing new screenshot for ${timeframe}. Current count: ${Object.keys(this.screenshots).length}`);
        
        // Balanced: Optimize image size for faster API calls while maintaining quality
        const optimizedImage = await this.optimizeImageSize(response.dataUrl);
        
        // Check if we need to free up memory before storing new screenshot
        this.manageTimeframeMemory(timeframe);
        
        // Send to AI for analysis with timeframe context
        const analysis = await this.analyzeWithAI(optimizedImage, timeframe, true);
        
        this.addMessage('ai', analysis);
        
        // Store screenshot with timeframe
        this.screenshots[timeframe] = {
          image: optimizedImage,  // Use optimized image
          timestamp: Date.now(),
          conversation: [
            { role: 'user', content: `Analyze ${timeframe} timeframe chart`, provider: this.currentProvider },
            { role: 'assistant', content: analysis, provider: this.currentProvider }
          ]
        };
        
        console.log(`✅ Screenshot stored for ${timeframe}. New count: ${Object.keys(this.screenshots).length}`);
        
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
      
      // Provide specific error messages
      let errorMessage;
      if (error.message.includes('Extension context invalidated')) {
        errorMessage = '🔄 Extension was reloaded. Please refresh this page and try again.';
      } else if (error.message.includes('Rate limit exceeded')) {
        errorMessage = '⏱️ OpenAI rate limit reached. Please wait 60 seconds and try again.';
      } else if (error.message.includes('Invalid API key')) {
        errorMessage = '🔑 Invalid API key. Please check your OpenAI API key in the extension popup.';
      } else if (error.message.includes('Access denied')) {
        errorMessage = '🚫 API access denied. Make sure your OpenAI account has GPT-4 Vision access.';
      } else if (error.message.includes('API key')) {
        errorMessage = '🔑 Please check your OpenAI API key in the extension popup.';
      } else if (error.message.includes('Failed to capture')) {
        errorMessage = '📸 Screenshot failed. Please grant permissions and try again.';
      } else {
        errorMessage = `❌ Analysis failed: ${error.message}`;
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

  async analyzeWithAI(imageData, timeframe = '1h', isInitialAnalysis = false, userMessage = null) {
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
              text: `Please analyze this TradingView chart for the **${timeframe} timeframe** and provide structured technical analysis insights. Focus on:

1. **Price Action**: Current trend, support/resistance levels specific to ${timeframe}
2. **Technical Indicators**: What indicators are visible and their ${timeframe} signals
3. **Chart Patterns**: Any recognizable patterns forming on ${timeframe}
4. **Entry/Exit Points**: Trading opportunities suitable for ${timeframe} timeframe
5. **Risk Management**: Stop-loss and take-profit levels appropriate for ${timeframe}
6. **Timeframe Context**: How this ${timeframe} view fits into broader market structure

Please be specific about price levels and consider that this is a ${timeframe} analysis. Provide actionable insights for traders using this timeframe. Keep this initial analysis structured and comprehensive.`
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

I'm providing you with screenshots from multiple TradingView timeframes: **${timeframes}**

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
            content: `Quick multi-timeframe analysis. Be brief.`
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

For regular chat responses (not initial analysis), be natural and conversational. Use trading slang when appropriate, add personality, and make it enjoyable. Think like a knowledgeable friend who happens to be great at TA.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Here is the TradingView chart we are discussing:'
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
      max_tokens: 450,  // Balanced: Enough for complete responses
      temperature: 0.5  // Balanced: Good creativity with consistency
    });
    const requestSizeKB = Math.round(requestBody.length / 1024);
    console.log(`⏱️ Sending ${requestSizeKB}KB request to ${apiConfig.name} (${apiConfig.model})...`);
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
      max_tokens: 450,
      temperature: 0.5
    }, null, 2));
    
    const apiStartTime = performance.now();
    
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // Balanced: 20 second timeout
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    console.log(`🔍 Request Headers:`, requestHeaders);
    
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
        errorMessage = `Access denied. Make sure your API key has access to ${providerName} Vision models.`;
      } else if (response.status === 404) {
        errorMessage = `${providerName} model not found. Model "${apiConfig.model}" may not be available. Try a different model.`;
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

    // Check if we have any screenshots to discuss
    if (Object.keys(this.screenshots).length === 0) {
      this.addMessage('ai', '📸 Please take a screenshot first by clicking "Analyze Chart" button.');
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
        
        response = await this.analyzeWithAI(allImages, 'multi-timeframe', false, message);
        
        // Store conversation in the most recent timeframe for history
        const recentTimeframe = timeframes.sort((a, b) => 
          this.screenshots[b].timestamp - this.screenshots[a].timestamp
        )[0];
        
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
        response = await this.analyzeWithAI(activeScreenshot.image, this.activeTimeframe, false, message);
        
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
    
    // Add copy button for AI messages
    const copyButton = type === 'ai' ? `
      <button class="copy-btn" title="Copy message" style="position: absolute; top: 6px; right: 6px;">
        📋
      </button>
    ` : '';
    
    messageDiv.innerHTML = `
      <div class="message-content">${formattedContent}</div>
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
      ${copyButton}
    `;
    
    // Ensure messageDiv has proper positioning context
    messageDiv.style.position = 'relative';
    messageDiv.style.overflow = 'visible';

    // Add copy functionality to AI messages
    if (type === 'ai') {
      const copyBtn = messageDiv.querySelector('.copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          console.log('🖱️ Copy button clicked'); // Debug log
          
          // Get the original unformatted content
          let textToCopy = content;
          
          // If that's not available, extract text from HTML but clean it up
          if (!textToCopy) {
            const messageContentEl = messageDiv.querySelector('.message-content');
            if (messageContentEl) {
              // Get text content and clean up extra whitespace
              textToCopy = messageContentEl.textContent || messageContentEl.innerText || '';
              textToCopy = textToCopy.replace(/\s+/g, ' ').trim();
            }
          }
          
          console.log('📋 Copying text:', textToCopy.substring(0, 100) + '...'); // Debug log (truncated)
          
          try {
            await navigator.clipboard.writeText(textToCopy);
            
            // Success feedback
            const originalText = copyBtn.textContent;
            const originalTitle = copyBtn.title;
            
            copyBtn.textContent = '✅';
            copyBtn.title = 'Copied!';
            copyBtn.classList.add('copy-success');
            
            // Reset after 2 seconds
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.title = originalTitle;
              copyBtn.classList.remove('copy-success');
            }, 2000);
            
            console.log('✅ Text copied successfully');
            
          } catch (err) {
            console.error('❌ Failed to copy text:', err);
            
            // Error feedback
            const originalText = copyBtn.textContent;
            const originalTitle = copyBtn.title;
            
            copyBtn.textContent = '❌';
            copyBtn.title = 'Copy failed!';
            copyBtn.classList.add('copy-error');
            
            // Reset after 2 seconds
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.title = originalTitle;
              copyBtn.classList.remove('copy-error');
            }, 2000);
          }
        });
      }
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    this.messageCount++;
    
    // Clean up old messages to prevent memory issues
    this.cleanupOldMessages();
    
    return messageDiv; // Return element for manipulation (e.g., removing loading messages)
  }

  cleanupOldMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    
    // Check if messagesContainer exists before accessing children
    if (!messagesContainer) {
      console.warn('Messages container not found, skipping cleanup');
      return;
    }
    
    const messages = messagesContainer.children;
    
    // Keep only the last maxMessages messages in DOM
    while (messages.length > this.maxMessages) {
      const oldMessage = messages[0];
      messagesContainer.removeChild(oldMessage);
      this.messageCount--;
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
        'grok_model'
      ]);
      
      this.currentProvider = result.ai_provider || 'openai';
      
      // Load the model for the current provider
      if (this.currentProvider === 'openai') {
        this.currentModel = result.openai_model || 'gpt-4o';
      } else if (this.currentProvider === 'grok') {
        this.currentModel = result.grok_model || 'grok-3-beta';
      }
      
      console.log(`🤖 Current AI Provider: ${this.currentProvider}`);
      console.log(`🎯 Current Model: ${this.currentModel}`);
    } catch (error) {
      console.error('Failed to load provider settings:', error);
      this.currentProvider = 'openai'; // Fallback to OpenAI
      this.currentModel = 'gpt-4o'; // Fallback model
    }
  }

  getProviderConfig() {
    const configs = {
      openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: this.currentModel,
        name: 'OpenAI'
      },
      grok: {
        endpoint: 'https://api.x.ai/v1/chat/completions',
        model: this.currentModel,
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
    // Clear screenshots on page refresh/navigation
    window.addEventListener('beforeunload', () => {
      console.log('🧹 Page unloading - clearing all screenshots');
      this.clearAllScreenshots();
    });

    // Clear screenshots on page visibility change (tab switch, etc.)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('🧹 Page hidden - performing light cleanup');
        this.lightCleanup();
      }
    });

    // Clear screenshots if page is about to be refreshed
    window.addEventListener('pagehide', () => {
      console.log('🧹 Page hiding - clearing all screenshots');
      this.clearAllScreenshots();
    });

    // Clear screenshots on extension context invalidation
    const originalSendMessage = chrome.runtime.sendMessage;
    if (originalSendMessage) {
      chrome.runtime.sendMessage = (...args) => {
        if (!chrome.runtime || !chrome.runtime.id) {
          console.log('🧹 Extension context invalid - clearing all screenshots');
          this.clearAllScreenshots();
          return;
        }
        return originalSendMessage.apply(chrome.runtime, args);
      };
    }

    console.log('✅ Page cleanup handlers registered');
  }

  clearAllScreenshots() {
    if (!this.screenshots) return;
    
    console.log('🧹 Clearing all stored screenshots and conversation history');
    
    // Clear all screenshots from memory
    this.screenshots = {};
    this.activeTimeframe = null;
    
    // Update UI
    if (this.isInitialized) {
      this.updateChatStatus();
      this.updateGallery();
      
      // Add a temporary message to inform user
      this.addMessage('ai', `🧹 **Screenshots Cleared**

All stored screenshots and conversation history have been cleared from memory to protect your privacy and free up browser resources.

📸 Ready for new analysis - select a timeframe and take a screenshot to continue!`);
    }
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    console.log('✅ All screenshots cleared from memory');
  }

  // Balanced: Optimize image size for good speed while maintaining quality
  optimizeImageSize(dataUrl) {
    const sizeKB = Math.round(dataUrl.length / 1024);
    console.log(`📸 Original image size: ${sizeKB}KB`);
    
    // Balanced: Resize to reasonable dimensions for good analysis speed
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Balanced: Reasonable size for good analysis while staying fast
        const maxWidth = 800;  // Good detail for chart analysis
        const maxHeight = 600;
        
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // Balanced quality
        const newSizeKB = Math.round(resizedDataUrl.length / 1024);
        console.log(`📸 Balanced resize: ${newSizeKB}KB (saved ${sizeKB - newSizeKB}KB)`);
        
        resolve(resizedDataUrl);
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
    
    // Update model if provided, otherwise load from storage
    if (newModel) {
      this.currentModel = newModel;
    } else {
      // Load the model for the new provider
      try {
        const result = await chrome.storage.sync.get([`${newProvider}_model`]);
        this.currentModel = result[`${newProvider}_model`] || 
          (newProvider === 'openai' ? 'gpt-4o' : 'grok-3-beta');
      } catch (error) {
        console.error('Failed to load model for provider:', error);
        this.currentModel = newProvider === 'openai' ? 'gpt-4o' : 'grok-3-beta';
      }
    }
    
    // Update UI to show provider change
    const providerName = newProvider === 'openai' ? 'OpenAI' : 'Grok (xAI)';
    const providerIcon = newProvider === 'openai' ? '🧠' : '🚀';
    
    this.addMessage('ai', `${providerIcon} **Switched to ${providerName}!**
    
**Model:** ${this.currentModel}

Hey! I'm now running on ${providerName} with the ${this.currentModel} model. Don't worry - I remember everything we've discussed! 

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
    const statusDiv = document.getElementById('chat-status');
    const statusText = document.getElementById('status-text');
    
    // Check if status elements exist
    if (!statusDiv || !statusText) {
      console.warn('Status elements not found, skipping status update');
      return;
    }
    
    const timeframes = Object.keys(this.screenshots);
    
    if (timeframes.length > 0) {
      // Check memory usage for status indicator
      let memoryWarning = '';
      if (typeof window.performance !== 'undefined' && window.performance.memory) {
        const memoryInfo = window.performance.memory;
        const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
        const limitMB = memoryInfo.jsHeapSizeLimit / 1024 / 1024;
        
        if (usedMB > limitMB * 0.7) {
          memoryWarning = ' ⚠️';
        }
      }
      
      if (this.isMultiTimeframeMode) {
        // Multi-timeframe comparison mode
        const sortedTimeframes = timeframes.sort().join(', ');
        statusText.textContent = `📊 Comparing ${timeframes.length} timeframes: ${sortedTimeframes}${memoryWarning} - Ask questions!`;
      } else {
        // Single timeframe mode
        const displayTimeframe = this.activeTimeframe || timeframes[0];
        const screenshot = this.screenshots[displayTimeframe];
        const minutesAgo = Math.floor((Date.now() - screenshot.timestamp) / (60 * 1000));
        const timeText = minutesAgo === 0 ? 'just now' : `${minutesAgo}m ago`;
        
        const timeframeInfo = timeframes.length > 1 ? ` (${timeframes.length} stored)` : '';
        statusText.textContent = `📸 ${displayTimeframe} loaded ${timeText}${memoryWarning}${timeframeInfo} - Ask questions!`;
      }
      
      statusDiv.style.display = 'flex';
      
      // Change color if memory warning
      if (memoryWarning) {
        statusDiv.style.borderColor = 'rgba(255, 107, 53, 0.5)';
        statusDiv.style.background = 'rgba(255, 107, 53, 0.1)';
      } else {
        statusDiv.style.borderColor = 'rgba(0, 212, 255, 0.3)';
        statusDiv.style.background = 'rgba(0, 212, 255, 0.1)';
      }
    } else {
      statusDiv.style.display = 'none';
    }
  }

  clearScreenshot() {
    // Clear all screenshots or just active timeframe
    if (this.activeTimeframe && this.screenshots[this.activeTimeframe]) {
      const timeframe = this.activeTimeframe;
      delete this.screenshots[timeframe];
      this.activeTimeframe = null;
      this.addMessage('ai', `🗑️ ${timeframe} screenshot cleared. Take a new screenshot to continue analysis.`);
    } else {
      // Clear all screenshots
      this.screenshots = {};
      this.activeTimeframe = null;
      this.addMessage('ai', '🗑️ All screenshots cleared. Take a new screenshot to start fresh analysis.');
    }
    
    this.updateChatStatus();
    this.updateGallery();
    
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
        'openai_model', 'grok_model', 'openai_enabled', 'grok_enabled'
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
      if (grokModel) grokModel.value = settings.grok_model || 'grok-3-beta';
      if (grokKey && settings.grok_api_key) {
        grokKey.value = settings.grok_api_key;
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

  async saveSettingsFromModal() {
    try {
      const activeProvider = document.getElementById('active-provider-select')?.value;
      const openaiEnabled = document.getElementById('openai-enabled')?.checked;
      const grokEnabled = document.getElementById('grok-enabled')?.checked;
      const openaiModel = document.getElementById('openai-model-select')?.value;
      const grokModel = document.getElementById('grok-model-select')?.value;
      const openaiKey = document.getElementById('openai-api-key')?.value;
      const grokKey = document.getElementById('grok-api-key')?.value;

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
        grok_model: grokModel
      };

      // Only save keys if they're provided
      if (openaiKey && openaiKey.trim()) {
        settings.openai_api_key = openaiKey.trim();
      }
      if (grokKey && grokKey.trim()) {
        settings.grok_api_key = grokKey.trim();
      }

      await chrome.storage.sync.set(settings);

      // Update current instance to match the saved settings
      this.currentProvider = activeProvider;
      this.currentModel = activeProvider === 'openai' ? openaiModel : grokModel;
      
      console.log(`🔧 Updated instance: ${this.currentProvider} with model ${this.currentModel}`);

      this.updateProviderDisplay();
      this.showSettingsStatus('Settings saved successfully!', 'success');
      
      // Add a message to chat about the change
      const providerConfig = this.getProviderConfig();
      this.addMessage('ai', `🔄 Switched to ${providerConfig.name} (${providerConfig.model}). I'm ready to analyze your charts! 🚀`);
      
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

    try {
      if (provider === 'openai') {
        await this.testOpenAIConnection(apiKey);
        this.showProviderStatus(provider, '✅ API key valid and GPT-4 Vision available!', 'success');
      } else if (provider === 'grok') {
        await this.testGrokConnection(apiKey);
        this.showProviderStatus(provider, '✅ API key valid and Grok Vision available!', 'success');
      }
    } catch (error) {
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
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        throw new Error('Rate limited - API key valid but quota exceeded');
      } else {
        throw new Error(`API error: ${response.status}`);
      }
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
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        throw new Error('Rate limited - API key valid but quota exceeded');
      } else {
        throw new Error(`API error: ${response.status}`);
      }
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
    const statusElement = document.getElementById('status-text');
    
    if (statusElement && providerConfig) {
      statusElement.textContent = `🤖 ${providerConfig.name} (${providerConfig.model}) - Ready to analyze!`;
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