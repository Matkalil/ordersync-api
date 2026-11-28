import { describe, expect, it } from 'vitest';
import { ALLOWED_TRANSITIONS, canTransition } from '../src/domain/order-status';
import { ORDER_STATUSES, type OrderStatus } from '../src/schemas/order-query.schema';

type Transition = [from: OrderStatus, to: OrderStatus];

// The 5 allowed transitions, written by hand from the business rule (issue #23)
const ALLOWED: Transition[] = [
  ['pending', 'paid'],
  ['paid', 'shipped'],
  ['shipped', 'delivered'],
  ['pending', 'cancelled'],
  ['paid', 'cancelled'],
];

const FORBIDDEN: Transition[] = ORDER_STATUSES.flatMap((from) =>
  ORDER_STATUSES.map((to): Transition => [from, to]),
).filter(([from, to]) => !ALLOWED.some(([a, b]) => a === from && b === to));

describe('canTransition', () => {
  it.each(ALLOWED)('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each(FORBIDDEN)('forbids %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('covers all 25 combinations', () => {
    expect(ALLOWED.length + FORBIDDEN.length).toBe(ORDER_STATUSES.length ** 2);
  });
});

describe('ALLOWED_TRANSITIONS', () => {
  it('treats delivered and cancelled as final states', () => {
    expect(ALLOWED_TRANSITIONS.delivered).toEqual([]);
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
  });
});
