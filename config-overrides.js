const { override, addWebpackExternals } = require('customize-cra');

module.exports = override(
  addWebpackExternals({
    // Specify your Node.js built-in modules here
    'os': 'commonjs os',
    'fs': 'commonjs fs',
    // Add other Node.js modules as needed
  })
);
