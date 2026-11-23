import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { env } from '../src/config/env';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function main() {
  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    // 1. Control table: remembers which migrations already ran
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
`);
    // 2. Migration files in order (001, 002, ...)
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    // 3. Names already applied, in a Set for fast lookup
    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    // 4. Only the files that never ran
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }

    for (const file of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');

      try {
        // 5-8. All or nothing: the SQL and the record go in together
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied ${file}`);
      } catch (error) {
        // 9. Undo everything this migration did, then stop
        await client.query('ROLLBACK');
        console.error(`Failed on ${file}`);
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
