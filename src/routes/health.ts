import { Router } from 'express';
import { pool } from '../db/pool';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
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
