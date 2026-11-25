import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { env } from '../src/config/env';
import { parseArgs } from 'node:util';

const WEBHOOK_URL = `http://localhost:${env.PORT}/webhooks/orders`;

const CUSTOMERS = [
  { name: 'John Smith', email: 'john.smith@example.com' },
  { name: 'Emily Johnson', email: 'emily.johnson@example.com' },
  { name: 'Michael Brown', email: 'michael.brown@example.com' },
  { name: 'Sarah Davis', email: 'sarah.davis@example.com' },
];

const PRODUCTS = [
  { sku: 'TSHIRT-BLK-M', name: 'Black T-Shirt M', unitPrice: 4990 },
  { sku: 'CAP-RED', name: 'Red Cap', unitPrice: 6000 },
  { sku: 'MUG-WHT', name: 'White Mug', unitPrice: 3500 },
  { sku: 'HOODIE-GRY-L', name: 'Grey Hoodie L', unitPrice: 15990 },
];

function pick<T>(list: T[]): T {
  return list[randomInt(list.length)]!;
}

function generateOrder() {
  const items = Array.from({ length: randomInt(1, 4) }, () => ({
    ...pick(PRODUCTS),
    quantity: randomInt(1, 4),
  }));

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return {
    id: `SIM-${randomUUID().slice(0, 8)}`,
    store: 'demo-store',
    customer: pick(CUSTOMERS),
    currency: 'BRL',
    total,
    items,
    createdAt: new Date().toISOString(),
  };
}

function sign(body: string): string {
  return createHmac('sha256', env.WEBHOOK_SECRET).update(body).digest('hex');
}

async function sendOrder(
  order: ReturnType<typeof generateOrder>,
  badSignature: boolean,
): Promise<void> {
  const body = JSON.stringify(order);
  const signature = badSignature ? 'invalid-signature' : sign(body);

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': signature,
    },
    body,
  });

  const data = await res.json();
  console.log(`[${order.id}] Status ${res.status}:`, data);
}

async function main() {
  const { values } = parseArgs({
    options: {
      count: { type: 'string', short: 'c', default: '1' },
      duplicate: { type: 'boolean', default: false },
      'bad-signature': { type: 'boolean', default: false },
    },
  });

  const count = Number(values.count);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('--count must be a positive integer');
  }

  for (let i = 0; i < count; i++) {
    const order = generateOrder();
    await sendOrder(order, values['bad-signature']);

    if (values.duplicate) {
      await sendOrder(order, values['bad-signature']);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
