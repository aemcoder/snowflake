module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always', mjs: 'always' }], // require js/mjs file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
  },
  overrides: [
    {
      // Node-side tooling under tools/ runs sequentially and uses for-of /
      // sequential await as a matter of course; Airbnb's array-iteration
      // preference is a poor fit. Lint these files for real bugs, not for
      // browser-runtime ergonomics.
      files: ['tools/**/*.{js,mjs}'],
      env: { node: true, browser: false },
      rules: {
        'no-restricted-syntax': 'off',
        'no-await-in-loop': 'off',
        'no-continue': 'off',
        'no-console': 'off',
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      },
    },
  ],
};
