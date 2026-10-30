module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['build/', 'ios/', 'macos/', 'android/', 'node_modules/'],
  rules: {
    // `void promise;` marks a deliberately un-awaited call (fire and forget).
    'no-void': ['warn', { allowAsStatement: true }],
    '@typescript-eslint/no-explicit-any': 'error',
    // zod is ≈400 KB in the bundle. The app takes only types from the shared schemas and its
    // runtime values from shared/contracts/native-constants.
    '@typescript-eslint/no-restricted-imports': ['error', {
      paths: [{ name: 'zod', message: 'zod stays out of the app bundle.', allowTypeImports: true }],
      patterns: [{
        group: ['**/shared/contracts/native-protocol'],
        message: 'Import types only (import type …); runtime values come from native-constants.',
        allowTypeImports: true,
      }],
    }],
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
