module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['build/', 'ios/', 'macos/', 'android/', 'node_modules/'],
  rules: {
    // `void promise;` marks a deliberately un-awaited call (fire and forget).
    'no-void': ['warn', { allowAsStatement: true }],
    '@typescript-eslint/no-explicit-any': 'error',
  },
  overrides: [
    {
      // Inline styles move into tokens with design system v2 (roadmap Faz 3). Until then the CI
      // warning budget (`lint:ci --max-warnings` in package.json) only goes down.
      files: ['*.tsx'],
      rules: { 'react-native/no-inline-styles': 'warn' },
    },
    {
      // Mocks and smoke scripts poke at loosely typed fixtures; app code stays strict.
      files: ['__tests__/**', 'scripts/**'],
      rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
  ],
};
