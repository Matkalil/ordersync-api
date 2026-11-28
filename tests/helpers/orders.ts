import { pool } from '../../src/db/pool';
import type { OrderStatus } from '../../src/schemas/order-query.schema';
import type { OrderWebhookPayload } from '../../src/schemas/order-webhook.schema';
import { buildOrderPayload, sendWebhook } from './webhook';

export async function createOrder(overrides: Partial<OrderWebhookPayload> = {}): Promise<string> {
  const res = await sendWebhook(buildOrderPayload(overrides));
  if (res.status !== 201) {
    throw new Error(`createOrder failed with status ${res.status}`);
  }
  return res.body.id;
}

export async function setStatus(id: string, status: OrderStatus): Promise<void> {
  await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
}
