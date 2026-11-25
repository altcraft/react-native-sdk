import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(root, 'packages');
const publish = process.argv.includes('--publish');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const order = [
  '@altcraft/core',
  '@altcraft/push',
  '@altcraft/inapp',
  '@altcraft/target',
  '@altcraft/profile',
  '@altcraft/react-native-sdk',
];

const packages = new Map();

for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pkgPath = join(packagesDir, entry.name, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  packages.set(pkg.name, pkg);
}

for (const name of order) {
  if (!packages.has(name)) {
    throw new Error(`Cannot publish ${name}: package is missing.`);
  }
}

for (const name of order) {
  const pkg = packages.get(name);

  for (const [dependency, range] of Object.entries(pkg.dependencies ?? {})) {
    if (!dependency.startsWith('@altcraft/')) continue;

    const local = packages.get(dependency);
    if (!local) {
      throw new Error(`${name} depends on missing package ${dependency}.`);
    }

    const expected = range.replace(/^[~^]/, '');
    if (range.startsWith('^') && !local.version.startsWith(expected.split('.')[0])) {
      throw new Error(
        `${name} depends on ${dependency}@${range}, but local version is ${local.version}.`
      );
    }
  }
}

const result = spawnSync(npm, ['run', 'build'], {
  cwd: root,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

for (const name of order) {
  const args = ['publish', '--workspace', name, '--access', 'public'];

  if (!publish) {
    args.push('--dry-run');
  }

  console.log(`\n[release] ${publish ? 'publishing' : 'dry-run'} ${name}`);
  const published = spawnSync(npm, args, { cwd: root, stdio: 'inherit' });

  if (published.status !== 0) {
    process.exit(published.status ?? 1);
  }
}
