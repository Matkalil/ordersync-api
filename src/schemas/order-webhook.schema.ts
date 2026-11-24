import { z } from 'zod';

export const orderWebhookSchema = z.object({
  id: z.string().min(1).max(100),
  store: z.string().min(1).max(50),
  customer: z.object({
    name: z.string().min(1).max(150),
    email: z.email().max(254),
  }),
  currency: z.string().regex(/^[A-Z]{3}$/),
  total: z.number().int().nonnegative(),
  items: z
    .array(
      z.object({
        sku: z.string().min(1).max(100),
        name: z.string().min(1).max(150),
        quantity: z.number().int().positive(),
        unitPrice: z.number().int().nonnegative(),
      }),
    )
    .min(1),
  createdAt: z.iso.datetime({ offset: true }),
});

export type OrderWebhookPayload = z.infer<typeof orderWebhookSchema>;
