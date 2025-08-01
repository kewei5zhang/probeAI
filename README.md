# Trading AI Assistant - Chrome Extension

AI-powered trading analysis that works directly with TradingView charts. Take screenshots of your trading charts and get instant technical analysis using OpenAI's GPT-4 Vision API.

## 🎯 Features

- **Screenshot Analysis**: Capture TradingView charts and get AI-powered technical analysis
- **Real-time Chat Interface**: Integrated sidebar chat on TradingView pages
- **Technical Indicators**: AI recognizes MACD, RSI, moving averages, and other indicators
- **Pattern Recognition**: Identifies chart patterns, support/resistance levels
- **Trading Insights**: Get entry/exit suggestions and risk management advice

## 🚀 Quick Setup

### 1. Get OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account and generate an API key
3. Make sure you have access to GPT-4 Vision (may require paid plan)

### 2. Install the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select this `probe` folder
4. The extension should now appear in your Chrome toolbar

### 3. Configure API Key
1. Click the Trading AI extension icon in Chrome toolbar
2. Enter your OpenAI API key
3. Click "Save API Key" and then "Test Connection"
4. You should see "✅ API key valid and GPT-4 Vision available!"

### 4. Start Trading Analysis
1. Go to [TradingView](https://tradingview.com)
2. Open any chart with technical indicators
3. Look for the "🤖 Trading AI" widget on the right side
4. Click "📸 Analyze Chart" to get instant AI analysis

## 📱 How to Use

### Taking a Screenshot Analysis
1. **Set up your chart**: Add indicators like MACD, RSI, moving averages
2. **Adjust timeframe**: Choose the timeframe you want to analyze
3. **Position the chat**: Drag the chat window by its header to avoid blocking important chart elements
4. **Resize if needed**: Drag the bottom edge (⋯) to make the window taller or shorter
5. **Click Analyze**: Hit the "📸 Analyze Chart" button
6. **Get insights**: AI will analyze price action, indicators, and patterns with clean formatting
7. **Follow up**: Ask specific questions about the analysis

### What the AI Can Analyze
- **Price Action**: Trends, support/resistance levels, breakouts
- **Technical Indicators**: MACD signals, RSI levels, moving average crossovers
- **Chart Patterns**: Triangles, head & shoulders, flags, wedges
- **Volume Analysis**: Volume confirmations and divergences
- **Risk Management**: Stop-loss and take-profit suggestions

## 🔧 Troubleshooting

### Extension Not Loading
- Make sure you're on a TradingView page (`*.tradingview.com`)
- Refresh the page after installing the extension
- Check Chrome DevTools console for error messages

### API Errors
- Verify your OpenAI API key is correct
- Ensure you have GPT-4 Vision access (may require paid plan)
- Check your OpenAI account has sufficient credits

### Screenshot Issues
- Grant permission when Chrome asks for tab access
- Make sure the chart is visible on screen
- Try refreshing the TradingView page

## ✨ Features

- **📸 Screenshot Analysis**: Automatic chart capture and AI analysis
- **🤖 Smart Formatting**: Clean, readable AI responses with proper styling  
- **🖱️ Draggable Interface**: Move the chat window anywhere on screen
- **📏 Resizable Window**: Adjust height to fit your workflow
- **⚙️ Easy Setup**: One-click API key configuration
- **🔄 Auto-Recovery**: Smart error handling and context management

## 💡 Tips for Better Analysis

1. **Use Multiple Timeframes**: Analyze both short-term and long-term charts
2. **Include Key Indicators**: Add MACD, RSI, volume for comprehensive analysis
3. **Mark Important Levels**: Draw support/resistance lines before analysis
4. **Clear Charts**: Avoid too many indicators that might confuse the AI
5. **Ask Specific Questions**: Follow up with targeted questions about patterns

## 🔮 Future Enhancements (Phase 2)

- **Historical Context**: Access to previous candle data
- **Multiple Timeframe Analysis**: Compare different timeframes automatically
- **Trade Alerts**: Set up AI-powered alerts for specific conditions
- **Backtesting**: Test AI suggestions against historical data
- **Integration**: Direct connection to TradingView's data API

## 📄 File Structure

```
probe/
├── manifest.json          # Chrome extension configuration
├── content.js             # Main chat interface and screenshot logic
├── background.js          # Screenshot capture service worker
├── popup.html             # Extension settings popup
├── popup.js              # Settings popup functionality
├── styles.css            # Chat interface styling
├── icon16.png            # Extension icon (16x16)
├── icon48.png            # Extension icon (48x48)
├── icon128.png           # Extension icon (128x128)
└── README.md             # This file
```

## 🔒 Privacy & Security

- API keys are stored locally in Chrome's sync storage
- Screenshots are sent to OpenAI for analysis only
- No data is stored on external servers
- All communications use HTTPS

## 📝 License

This is a proof-of-concept project. Use at your own risk for educational purposes.

---

**Note**: This extension requires an OpenAI API key with GPT-4 Vision access. Trading decisions should not be based solely on AI analysis. Always do your own research and consider consulting with financial advisors.
