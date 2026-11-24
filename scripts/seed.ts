import { pool, withTransaction } from '../src/db/pool';

const ORDER_COUNT = 20;
const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const;

const CUSTOMERS = [
  { name: 'John Smith', email: 'john.smith@example.com' },
  { name: 'Emily Johnson', email: 'emily.johnson@example.com' },
  { name: 'Michael Brown', email: 'michael.brown@example.com' },
  { name: 'Sarah Davis', email: 'sarah.davis@example.com' },
];

const PRODUCTS = [
  { sku: 'TSHIRT-BLK-M', name: 'Black T-shirt M', unitPrice: 4990 },
  { sku: 'MUG-WHITE', name: 'White Mug', unitPrice: 2990 },
  { sku: 'CAP-BLUE', name: 'Blue Cap', unitPrice: 3990 },
  { sku: 'STICKER-PACK', name: 'Sticker Pack', unitPrice: 990 },
];

// Cycles through the list; the check satisfies noUncheckedIndexedAccess
function pick<T>(list: readonly T[], i: number): T {
  const value = list[i % list.length];
  if (value === undefined) throw new Error('Empty list');
  return value;
}

// Same shape as the webhook payload, so raw_payload looks like a real order
function buildOrder(i: number) {
  const items = Array.from({ length: (i % 3) + 1 }, (_, j) => ({
    ...pick(PRODUCTS, i + j),
    quantity: (j % 2) + 1,
  }));

  return {
    id: `SEED-${String(i + 1).padStart(3, '0')}`,
    store: 'seed-store',
    customer: pick(CUSTOMERS, i),
    currency: 'BRL',
    total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    items,
    createdAt: new Date(Date.UTC(2026, 10, 1 + i)).toISOString(),
  };
}

async function main() {
  let inserted = 0;

  for (let i = 0; i < ORDER_COUNT; i++) {
    const order = buildOrder(i);
    const status = pick(STATUSES, i);

    const created = await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO orders
           (external_id, store, customer_name, customer_email, currency,
            total_cents, status, raw_payload, placed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT ON CONSTRAINT orders_store_external_id_key DO NOTHING
         RETURNING id`,
        [
          order.id,
          order.store,
          order.customer.name,
          order.customer.email,
          order.currency,
          order.total,
          status,
          JSON.stringify(order),
          order.createdAt,
        ],
      );

      // No row back = the order already existed: skip it (safe to re-run)
      const orderId = rows[0]?.id;
      if (!orderId) return false;

      for (const item of order.items) {
        await client.query(
          `INSERT INTO order_items (order_id, sku, name, quantity, unit_price_cents)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, item.sku, item.name, item.quantity, item.unitPrice],
        );
      }

      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, reason)
         VALUES ($1, NULL, $2, 'seed')`,
        [orderId, status],
      );

      return true;
    });

    if (created) inserted++;
  }

  console.log(`Seeded ${inserted} orders (${ORDER_COUNT - inserted} already existed)`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
