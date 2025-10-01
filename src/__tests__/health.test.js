import request from 'supertest';
import app from '../server.js';

describe('Health Endpoint', () => {
  test('GET /api/health should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('memory');
    expect(response.body.status).toBe('healthy');
  });

  test('GET / should return API info', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('status');
    expect(response.body.message).toBe('Andru Assessment API');
  });
});
