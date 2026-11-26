import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

export const securityHeaders = helmet();

export const corsPolicy = cors({
  origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'x-signature'],
});

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => env.NODE_ENV === 'test' || req.path === '/health',
  handler: (_req, _res, next) => {
    next(new AppError(429, 'RATE_LIMITED', 'Too many requests, please try again later.'));
  },
});
