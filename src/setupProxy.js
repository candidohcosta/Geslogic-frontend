// frontend/src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Se estivermos em produção, não precisamos deste proxy, 
  // pois o Nginx trata disso.
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  app.use(
    ['/api', '/uploads'],
    createProxyMiddleware({
      target: 'http://localhost:3000', // No PC usa localhost
      changeOrigin: true,
      secure: false,
    })
  );
};