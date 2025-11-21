/* eslint-env node */
require('@electron-toolkit/eslint-config-ts/patch')

module.exports = {
  root: true,
  extends: [
    'plugin:@electron-toolkit/base',
    'plugin:@electron-toolkit/node',
    'plugin:@electron-toolkit/typescript',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/react-in-jsx-scope': 'off'
  }
}


