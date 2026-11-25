'use strict';

const fs = require('fs');
const path = require('path');

const MARKER = '/* @altcraft-autolink:start */';
const CONFIG_SEARCH = [
  'react-native.config.js',
  'react-native.config.cjs',
  'react-native.config.ts',
  'react-native.config.mjs',
];

const CONFIG_BLOCK = `${MARKER}
try {
  const { dependencies } = require('@altcraft/react-native-sdk/autolink');
  if (module.exports && typeof module.exports === 'object') {
    module.exports.dependencies = Object.assign(
      {},
      dependencies,
      module.exports.dependencies
    );
  } else {
    console.warn(
      '[altcraft] react-native.config.js does not export an object; native autolinking was not configured.'
    );
  }
} catch (error) {
  console.warn(
    '[altcraft] Failed to configure native autolinking:',
    error && error.message ? error.message : error
  );
}
/* @altcraft-autolink:end */`;

const CONFIG_TEMPLATE = `'use strict';

let dependencies = {};
try {
  ({ dependencies } = require('@altcraft/react-native-sdk/autolink'));
} catch (error) {
  console.warn(
    '[altcraft] Failed to configure native autolinking:',
    error && error.message ? error.message : error
  );
}

module.exports = {
  dependencies,
};
`;

function log(message) {
  console.log(`[altcraft] ${message}`);
}

function warn(message) {
  console.warn(`[altcraft] ${message}`);
}

function findConfig(appRoot) {
  for (const name of CONFIG_SEARCH) {
    const filepath = path.join(appRoot, name);
    if (fs.existsSync(filepath)) {
      return { filepath, name };
    }
  }

  return null;
}

function hasEsmSyntax(content) {
  return /^\s*export\s/m.test(content);
}

function writeNewConfig(appRoot) {
  const filepath = path.join(appRoot, 'react-native.config.js');
  fs.writeFileSync(filepath, CONFIG_TEMPLATE);
  log('created react-native.config.js for native module autolinking');
}

function appendToConfig(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');

  if (content.includes(MARKER)) {
    return false;
  }

  if (hasEsmSyntax(content)) {
    warn(
      `${path.basename(filepath)} uses ESM syntax; add the @altcraft autolink block manually.`
    );
    return false;
  }

  const separator = content.endsWith('\n') ? '\n' : '\n\n';
  fs.writeFileSync(filepath, `${content}${separator}${CONFIG_BLOCK}\n`);
  log(`updated ${path.basename(filepath)} for native module autolinking`);
  return true;
}

function writeCjsWrapper(appRoot, cjsPath) {
  const wrapperPath = path.join(appRoot, 'react-native.config.js');
  const content = `'use strict';

const base = require('./${path.basename(cjsPath)}');
let dependencies = {};
try {
  ({ dependencies } = require('@altcraft/react-native-sdk/autolink'));
} catch (error) {
  console.warn(
    '[altcraft] Failed to configure native autolinking:',
    error && error.message ? error.message : error
  );
}

module.exports = {
  ...base,
  dependencies: Object.assign({}, dependencies, base && base.dependencies),
};
`;

  fs.writeFileSync(wrapperPath, content);
  log('created react-native.config.js wrapper for Codegen and autolinking');
}

function main() {
  if (process.env.ALTCRAFT_SKIP_AUTOLINK === '1') {
    return;
  }

  const appRoot = process.env.INIT_CWD || process.env.npm_config_local_prefix;

  if (!appRoot) {
    return;
  }

  const packageRoot = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(packageRoot, '..', '..');

  if (path.resolve(appRoot) === repoRoot) {
    return;
  }

  const appPackagePath = path.join(appRoot, 'package.json');
  if (!fs.existsSync(appPackagePath)) {
    return;
  }

  const appPackage = JSON.parse(fs.readFileSync(appPackagePath, 'utf8'));
  const appDependencies = {
    ...appPackage.dependencies,
    ...appPackage.devDependencies,
  };

  if (!appDependencies['@altcraft/react-native-sdk']) {
    return;
  }

  const modulePackages = require('../autolink').packages;
  if (modulePackages.every((name) => appDependencies[name])) {
    return;
  }

  const config = findConfig(appRoot);

  if (!config) {
    writeNewConfig(appRoot);
    return;
  }

  if (config.name === 'react-native.config.js') {
    appendToConfig(config.filepath);
    return;
  }

  if (config.name === 'react-native.config.cjs') {
    writeCjsWrapper(appRoot, config.filepath);
    return;
  }

  warn(
    `${config.name} is not supported for automatic autolinking. Add the @altcraft autolink block manually.`
  );
}

try {
  main();
} catch (error) {
  warn(
    `postinstall autolinking setup failed: ${
      error && error.message ? error.message : error
    }`
  );
}
