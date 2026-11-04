const path = require('path');
const fs = require('fs');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {nodeModulesPaths: [fs.realpathSync(path.join(__dirname, 'node_modules'))]},
  // Wire contract shared with the server. The app imports only its zod-free constants at runtime.
  watchFolders: [
    path.resolve(__dirname, '../../shared/contracts'),
    // Isolated worktrees may reuse dependencies through a symlink. Metro must
    // see the real targets, including the local native module linked by npm.
    ...['node_modules', 'node_modules/b4-native'].map(folder => path.join(__dirname, folder))
      .filter(folder => fs.existsSync(folder) && fs.lstatSync(folder).isSymbolicLink())
      .map(folder => fs.realpathSync(folder)),
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
