import { withTransaction } from '../db/pool';
import {
  findOrderId,
  insertItems,
  insertOrder,
  insertStatusHistory,
} from '../repositories/orders.repository';
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
