const webpack = require('webpack');

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  
  Object.assign(fallback, {
    "path": require.resolve("path-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer/"),
    "fs": false
  });
  
  config.resolve.fallback = fallback;

  // --- CORREÇÃO DO ERRO 'fully specified' ---
  // 1. Adicionamos um Alias para forçar o caminho correto quando
  //    alguma biblioteca pede 'process/browser'
  config.resolve.alias = {
      ...config.resolve.alias,
      "process/browser": "process/browser.js"
  };
  
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      // 2. Adicionamos a extensão .js explicitamente aqui também
      process: 'process/browser.js', 
      Buffer: ['buffer', 'Buffer']
    })
  ]);
  
  return config;
};