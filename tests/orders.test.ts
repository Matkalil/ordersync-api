import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app';
import { env } from '../src/config/env';
import { createOrder, setStatus } from './helpers/orders';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

function api() {
  return {
    get: (url: string) => request(app).get(url).set('x-api-key', env.API_KEY),
    patch: (url: string) => request(app).patch(url).set('x-api-key', env.API_KEY),
  };
}

describe('GET /orders', () => {
  let ids: string[];
  beforeEach(async () => {
    ids = [];
    ids.push(await createOrder({ id: 'ORD-1', createdAt: '2026-11-01T10:00:00Z' }));
    ids.push(await createOrder({ id: 'ORD-2', createdAt: '2026-11-10T10:00:00Z' }));
    ids.push(await createOrder({ id: 'ORD-3', createdAt: '2026-11-20T10:00:00Z' }));
  });
  it('paginates newest first with meta', async () => {
    const page1 = await api().get('/orders?limit=2');
    const page2 = await api().get('/orders?limit=2&page=2');

    expect(page1.status).toBe(200);
    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 3 });
    expect(page1.body.data.map((o: { externalId: string }) => o.externalId)).toEqual([
      'ORD-3',
      'ORD-2',
    ]);

    expect(page2.status).toBe(200);
    expect(page2.body.data.map((o: { externalId: string }) => o.externalId)).toEqual(['ORD-1']);
  });

  it('filters by status', async () => {
    await setStatus(ids[1]!, 'paid');

    const res = await api().get('/orders?status=paid');

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data.map((o: { externalId: string }) => o.externalId)).toEqual(['ORD-2']);
  });

  it('filters by placed date range (inclusive)', async () => {
    const res = await api().get('/orders?from=2026-11-05T00:00:00Z&to=2026-11-20T10:00:00Z');

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data.map((o: { externalId: string }) => o.externalId)).toEqual([
      'ORD-3',
      'ORD-2',
    ]);
  });

  it('does not expose rawPayload in the list', async () => {
    const res = await api().get('/orders');

    expect(res.status).toBe(200);
    expect(res.body.data[0]).not.toHaveProperty('rawPayLoad');
  });

  it('returns 400 for an invalid limit', async () => {
    const res = await api().get('/orders?limit=101');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /orders/:id', () => {
  it('returns the order with items and history', async () => {
    const id = await createOrder();
    const res = await api().get(`/orders/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0]).toMatchObject({
      fromStatus: null,
      toStatus: 'pending',
    });
  });

  it('returns 404 when the order does not exist', async () => {
    const res = await api().get(`/orders/${MISSING_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('returns 400 for a non-UUID id', async () => {
    const res = await api().get('/orders/abc');

    expect(res.status).toBe(400);
  });
});

describe('PATCH /orders/:id/status', () => {
  it('returns 200 and records the change in the history', async () => {
    const id = await createOrder();

    const res = await api()
      .patch(`/orders/${id}/status`)
      .send({ status: 'paid', reason: 'Payment confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');
    expect(res.body.history).toHaveLength(2);
    expect(res.body.history[1]).toMatchObject({
      fromStatus: 'pending',
      toStatus: 'paid',
      reason: 'Payment confirmed',
    });
  });

  it('returns 409 for an invalid transition and keeps the status', async () => {
    const id = await createOrder();

    const res = await api().patch(`/orders/${id}/status`).send({ status: 'shipped' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(res.body.error.details.allowed).toEqual(['paid', 'cancelled']);

    const order = await api().get(`/orders/${id}`);
    expect(order.body.status).toBe('pending');
    expect(order.body.history).toHaveLength(1);
  });

  it('returns 404 when the order does not exist', async () => {
    const res = await api().patch(`/orders/${MISSING_ID}/status`).send({ status: 'paid' });

    expect(res.status).toBe(404);
  });
});
