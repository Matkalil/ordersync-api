import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app';
import { pool } from '../src/db/pool';
import { buildOrderPayload, sendWebhook, signBody } from './helpers/webhook';

async function countRows(table: 'orders' | 'order_items' | 'order_status_history') {
  const { rows } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM ${table}`,
  );
  return rows[0]!.count;
}

describe('POST /webhooks/orders', () => {
  it('returns 201 and stores a valid order', async () => {
    const res = await sendWebhook(buildOrderPayload());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), duplicate: false });
    expect(await countRows('orders')).toBe(1);
    expect(await countRows('order_items')).toBe(2);
    expect(await countRows('order_status_history')).toBe(1);
  });
  it('returns 400 for an invalid payload with a valid signature', async () => {
    const res = await sendWebhook(buildOrderPayload({ items: [] }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await countRows('orders')).toBe(0);
  });
  it('returns 401 without a signature', async () => {
    const res = await request(app)
      .post('/webhooks/orders')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(buildOrderPayload()));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
  });

  it('returns 401 with a wrong signature', async () => {
    const res = await sendWebhook(buildOrderPayload(), 'invalid-signature');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    expect(await countRows('orders')).toBe(0);
  });

  it('returns 401 when the body was changed after signing', async () => {
    const payload = buildOrderPayload();
    const signature = signBody(JSON.stringify(payload));

    const res = await sendWebhook({ ...payload, total: 1 }, signature);

    expect(res.status).toBe(401);
  });

  it('returns 200 on a duplicate and keeps a single row', async () => {
    const payload = buildOrderPayload();

    const first = await sendWebhook(payload);
    const second = await sendWebhook(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ id: first.body.id, duplicate: true });
    expect(await countRows('orders')).toBe(1);
    expect(await countRows('order_items')).toBe(2);
  });
});
