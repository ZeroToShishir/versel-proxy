const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = async (req, res) => {
  try {
    // Get target URL from query parameter
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing target URL. Use ?url=<target-url>' });
    }

    // Ensure URL has protocol
    const validUrl = /^https?:\/\//.test(targetUrl) ? targetUrl : `https://${targetUrl}`;

    // Validate URL
    new URL(validUrl);

    // Set up proxy
    const proxy = createProxyMiddleware({
      target: validUrl,
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
      onProxyRes: (proxyRes) => {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type';
      },
      followRedirects: true,
    });

    proxy(req, res);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Failed to proxy request. Check if the URL is valid.' });
  }
};
