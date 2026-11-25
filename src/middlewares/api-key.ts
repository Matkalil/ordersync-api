import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

export function apiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  const apiKey = req.header('x-api-key');

  if (!apiKey) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid API KEY');
  }

  const a = createHash('sha256').update(apiKey).digest();
  const b = createHash('sha256').update(env.API_KEY).digest();

  if (!timingSafeEqual(a, b)) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid API KEY');
  }
  next();
}
