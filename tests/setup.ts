import { afterAll, beforeEach } from 'vitest';
import { pool } from '../src/db/pool';

if (!process.env.DATABASE_URL?.endsWith('_test')) {
  throw new Error('Tests must run against a *_test database');
}

beforeEach(async () => {
  await pool.query('TRUNCATE orders CASCADE');
});

afterAll(async () => {
  await pool.end();
});
