require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');


const createApp = () => {
const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.json());

// Stock Price Fetching
const fetchStockPrice = async (symbol) => {
  const url = `http://api.marketstack.com/v1/eod?access_key=${process.env.MARKETSTACK_ACCESS_KEY}&symbols=${symbol}`;

  try {
    const response = await axios.get(url);
    
    if (response.data?.data?.length > 0) {
      const latestPrice = response.data.data[0].close;
      return `${symbol}: ${latestPrice} USD`;
    }
    return `${symbol}: Price data unavailable`;
  } catch (error) {
    console.error(`API Error for ${symbol}:`, error.response?.status);
    return `${symbol}: Error fetching price`;
  }
};

// Integration Schema
app.get('/integration.json', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    data: {
      descriptions: {
        app_name: "Stock Price Monitor",
        app_description: "Monitors stock prices",
        app_url: baseUrl,
        app_logo: "https://i.imgur.com/lZqvffp.png",
        background_color: "#fff"
      },
      integration_type: "interval",
      settings: [
        { label: "symbol-1", type: "text", required: true, default: "AAPL" },
        { label: "symbol-2", type: "text", required: true, default: "MSFT" },
        { label: "interval", type: "text", required: true, default: "* * * * *" }
      ],
      tick_url: `${baseUrl}/tick`
    }
  });
});

// Monitor Task
const monitorTask = async (payload) => {
  try {
    const symbols = payload.settings
      .filter(setting => setting.label.startsWith('symbol'))
      .map(setting => setting.default);

    const results = await Promise.all(
      symbols.map(symbol => fetchStockPrice(symbol))
    );

    const message = results.join("\n");
    const status = results.every(r => r.includes("USD")) ? "success" : "error";

    const data = {
      event_name: "Stock Price Update",
      message: message,
      status: status,
      username: "Stock Monitor"
    };

    // Send to dynamic Telex URL
    await axios.post(payload.return_url, data, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error('Monitor task failed:', error);
  }
};

// Tick Endpoint
app.post('/tick', async (req, res) => {
  try {
    const payload = req.body;
    monitorTask(payload).catch(console.error);
    res.status(202).json({ status: 'accepted' });
  } catch (error) {
    console.error('Tick endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
  
   return app;
}
if (process.env.NODE_ENV !== 'test') {
  const server = createApp().listen(port, () => {
    console.log(`Stock Monitor running on http://localhost:${port}`);
  });
}

// Export for testing
module.exports = createApp();
