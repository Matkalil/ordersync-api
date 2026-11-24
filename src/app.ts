import express, { type Express } from 'express';
import { requestLogger } from './middlewares/request-logger';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { pool } from './db/pool';

const app: Express = express();

app.use(requestLogger);
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      database: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, 'Health check: database unavailable');
    res.status(503).json({
      status: 'degraded',
      database: 'unavailable',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }
});

app.use(notFound);
app.use(errorHandler);

export default app;
