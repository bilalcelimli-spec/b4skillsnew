module.exports = {
  preset: 'react-native',
  // Whole-app render tests pay for module transforms on a cold cache (every CI run) and took
  // over the 5 s default on a loaded machine; 20 s keeps them deterministic.
  testTimeout: 20000,
};
