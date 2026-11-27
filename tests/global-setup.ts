import { execSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';

export default function setup(project: TestProject) {
  execSync('npx tsx scripts/migrate.ts', {
    env: { ...process.env, ...project.config.env },
    stdio: 'inherit',
  });
}
