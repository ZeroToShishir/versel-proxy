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

    // Set up proxy with stream-friendly headers
    const proxy = createProxyMiddleware({
      target: validUrl,
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
      onProxyRes: (proxyRes) => {
        // Add CORS headers for multi-user access
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type,Accept';
        // Ensure streaming headers are passed
        proxyRes.headers['Content-Type'] = proxyRes.headers['content-type'] || 'application/octet-stream';
      },
      onProxyReq: (proxyReq) => {
        // Spoof headers to mimic browser for streaming
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        proxyReq.setHeader('Accept', 'application/vnd.apple.mpegurl,video/mp2t,text/html,*/*;q=0.8');
      },
      followRedirects: true,
      // Increase timeout for streams (still within Vercel free plan limit)
      timeout: 8000,
      proxyTimeout: 8000,
    });

    proxy(req, res);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Failed to proxy request. Check if the URL is valid or supports proxying.' });
  }
};
