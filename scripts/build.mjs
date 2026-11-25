import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const packages = [
  '@altcraft/core',
  '@altcraft/push',
  '@altcraft/inapp',
  '@altcraft/target',
  '@altcraft/profile',
  '@altcraft/react-native-sdk',
];

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

for (const name of packages) {
  console.log(`\n[build] ${name}`);
  const result = spawnSync(npm, ['run', 'build', '--workspace', name], {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
