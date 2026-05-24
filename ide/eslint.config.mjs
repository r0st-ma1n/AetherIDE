export default [
  {
    files: ['*.js'],
    ignores: ['node_modules/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
];
