import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app';
import { env } from '../src/config/env';

describe('GET /health', () => {
  it('returns 200 when the database is up', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });
});

describe('GET /orders on a clean database', () => {
  it('returns 401 without API Key', async () => {
    const res = await request(app).get('/orders');

    expect(res.status).toBe(401);
  });

  it('returns an empty list', async () => {
    const res = await request(app).get('/orders').set('x-api-key', env.API_KEY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
      },
    });
  });
});
