require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
  extends: ['@rushstack/eslint-config/profile/node'], // <---- put your profile string here
  parserOptions: { tsconfigRootDir: __dirname },
  rules: {
    '@typescript-eslint/no-parameter-properties': 0
  }
};
