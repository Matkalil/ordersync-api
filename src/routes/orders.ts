import { Router } from 'express';
import { apiKeyAuth } from '../middlewares/api-key';
import {
  listOrdersQuerySchema,
  orderIdParamsSchema,
  updateOrderStatusBodySchema,
} from '../schemas/order-query.schema';
import { changeOrderStatus, getOrderById, getOrders } from '../services/order.service';

export const ordersRouter = Router();

ordersRouter.use(apiKeyAuth);

ordersRouter.get('/', async (req, res) => {
  const query = listOrdersQuerySchema.parse(req.query);
  const result = await getOrders(query);

  res.status(200).json(result);
});

ordersRouter.get('/:id', async (req, res) => {
  const { id } = orderIdParamsSchema.parse(req.params);
  const order = await getOrderById(id);

  res.status(200).json(order);
});

ordersRouter.patch('/:id/status', async (req, res) => {
  const { id } = orderIdParamsSchema.parse(req.params);
  const { status, reason } = updateOrderStatusBodySchema.parse(req.body);
  const order = await changeOrderStatus(id, status, reason);

  res.status(200).json(order);
});
