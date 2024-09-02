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

  config = addWebpackExternals({
    'os': 'commonjs os',
    'fs': 'commonjs fs',
  })(config);


  return config;
}
