import { createHmac } from 'node:crypto';
import request from 'supertest';
import app from '../../src/app';
import { env } from '../../src/config/env';
import type { OrderWebhookPayload } from '../../src/schemas/order-webhook.schema';

export function buildOrderPayload(
  overrides: Partial<OrderWebhookPayload> = {},
): OrderWebhookPayload {
  return {
    id: 'ORD-TEST-1',
    store: 'test-store',
    customer: { name: 'John Smith', email: 'john.smith@example.com' },
    currency: 'BRL',
    total: 15980,
    items: [
      { sku: 'TSHIRT-BLK-M', name: 'Black T-Shirt M', quantity: 2, unitPrice: 4990 },
      { sku: 'CAP-RED', name: 'Red Cap', quantity: 1, unitPrice: 6000 },
    ],
    createdAt: '2026-11-25T18:00:00-03:00',
    ...overrides,
  };
}

export function signBody(body: string): string {
  return createHmac('sha256', env.WEBHOOK_SECRET).update(body).digest('hex');
}

export function sendWebhook(payload: unknown, signature?: string) {
  const body = JSON.stringify(payload);

  return request(app)
    .post('/webhooks/orders')
    .set('Content-Type', 'application/json')
    .set('x-signature', signature ?? signBody(body))
    .send(body);
}
