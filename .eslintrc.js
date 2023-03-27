module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    jest: true,
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 2019,
    requireConfigFile: 'false',
  },
  extends: ['eslint:recommended'],
  rules: {},
};
