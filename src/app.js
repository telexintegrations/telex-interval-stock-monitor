require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const port = process.env.PORT || 3000;

const createApp = () => {
  const app = express();

  // Middleware
  app.use(bodyParser.json());

  // Stock Price Fetching with Finage API
  const fetchStockPrice = async (symbol) => {
  const url = `https://api.finage.co.uk/last/trade/stock/${symbol}?apikey=${process.env.FINAGE_API_KEY}`;
  
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip,deflate'
      }
    });

    if (response.data?.price) {
      // Round to 2 decimal places
      const roundedPrice = Math.round(response.data.price * 100) / 100;
      return `${symbol}: $${roundedPrice.toFixed(2)} USD`;
    }
    return `${symbol}: Price data unavailable`;

  } catch (error) {
    console.error(`Request Failed for ${symbol}:`, error.message);
    return `${symbol}: Service temporarily unavailable`;
  }
};

  // Integration Schema Endpoint
  app.get('/integration.json', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      data: {
        descriptions: {
          app_name: "Stock Price Monitor",
          app_description: "Monitors stock prices using real-time data",
          app_url: baseUrl,
          app_logo: "https://i.imgur.com/lZqvffp.png",
          background_color: "#fff"
        },
        integration_type: "interval",
        settings: [
          { label: "symbol-1", type: "text", required: true, default: "AAPL" },
          { label: "symbol-2", type: "text", required: true, default: "MSFT" },
          { label: "interval", type: "text", required: true, default: "*/5 * * * *" }
        ],
        tick_url: `${baseUrl}/tick`
      }
    });
  });

  // Monitoring Task
  const monitorTask = async (payload) => {
    try {
      const symbols = payload.settings
        .filter(setting => setting.label.startsWith('symbol'))
        .map(setting => setting.default);

      // Add delay between requests to avoid rate limiting
      const results = [];
      for (const symbol of symbols) {
        const result = await fetchStockPrice(symbol);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }

      const message = results.join("\n");
      const status = results.every(r => r.includes("USD")) ? "success" : "error";

      const data = {
        event_name: "Stock Price Update",
        message: message,
        status: status,
        username: "Stock Monitor"
      };

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
      // Validate required fields
      if (!req.body?.return_url) {
        return res.status(400).json({ error: "Missing return_url" });
      }

      const payload = req.body;
      monitorTask(payload);
      res.status(202).json({ status: 'accepted' });

    } catch (error) {
      console.error('Tick endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // API Verification Endpoint
  app.get('/verify-api', async (req, res) => {
    try {
      const testUrl = `https://api.finage.co.uk/last/trade/stock/AAPL?apikey=${process.env.FINAGE_API_KEY}`;
      const response = await axios.get(testUrl);
      res.json({
        status: response.status,
        data: response.data
      });
    } catch (error) {
      res.status(500).json({
        error: 'API Verification Failed',
        details: error.response?.data || error.message
      });
    }
  });

  return app;
};

// Start server unless in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = createApp().listen(port, () => {
    console.log(`Stock Monitor running on http://localhost:${port}`);
  });
}

// Export for testing
module.exports = createApp();