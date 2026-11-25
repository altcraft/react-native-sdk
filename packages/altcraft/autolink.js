'use strict';

const path = require('path');

const packages = [
  '@altcraft/core',
  '@altcraft/push',
  '@altcraft/inapp',
  '@altcraft/target',
  '@altcraft/profile',
];

function resolvePackageRoot(name) {
  for (const base of [process.cwd(), __dirname]) {
    try {
      return path.dirname(
        require.resolve(`${name}/package.json`, { paths: [base] })
      );
    } catch {
      // Try the next resolution base.
    }
  }

  return null;
}

const dependencies = {};

for (const name of packages) {
  const root = resolvePackageRoot(name);
  if (root) {
    dependencies[name] = { root };
  }
}

module.exports = { packages, dependencies };
