import express, { type Express } from 'express';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { requestLogger } from './middlewares/request-logger';
import { corsPolicy, rateLimiter, securityHeaders } from './middlewares/security';
import { healthRouter } from './routes/health';
import { ordersRouter } from './routes/orders';
import { webhooksRouter } from './routes/webhooks';

const app: Express = express();

// Cloud Run runs behind Google's proxy: trust 1 hop so req.ip is the real client IP
app.set('trust proxy', 1);

app.use(requestLogger);
app.use(securityHeaders);
app.use(corsPolicy);
app.use(rateLimiter);
app.use(
  express.json({
    limit: '100kb',
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
