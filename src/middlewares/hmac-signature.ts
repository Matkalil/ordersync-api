import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

export function verifySignature(req: Request, _res: Response, next: NextFunction) {
  const signature = req.header('x-signature');

  if (!signature || !req.rawBody) {
    throw new AppError(401, 'INVALID_SIGNATURE', 'Missing or invalid signature');
  }

  const expectedHex = createHmac('sha256', env.WEBHOOK_SECRET).update(req.rawBody).digest('hex');

  const receivedDigest = createHash('sha256').update(signature).digest();
  const expectedDigest = createHash('sha256').update(expectedHex).digest();

  if (!timingSafeEqual(receivedDigest, expectedDigest)) {
    throw new AppError(401, 'INVALID_SIGNATURE', 'Missing or invalid signature');
  }

  next();
}