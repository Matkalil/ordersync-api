import express, { type Express } from 'express';
import { requestLogger } from './middlewares/request-logger';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { webhooksRouter } from './routes/webhooks';
import { healthRouter } from './routes/health';
import { ordersRouter } from './routes/orders';

const app: Express = express();

app.use(requestLogger);
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use('/health', healthRouter);
app.use('/webhooks', webhooksRouter);
app.use('/orders', ordersRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
