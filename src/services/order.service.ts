import { withTransaction, pool } from '../db/pool';
import {
  findOrderId,
  findOrders,
  insertItems,
  insertOrder,
  insertStatusHistory,
  countOrders,
} from '../repositories/orders.repository';
import type { OrderWebhookPayload } from '../schemas/order-webhook.schema';
import type { OrderSummary } from '../repositories/orders.repository';
import type { ListOrdersQuery } from '../schemas/order-query.schema';

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
