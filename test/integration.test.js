const request = require('supertest');
const app = require('../src/app');

describe('Stock Monitor Integration', () => {
  let server;

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should return valid integration schema', async () => {
    const res = await request(app).get('/integration.json');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      integration_type: 'interval',
      descriptions: {
        app_name: 'Stock Price Monitor'
      }
    });
  });

  it('should accept tick payload', async () => {
    const testPayload = {
      channel_id: "test-channel",
      return_url: "https://ping.telex.im/v1/webhooks/test",
      settings: [
        { label: "symbol-1", default: "AAPL" },
        { label: "interval", default: "* * * * *" }
      ]
    };

    const res = await request(app)
      .post('/tick')
      .send(testPayload);
    
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ status: 'accepted' });
  });
});