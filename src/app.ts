import express, { type Express } from 'express';
import { requestLogger } from './middlewares/request-logger';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';

const app: Express = express();

app.use(requestLogger);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
