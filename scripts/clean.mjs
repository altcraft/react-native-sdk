import { readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(root, 'packages');

for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const packageDir = join(packagesDir, entry.name);
  rmSync(join(packageDir, 'lib'), { recursive: true, force: true });

  for (const file of readdirSync(packageDir)) {
    if (file.endsWith('.tgz')) {
      rmSync(join(packageDir, file), { force: true });
    }
  }
}
