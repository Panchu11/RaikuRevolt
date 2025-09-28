module.exports = {
  root: true,
  env: { node: true, es2022: true, jest: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  extends: [
    'eslint:recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'prettier'
  ],
  plugins: ['jest'],
  ignorePatterns: ['coverage/', 'backups/', 'node_modules/'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['error', 'warn', 'info'] }]
  },
  overrides: [
    {
      files: ['scripts/**/*.js', 'tests/**/*.js'],
      rules: {
        'no-console': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'jest/prefer-to-have-length': 'off'
      }
    },
    {
      files: ['src/commands/**/*.js'],
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-case-declarations': 'off'
      }
    },
    {
      files: ['src/index.js', 'src/monitoring/**/*.js', 'src/database/**/*.js'],
      rules: {
        'no-dupe-class-members': 'off',
        'no-case-declarations': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
      }
    }
  ]
};


