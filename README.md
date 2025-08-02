# Trading AI Assistant - Chrome Extension

🚀 **Advanced AI-powered trading analysis** that works seamlessly with TradingView charts. Auto-detects symbols and timeframes, supports multiple AI providers, and provides comprehensive technical analysis with persistent chat history.

## ✨ Key Features

### 🧠 **Dual AI Provider Support**
- **OpenAI GPT-4o** - Industry-leading vision analysis
- **Grok (xAI)** - Latest AI technology with advanced reasoning
- **Smart switching** between providers with API key management
- **Automatic vision model selection** for chart analysis

### 📸 **Intelligent Screenshot Analysis**
- **Auto-detects symbol** (ETHUSD, BTCUSD, etc.) from chart header
- **Auto-detects timeframe** (1h, 4h, 1d, etc.) from TradingView interface
- **Smart symbol focus** - Ignores watchlists and side panels
- **High-quality capture** - PNG format up to 1920x1080 resolution
- **Quality presets** - Ultra, High, Medium (adjustable via settings)
- **No manual configuration** - just click and analyze!

### 📊 **Multi-Timeframe Analysis**
- **Compare multiple timeframes** simultaneously (1h vs 4h vs 1d)
- **Cross-timeframe insights** - trend alignment and conflicts
- **Screenshot gallery** with visual timeframe management
- **Persistent storage** - screenshots saved until manually cleared

### 💬 **Enhanced Chat Experience**
- **Persistent chat history** - survives page reloads
- **Custom text selection** with branded highlight colors
- **Copy functionality** - select any text and use Ctrl+C
- **Smart message formatting** with structured AI responses
- **Progressive loading** for large responses (prevents DOM crashes)

### 📤 **Screenshot Sharing & Export**
- **Download screenshots** - Save as PNG files with smart naming
- **Copy to clipboard** - Paste directly in Discord, Telegram, etc.
- **Smart filenames** - ETHUSD_4h_2024-01-15T10-30-00.png format
- **Visual feedback** - Button animations show copy/download status
- **Cross-platform** - Works in all major browsers

### 🎨 **Advanced UI/UX**
- **Draggable interface** - position anywhere on screen
- **Resizable window** - adjust to your workflow
- **Collapsed mode** - minimize when not in use
- **Clean styling** with modern design and smooth animations
- **Mobile responsive** design

### 🛡️ **Robust & Reliable**
- **Memory management** - smart cleanup prevents browser slowdown
- **Error handling** - detailed API error messages with billing guidance
- **Stable selectors** - won't break with TradingView updates
- **Extension context recovery** - handles Chrome extension reloads
- **Tab cleanup** - automatically clears data when tab closes

## 🚀 Quick Setup

### 1. Get AI Provider API Keys

#### Grok (Recommended)
1. Visit [xAI Console](https://console.x.ai/)
2. Create account and generate API key
3. Grok-4 with vision support included

#### OpenAI (Optional)
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create account and generate API key
3. Ensure GPT-4 Vision access (may require paid plan)

### 2. Install Extension
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (toggle top right)
3. Click "Load unpacked" → select `probe` folder
4. Extension appears in Chrome toolbar

### 3. Configure AI Providers
1. Go to any TradingView page
2. Click ⚙️ settings in the Trading AI chat window
3. **Enable providers** and enter API keys
4. **Test connections** to verify setup
5. **Select active provider** (OpenAI or Grok)

### 4. Start Analyzing
1. Open any chart on TradingView
2. Look for "🤖 Trading AI" widget (right side)
3. Click "📸 Analyze Current Chart"
4. Get instant AI analysis with auto-detected symbol/timeframe!

## 📱 How to Use

### Getting Started
1. **Configure AI Provider** - Click ⚙️ → Enter OpenAI or Grok API key → Save
2. **First analysis** - Click "📸 Analyze Chart" for instant analysis
3. **Read the welcome guide** - Comprehensive instructions appear on first use
4. **Access help anytime** - Type `help()` in browser console for quick reference

### Basic Analysis
1. **Open TradingView** - Any trading pair and timeframe
2. **Auto-detection** - Extension reads symbol (ETHUSD) and timeframe (4h)
3. **Click analyze** - "📸 Analyze Current Chart" button
4. **Get insights** - Comprehensive analysis with price levels and signals
5. **Ask follow-ups** - Chat naturally about the analysis

### Multi-Timeframe Analysis
1. **Take multiple screenshots** on different timeframes (1h, 4h, 1d)
2. **View screenshot gallery** - See all stored timeframes
3. **Click "Compare All Timeframes"** - Get cross-timeframe analysis
4. **Unified insights** - Trend alignment, support/resistance across timeframes

### Chat Features
- **Persistent history** - Conversations survive page reloads
- **Text selection** - Select any AI response text (custom blue highlights)
- **Copy with Ctrl+C** - Standard browser copy behavior
- **Ask questions** - "What's the next resistance level?" "Should I buy here?"

### Sharing Screenshots
1. **Take screenshots** on any timeframes you want to share
2. **Open screenshot gallery** - Scroll down to see stored screenshots
3. **Download option** - Click 📥 to save as PNG file with smart naming
4. **Copy to clipboard** - Click 📋 to copy for instant pasting
5. **Share anywhere** - Paste in Discord, Telegram, Twitter, or any platform
6. **Smart filenames** - Files saved as ETHUSD_4h_2024-01-15T10-30-00.png

## 🎯 What the AI Analyzes

### Technical Analysis
- **Price Action** - Trends, breakouts, reversals, momentum
- **Support/Resistance** - Key levels with specific prices
- **Chart Patterns** - Triangles, flags, head & shoulders, wedges
- **Technical Indicators** - MACD, RSI, moving averages, volume
- **Risk Management** - Stop-loss and take-profit recommendations

### Multi-Timeframe Insights
- **Trend Alignment** - Are all timeframes bullish/bearish?
- **Conflicting Signals** - Short-term vs long-term divergences
- **Entry Timing** - Best timeframe for trade execution
- **Context Analysis** - How current move fits bigger picture

### Smart Symbol Detection
- **Accurate identification** - Reads ETHUSD from chart header
- **Ignores distractions** - Won't analyze CHAINUSD from watchlist
- **Focused analysis** - Only the main chart you're viewing
- **Reliable detection** - Uses stable TradingView DOM elements

## ⚡ Advanced Features

### Screenshot Management
- **Persistent storage** - No 30-minute expiration (old limitation removed)
- **Smart replacement** - New 4h screenshot replaces old 4h
- **Memory limits** - Keeps 4 timeframes max, removes oldest when full
- **Gallery view** - Visual management with timestamps
- **Manual clearing** - Clear individual timeframes or all at once
- **Download as PNG** - Save screenshots with smart naming (SYMBOL_TIMEFRAME_TIMESTAMP.png)
- **Copy to clipboard** - One-click copy for pasting in Discord, Telegram, etc.
- **Share anywhere** - Export screenshots to any platform or application

### High-Quality Image System
- **PNG capture** - Lossless format preserves chart detail perfectly
- **Full HD resolution** - Up to 1920x1080 for crystal-clear analysis
- **Quality presets** - Ultra (2560x1440), High (1920x1080), Medium (1280x720)
- **Smart format selection** - Auto-chooses PNG vs JPEG based on file size
- **Console control** - `setQuality('ultra')` for maximum quality
- **Real-time switching** - Change quality without reloading extension

### AI Provider Management
- **Dual support** - Switch between OpenAI and Grok instantly
- **API testing** - Built-in connection testing with detailed error messages
- **Billing guidance** - Clear instructions for 403 errors (no credits)
- **Model selection** - Only vision-capable models shown (GPT-4o, Grok-4)
- **Token optimization** - Smart limits prevent DOM overload

### Memory & Performance
- **Tab cleanup** - Screenshots cleared when tab closes (prevents memory leaks)
- **Progressive loading** - Large AI responses load in chunks
- **Image optimization** - Balanced quality/speed for API calls
- **Extension recovery** - Handles Chrome extension reloads gracefully

## 🔧 Troubleshooting

### Common Issues

**Extension not visible on TradingView**
- Refresh the TradingView page
- Check you're on `*.tradingview.com` domain
- Look for 🤖 icon in top-right area of page

**Wrong symbol detected (e.g., CHAINUSD instead of ETHUSD)**
- This was fixed! Extension now reads from chart header only
- Ignores watchlists and side panels completely
- Should detect correct symbol from main chart

**API errors (403, 401, etc.)**
- Check console for detailed error messages
- 403 usually means no credits/billing issue
- Links to billing dashboards provided in error messages
- Test API keys using built-in testing feature

**Large responses causing crashes**
- Extension now handles large responses with chunked loading
- Progressive rendering prevents DOM overload
- Responses limited to prevent issues

### Getting Help
1. **Check browser console** - F12 → Console tab for detailed logs
2. **Test API connections** - Use built-in testing in settings
3. **Verify permissions** - Extension needs tab access for screenshots
4. **Try different AI provider** - Switch between OpenAI and Grok

## 💡 Pro Tips

### Best Practices
1. **Use multiple timeframes** - 1h for entries, 4h for trend, 1d for context
2. **Keep charts clean** - Too many indicators can confuse analysis
3. **Draw key levels** - Mark your own support/resistance before analysis
4. **Ask specific questions** - "What's next resistance?" vs "How's this chart?"
5. **Compare timeframes** - Use multi-timeframe analysis for confirmation

### Advanced Usage
- **Drag interface** anywhere on screen for optimal positioning
- **Resize window** to fit your trading setup
- **Use both AI providers** - Different perspectives on same chart
- **Save important analysis** - Screenshots persist until manually cleared
- **Leverage chat history** - Reference previous conversations
- **Share screenshots** - Download or copy charts for Discord/Telegram discussions
- **Smart naming** - Downloaded files include symbol, timeframe, and timestamp
- **Quick sharing** - Copy to clipboard works instantly in most platforms
- **Quality control** - Use `setQuality('ultra')` for max detail, `setQuality('medium')` for speed
- **Monitor quality** - Status bar shows current quality level (⚡ high, 🔥 ultra, etc.)
- **Dynamic provider display** - Both header and status show active AI provider/model
- **Easy switching** - Use `switchProvider('grok')` to test different providers
- **Comprehensive help** - `help()` command shows detailed usage instructions
- **Welcome guide** - Detailed instructions appear on first use with all features

## 🔮 Recent Updates

### v3.0 - Major Feature Release
- ✅ **Auto-detection** of symbols and timeframes
- ✅ **Dual AI provider** support (OpenAI + Grok)
- ✅ **Multi-timeframe analysis** with visual gallery
- ✅ **Persistent chat history** survives page reloads
- ✅ **Enhanced text selection** with custom highlighting
- ✅ **Smart symbol focus** ignores watchlists/side panels
- ✅ **Memory management** and tab cleanup
- ✅ **Progressive loading** for large responses
- ✅ **Stable DOM selectors** won't break with TradingView updates
- ✅ **Screenshot download & copy** - share screenshots anywhere
- ✅ **Smart file naming** - SYMBOL_TIMEFRAME_TIMESTAMP.png format
- ✅ **High-quality screenshots** - PNG format up to 1920x1080 resolution
- ✅ **Quality presets** - Ultra, High, Medium with settings control
- ✅ **Dynamic status display** - Header and status area show active AI provider/model
- ✅ **Console controls** - Switch providers and quality with simple commands
- ✅ **Comprehensive help system** - Detailed welcome guide and `help()` command
- ✅ **Usage instructions** - Complete guide for all features in welcome message

### Previous Versions
- v2.0 - Basic screenshot analysis
- v1.0 - Initial proof of concept

## 📄 Technical Details

### File Structure
```
probe/
├── manifest.json          # Chrome extension configuration
├── content.js             # Main logic, UI, AI analysis (3000+ lines)
├── background.js          # Screenshot capture service worker
├── styles.css            # Advanced UI styling with animations
├── icon16.png            # Extension icons
├── icon48.png            
├── icon128.png           
└── README.md             # This documentation
```

### Architecture
- **Content Script** - Runs on TradingView pages, creates UI
- **Background Script** - Handles screenshot capture
- **Chrome Storage** - Persistent settings and chat history
- **AI APIs** - OpenAI and xAI integration
- **DOM Integration** - Stable selectors for auto-detection

## 🔒 Privacy & Security

- **Local storage only** - API keys stored in Chrome sync storage
- **No external servers** - Direct API communication only
- **HTTPS encryption** - All API calls secured
- **Memory cleanup** - Data cleared on tab close
- **No tracking** - Extension doesn't collect usage data

## 📝 License & Disclaimer

Educational proof-of-concept project. Use at your own risk.

**⚠️ Trading Disclaimer**: AI analysis is for educational purposes only. Always do your own research and consider consulting financial advisors before making trading decisions.

---

**Powered by GPT-4o Vision & Grok-4** | **Built for TradingView** | **Advanced Chrome Extension**
