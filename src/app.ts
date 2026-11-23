import express, { type Express } from 'express';
import { requestLogger } from './middlewares/request-logger';

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

export default app;
