import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // Best practices
      'no-console': 'off', // Allow console for server logging
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',

      // ES6+ specific
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'warn',

      // Code quality
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',

      // Error prevention
      'no-fallthrough': 'error',
      'no-unsafe-finally': 'error',
      'require-atomic-updates': 'error',
    },
  },
  {
    files: ['src/**/*.js'],
    rules: {
      // Additional rules for source files
      'no-process-exit': 'off', // Allow process.exit in server code
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '*.min.js',
      '.claude/',
      'package-lock.json',
    ],
  },
];
