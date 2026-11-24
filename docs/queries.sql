-- GET /orders?status=paid  (filter, newest first)
SELECT id, store, external_id, customer_name, currency, total_cents, status, placed_at, created_at
FROM orders
WHERE status = 'paid'
ORDER BY created_at DESC, id;

-- GET /orders?page=2&limit=5  (pagination)
SELECT id, store, external_id, customer_name, currency, total_cents, status, placed_at, created_at
FROM orders
ORDER BY created_at DESC, id
LIMIT 5 OFFSET 5;

-- GET /orders?status=paid  (total for meta.total)
SELECT COUNT(*) AS total
FROM orders
WHERE status = 'paid';

-- GET /orders?status=paid&page=2&limit=2  (filter + pagination together)
SELECT id, store, external_id, customer_name, currency, total_cents, status, placed_at, created_at
FROM orders
WHERE status = 'paid'
ORDER BY created_at DESC, id
LIMIT 2 OFFSET 2;

-- GET /orders/:id  (items of one order)
SELECT oi.id, oi.sku, oi.name, oi.quantity, oi.unit_price_cents
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.external_id = 'SEED-001';

-- GET /orders/:id  (status history of one order)
SELECT h.from_status, h.to_status, h.reason, h.changed_at
FROM order_status_history h
JOIN orders o ON o.id = h.order_id
WHERE o.external_id = 'SEED-001'
ORDER BY h.changed_at;