import { z } from 'zod';

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const listOrdersQuerySchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (q) => {
      if (!q.from || !q.to) return true;
      return new Date(q.from) <= new Date(q.to);
    },
    { message: '"from" must be before or equal to "to"', path: ['from'] },
  );

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
