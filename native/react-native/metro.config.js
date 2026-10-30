const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Wire contract shared with the server. The app imports only its zod-free constants at runtime.
  watchFolders: [path.resolve(__dirname, '../../shared/contracts')],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
