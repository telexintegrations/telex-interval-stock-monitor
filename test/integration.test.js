const request = require('supertest');
const nock = require('nock');
const app = require('../src/app');
const cron = require('node-cron');

describe('Stock Monitor Integration', () => {
  let server;
  const activeJobs = new Map();

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    // Stop all active cron jobs
    activeJobs.forEach((job) => job.stop());
    server.close(done);
  });

  beforeEach(() => {
    nock.cleanAll();
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

    nock('https://api.finage.co.uk')
      .get('/last/trade/stock/AAPL')
      .query(true)
      .reply(200, { price: 150 });

    nock('https://ping.telex.im')
      .post('/v1/webhooks/test')
      .reply(200, { status: 'success' });

    const res = await request(app)
      .post('/tick')
      .send(testPayload);
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Tick received and scheduled' });

    // Schedule and store the job for cleanup
    const interval = testPayload.settings.find(s => s.label === 'interval')?.default || '* * * * *';
    const job = cron.schedule(interval, async () => {
      console.log(`Running scheduled task for return_url: ${testPayload.return_url}`);
      await monitorTask({ return_url: testPayload.return_url, settings: testPayload.settings });
    });
    activeJobs.set(testPayload.return_url, job);
  });
});