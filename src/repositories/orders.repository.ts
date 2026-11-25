import type { PoolClient } from 'pg';
import type { OrderWebhookPayload } from '../schemas/order-webhook.schema';

type OrderItemPayload = OrderWebhookPayload['items'][number];

export async function insertOrder(
  client: PoolClient,
  payload: OrderWebhookPayload,
  rawPayload: unknown,
): Promise<string | null> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO orders (
       store, external_id, customer_name, customer_email,
       currency, total_cents, placed_at, raw_payload
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT ON CONSTRAINT orders_store_external_id_key DO NOTHING
     RETURNING id`,
    [
      payload.store,
      payload.id,
      payload.customer.name,
      payload.customer.email,
      payload.currency,
      payload.total,
      payload.createdAt,
      JSON.stringify(rawPayload),
    ],
  );

  return result.rows[0]?.id ?? null;
}

export async function findOrderId(
  client: PoolClient,
  store: string,
  externalId: string,
): Promise<string | null> {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM orders WHERE store = $1 AND external_id = $2`,
    [store, externalId],
  );

  return result.rows[0]?.id ?? null;
}

export async function insertItems(
  client: PoolClient,
  orderId: string,
  items: OrderItemPayload[],
): Promise<void> {
  for (const item of items) {
    await client.query(
      `INSERT INTO order_items (order_id, sku, name, quantity, unit_price_cents)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, item.sku, item.name, item.quantity, item.unitPrice],
    );
  }
}

export async function insertStatusHistory(
  client: PoolClient,
  orderId: string,
  fromStatus: string | null,
  toStatus: string,
  reason?: string,
): Promise<void> {
  await client.query(
    `INSERT INTO order_status_history (order_id, from_status, to_status, reason)
     VALUES ($1, $2, $3, $4)`,
    [orderId, fromStatus, toStatus, reason ?? null],
  );
}
