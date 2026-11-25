import { Router } from 'express';
import { verifySignature } from '../middlewares/hmac-signature';
import { orderWebhookSchema } from '../schemas/order-webhook.schema';
import { ingestOrder } from '../services/order.service';

export const webhooksRouter = Router();

webhooksRouter.post('/orders', verifySignature, async (req, res) => {
  const payload = orderWebhookSchema.parse(req.body);
  const result = await ingestOrder(payload, req.body);

  res.status(result.created ? 201 : 200).json({
    id: result.id,
    duplicate: !result.created,
  });
});
