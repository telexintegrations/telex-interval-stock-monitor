# Telex Interval Stock Monitor 📈

A Telex interval integration that monitors stock prices and posts updates to channels at configurable intervals using the Finage API.

## Features

- Real-time stock price monitoring
- Configurable symbols (e.g., AAPL, MSFT)
- Cron-based scheduling
- Error handling and retries

## Installation

```bash
git clone https://github.com/telex_integrations/telex-interval-stock-monitor.git
cd telex-interval-stock-monitor
npm install
```

## Usage

1. Copy the [`.env.example`](./.env.example) file to `.env` and fill in the required environment variables:

    ```bash
    cp .env.example .env
    ```

    Fill in your `FINAGE_API_KEY`, `PORT`, and `TELEX_WEBHOOK_URL` in the .env file.

2. Start the application:

    ```bash
    npm start
    ```

3. The application will run on the port specified in the .env file or default to port 3000.

## Endpoints

### GET [/integration.json](http://_vscodecontentref_/2)

Returns the integration schema for the Telex interval integration.

**Response:**

```json
{
  "data": {
    "descriptions": {
      "app_name": "Stock Price Monitor",
      "app_description": "Monitors stock prices using real-time data",
      "app_url": "deployed-app.com",
      "app_logo": "https://i.imgur.com/lZqvffp.png",
      "background_color": "#fff"
    },
    "integration_category": "Finance & Payments",  
    "key_features": [
      "Monitor up to 6 customizable stock symbols",
      "Receive real-time price updates via webhook",
      "Configurable update intervals using cron syntax",
      "Built with Node.js, Express, and Finage API"
    ],
    "integration_type": "interval",
    "settings": [
      { "label": "symbol-1", "type": "text", "required": true, "default": "AAPL" },
      { "label": "symbol-2", "type": "text", "required": true, "default": "MSFT" },
      { "label": "symbol-3", "type": "text", "required": true, "default": "GOOGL" },
      { "label": "symbol-4", "type": "text", "required": true, "default": "AMZN" },
      { "label": "symbol-5", "type": "text", "required": true, "default": "TSLA" },
      { "label": "symbol-6", "type": "text", "required": true, "default": "META" },
      {
            "label": "interval",
            "type": "text",
            "description": "Select how frequently you want to receive stock price updates.",
            "required": true,
            "default": "*/5 * * * *"   
          }
    ],
    "tick_url": "https://deployed-app.com/api/tick",
    "target_url": "https://deployed-app.com/api/integration"  
  }
}
```

### POST /tick

Accepts a payload to trigger the stock price monitoring task.

**Request Body:**

```json
{
  "return_url": "https://ping.telex.im/v1/return/<your-test-telex-channel-id>",
  "settings": [
    { "label": "symbol-1", "type": "text", "default": "AAPL" },
    { "label": "symbol-2", "type": "text", "default": "MSFT" },
    { "label": "symbol-3", "type": "text", "default": "GOOGL" },
    { "label": "symbol-4", "type": "text", "default": "AMZN" },
    { "label": "symbol-5", "type": "text", "default": "TSLA" },
    { "label": "symbol-6", "type": "text", "default": "META" },
    { "label": "interval", "type": "dropdown", "default": "*/5 * * * *" }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Tick received and scheduled"
}
```

### POST /stop

Stops the scheduled cron job for the specified return URL.

**Request Body:**

```json
{
  "return_url": "https://ping.telex.im/v1/return/<your-test-telex-channel-id>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Job stopped successfully"
}
```

### GET /verify-api

Verifies the Finage API key by making a test request to fetch the stock price for AAPL.

**Response:**

```json
{
  "status": 200,
  "data": {
    "symbol": "AAPL",
    "price": 150.00
  }
}
```

## Running Tests

To run the integration tests:

```bash
npm test
```

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Open a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
