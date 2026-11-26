import { Router } from 'express';
import { apiKeyAuth } from '../middlewares/api-key';
import { listOrdersQuerySchema } from '../schemas/order-query.schema';
import { getOrders } from '../services/order.service';

export const ordersRouter = Router();

ordersRouter.use(apiKeyAuth);

ordersRouter.get('/', async (req, res) => {
  const query = listOrdersQuerySchema.parse(req.query);
  const result = await getOrders(query);

  res.status(200).json(result);
});
