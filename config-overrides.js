const { override, addWebpackExternals } = require('customize-cra');
const webpack = require('webpack')

module.exports = function override(config) {
  config.resolve.fallback = {
    buffer: require.resolve('buffer/'),
    stream: require.resolve('stream-browserify'),
    assert: require.resolve('assert/'),
  };

  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    })
  );

  // An nw.js app can use Node built-in modules fine at runtime - but we have to tell webpack that.
  config = addWebpackExternals({
    'os': 'commonjs os',
    'fs': 'commonjs fs',
    'path': 'commonjs path',
  })(config);


  return config;
}
