const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = async (req, res) => {
  try {
    // Extract and validate target URL
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing target URL. Use ?url=<target-url>.' });
    }

    const validUrl = /^https?:\/\//.test(targetUrl) ? targetUrl : `https://${targetUrl}`;
    new URL(validUrl); // Throws if URL is invalid

    // Create proxy middleware
    const proxy = createProxyMiddleware({
      target: validUrl,
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
      onProxyRes: (proxyRes) => {
        // Add CORS headers
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
      },
      onProxyReq: (proxyReq) => {
        // Spoof User-Agent
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124');
      },
      followRedirects: true,
      timeout: 8000,
      proxyTimeout: 8000,
    });

    // Handle the proxy request
    proxy(req, res);
  } catch (error) {
    // Log error and return user-friendly message
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Failed to proxy request. Ensure the target URL is valid and accessible.' });
  }
};
