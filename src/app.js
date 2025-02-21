require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const activeJobs = new Map();
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
        date: {
          'created_at': '2025-02-18',
          'updated_at': '2025-03-18'
        },
        descriptions: {
          app_name: "Stock Price Monitor",
          app_description: "Monitors stock prices using real-time data",
          app_url: baseUrl,
          app_logo: "https://i.imgur.com/GJk2N57.png",
          background_color: "#fff",
        },
        integration_category: "Finance & Payments",
        key_features: [
          "Monitor up to 6 customizable stock symbols",
          "Receive real-time price updates via webhook",
          "Configurable update intervals using cron syntax",
          "Built with Node.js, Express, and Finage API",

        ],
        integration_type: "interval",
        settings: [
          { label: "symbol-1", type: "text", required: true, default: "AAPL" },
          { label: "symbol-2", type: "text", required: true, default: "MSFT" },
          { label: "symbol-3", type: "text", required: true, default: "GOOGL" },
          { label: "symbol-4", type: "text", required: true, default: "AMZN" },
          { label: "symbol-5", type: "text", required: true, default: "TSLA" },
          { label: "symbol-6", type: "text", required: true, default: "META" },
          {
            label: "interval",
            type: "text",
            description: "Select how frequently you want to receive stock price updates.",
            required: true,
            default: "*/5 * * * *"   
          }
        ],
        tick_url: `${baseUrl}/tick`,
        target_url: `${baseUrl}/api/integration`
      }
    });
  });

  // Monitoring Task
  const monitorTask = async (payload) => {
  try {
    const symbols = payload.settings
      .filter(setting => setting.label.startsWith('symbol'))
      .map(setting => setting.default);

    console.log('Tracking stocks:', symbols.join(', '));
    console.log('Schedule:', payload.settings.find(s => s.label === 'interval')?.default);

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

    console.log('Stock data prepared:', data);

    const response = await axios.post(payload.return_url, data, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    console.log('Webhook sent successfully:', response.data);

  } catch (error) {
    console.error('Monitor task failed:', error.response?.data || error.message);
  }
};

// Tick Endpoint
app.post('/tick', async (req, res) => {
    console.log('Received tick request:', JSON.stringify(req.body, null, 2));

    let { return_url, settings } = req.body;
    if (!return_url) {
        return_url = process.env.TELEX_WEBHOOK_URL;
        if (!return_url) {
            return res.status(400).json({ error: 'Missing return_url' });
        }
    }

    const intervalSetting = settings.find(s => s.label === 'interval');
    const interval = intervalSetting ? intervalSetting.default : '* * * * *';

    console.log(`Schedule: ${interval}`);

    // Stop any existing job for the return_url
    if (activeJobs.has(return_url)) {
        console.log(`Stopping existing cron job for ${return_url}`);
        const existingJob = activeJobs.get(return_url);
        existingJob.stop();
        activeJobs.delete(return_url);
    }

    // Schedule and store the new job
    const job = cron.schedule(interval, async () => {
        console.log(`Running scheduled task for return_url: ${return_url}`);
        await monitorTask({ return_url, settings });
    });

    activeJobs.set(return_url, job);
    res.json({ success: true, message: 'Tick received and scheduled' });
});

app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body); // Logs Telex's response
  res.sendStatus(200); // Responds OK to Telex
});
  
  // stop monitoring

  app.post('/stop', (req, res) => {
  const { return_url } = req.body;
  const job = activeJobs.get(return_url);
  if (job) {
    job.stop();
    activeJobs.delete(return_url);
    return res.json({ success: true, message: 'Job stopped successfully' });
  }
  res.status(404).json({ error: 'No active job found for this return_url' });
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