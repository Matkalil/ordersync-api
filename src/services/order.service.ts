import { pool, withTransaction } from '../db/pool';
import { ALLOWED_TRANSITIONS, canTransition } from '../domain/order-status';
import { AppError } from '../errors/app-error';
import {
  countOrders,
  findOrderById,
  findOrderHistory,
  findOrderId,
  findOrderItems,
  findOrders,
  findOrderStatusForUpdate,
  insertItems,
  insertOrder,
  insertStatusHistory,
  updateOrderStatus,
  type OrderItems,
  type OrderRecord,
  type OrderStatusChange,
  type OrderSummary,
} from '../repositories/orders.repository';
import type { ListOrdersQuery, OrderStatus } from '../schemas/order-query.schema';
import type { OrderWebhookPayload } from '../schemas/order-webhook.schema';

export interface IngestOrderResult {
  id: string;
  created: boolean;
}

export async function ingestOrder(
  payload: OrderWebhookPayload,
  rawPayload: unknown,
): Promise<IngestOrderResult> {
  return withTransaction(async (client) => {
    const insertedId = await insertOrder(client, payload, rawPayload);

    if (!insertedId) {
      const existingId = await findOrderId(client, payload.store, payload.id);
      if (!existingId) {
        throw new Error('Order conflict detected but existing order was not found');
      }
      return { id: existingId, created: false };
    }

    await insertItems(client, insertedId, payload.items);
    await insertStatusHistory(client, insertedId, null, 'pending', 'Order received via webhook');

    return { id: insertedId, created: true };
  });
}

export interface PaginatedOrders {
  data: OrderSummary[];
  meta: { page: number; limit: number; total: number };
}

export async function getOrders(query: ListOrdersQuery): Promise<PaginatedOrders> {
  const { page, limit, ...filters } = query;
  const offset = (page - 1) * limit;

  const [data, total] = await Promise.all([
    findOrders(pool, filters, limit, offset),
    countOrders(pool, filters),
  ]);

  return { data, meta: { page, limit, total } };
}

export interface OrderDetail extends OrderRecord {
  items: OrderItems[];
  history: OrderStatusChange[];
}

export async function getOrderById(id: string): Promise<OrderDetail> {
  const order = await findOrderById(pool, id);

  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  const [items, history] = await Promise.all([
    findOrderItems(pool, id),
    findOrderHistory(pool, id),
  ]);

  return { ...order, items, history };
}

export async function changeOrderStatus(
  id: string,
  to: OrderStatus,
  reason?: string,
): Promise<OrderDetail> {
  await withTransaction(async (client) => {
    const from = await findOrderStatusForUpdate(client, id);

    if (!from) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    if (!canTransition(from, to)) {
      throw new AppError(
        409,
        'INVALID_STATUS_TRANSITION',
        `Cannot change status from ${from} to ${to}`,
        { from, to, allowed: ALLOWED_TRANSITIONS[from] },
      );
    }

    await updateOrderStatus(client, id, to);
    await insertStatusHistory(client, id, from, to, reason);
  });

  return getOrderById(id);
}
