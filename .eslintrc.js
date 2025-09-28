/**
 * ESLint Configuration for DobbyX
 * Comprehensive linting rules for code quality and consistency
 */

module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  
  plugins: [
    'jest'
  ],
  
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  
  rules: {
    // Error prevention
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-duplicate-imports': 'error',
    
    // Code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-useless-return': 'error',
    'no-useless-concat': 'error',
    
    // Async/await best practices
    'require-await': 'error',
    'no-async-promise-executor': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Style consistency
    'camelcase': ['error', { properties: 'never' }],
    'consistent-return': 'error',
    'curly': ['error', 'all'],
    'eqeqeq': ['error', 'always'],
    'no-trailing-spaces': 'error',
    'no-multiple-empty-lines': ['error', { max: 2 }],
    
    // Function rules
    'max-params': ['warn', 5],
    'max-lines-per-function': ['warn', { max: 100 }],
    'complexity': ['warn', 10],
    
    // Jest-specific rules
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error'
  },
  
  overrides: [
    // Test files
    {
      files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off',
        'max-lines-per-function': 'off'
      }
    },
    
    // Configuration files
    {
      files: ['*.config.js', '.eslintrc.js'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off'
      }
    }
  ],
  
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'dist/',
    'build/',
    '*.min.js'
  ]
};
