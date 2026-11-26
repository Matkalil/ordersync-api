import type { PoolClient, Pool } from 'pg';
import type { OrderWebhookPayload } from '../schemas/order-webhook.schema';
import type { OrderStatus } from '../schemas/order-query.schema';

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

type Queryable = Pool | PoolClient;

export interface OrderFilters {
  status?: OrderStatus;
  from?: string;
  to?: string;
}

export interface OrderSummary {
  id: string;
  store: string;
  externalId: string;
  customerName: string;
  currency: string;
  totalCents: number;
  status: OrderStatus;
  placedAt: Date;
  createdAt: Date;
}

function buildWhere(filters: OrderFilters): { where: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.from) {
    values.push(filters.from);
    conditions.push(`placed_at >= $${values.length}`);
  }
  if (filters.to) {
    values.push(filters.to);
    conditions.push(`placed_at <= $${values.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, values };
}

export async function findOrders(
  db: Queryable,
  filters: OrderFilters,
  limit: number,
  offset: number,
): Promise<OrderSummary[]> {
  const { where, values } = buildWhere(filters);

  const result = await db.query<OrderSummary>(
    `SELECT id, store, external_id AS "externalId", customer_name AS "customerName",
            currency, total_cents AS "totalCents", status,
            placed_at AS "placedAt", created_at AS "createdAt"
     FROM orders
     ${where}
     ORDER BY created_at DESC, id
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );

  return result.rows;
}

export async function countOrders(db: Queryable, filters: OrderFilters): Promise<number> {
  const { where, values } = buildWhere(filters);

  const result = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM orders ${where}`,
    values,
  );

  return result.rows[0]?.total ?? 0;
}

export interface OrderRecord extends OrderSummary {
  customerEmail: string;
  rawPayload: unknown;
  updatedAt: Date;
}

export interface OrderItems {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderStatusChange {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  reason: string | null;
  changedAt: Date;
}

export async function findOrderById(db: Queryable, id: string): Promise<OrderRecord | null> {
  const result = await db.query<OrderRecord>(
    `SELECT id, store, external_id AS "externalId", customer_name AS "customerName",
            customer_email AS "customerEmail", currency, total_cents AS "totalCents", status,
            raw_payload AS "rawPayload", placed_at AS "placedAt",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM orders
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function findOrderItems(db: Queryable, orderId: string): Promise<OrderItems[]> {
  const result = await db.query<OrderItems>(
    `SELECT id, sku, name, quantity, unit_price_cents AS "unitPriceCents"
     FROM order_items
     WHERE order_id = $1
     ORDER BY sku`,
    [orderId],
  );

  return result.rows;
}

export async function findOrderHistory(
  db: Queryable,
  orderId: string,
): Promise<OrderStatusChange[]> {
  const result = await db.query<OrderStatusChange>(
    `SELECT from_status AS "fromStatus", to_status AS "toStatus", reason,
            changed_at AS "changedAt"
     FROM order_status_history
     WHERE order_id = $1
     ORDER BY changed_at`,
    [orderId],
  );

  return result.rows;
}

export async function findOrderStatusForUpdate(
  client: PoolClient,
  id: string,
): Promise<OrderStatus | null> {
  const result = await client.query<{ status: OrderStatus }>(
    'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
    [id],
  );

  return result.rows[0]?.status ?? null;
}

export async function updateOrderStatus(
  client: PoolClient,
  id: string,
  status: OrderStatus,
): Promise<void> {
  await client.query('UPDATE orders SET status = $1, updated_at = now() WHERE id = $2', [
    status,
    id,
  ]);
}
