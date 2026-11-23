CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL
        CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL
        CHECK (unit_price_cents >= 0)
);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);

CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status TEXT NULL
        CHECK (from_status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
    to_status TEXT NOT NULL
        CHECK (to_status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
    reason TEXT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (from_status IS DISTINCT FROM to_status)
);
CREATE INDEX idx_order_status_history_order_id ON order_status_history (order_id);