const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = (req, res) => {
  // Extract target URL from query parameter
  const targetUrl = req.query.url;

  if (!targetUrl) {
    res.status(400).json({ error: 'Missing target URL. Use ?url=<target-url> in the request.' });
    return;
  }

  // Validate URL format
  const validUrl = /^https?:\/\//.test(targetUrl) ? targetUrl : `https://${targetUrl}`;
  try {
    new URL(validUrl);
  } catch (e) {
    res.status(400).json({ error: 'Invalid target URL.' });
    return;
  }

  // Basic rate limiting simulation (in-memory, per function instance)
  const requestKey = `${req.ip}-${validUrl}`;
  const now = Date.now();
  const requestTimestamps = req.app.get('requestTimestamps') || new Map();
  const userRequests = requestTimestamps.get(requestKey) || [];

  // Keep only requests from the last 60 seconds
  const recentRequests = userRequests.filter(ts => now - ts < 60000);
  requestTimestamps.set(requestKey, [...recentRequests, now]);
  req.app.set('requestTimestamps', requestTimestamps);

  // Limit to 10 requests per minute per IP and URL
  if (recentRequests.length >= 10) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  // Create proxy middleware
  const proxy = createProxyMiddleware({
    target: validUrl,
    changeOrigin: true,
    pathRewrite: {
      '^/api': '',
    },
    onProxyRes: (proxyRes) => {
      // Add CORS headers for multi-user access
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
    },
    onProxyReq: (proxyReq) => {
      // Spoof User-Agent to bypass some restrictions
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124');
    },
    followRedirects: true,
    timeout: 8000, // Set timeout to 8 seconds to respect Vercel limits
    proxyTimeout: 8000,
  });

  // Handle the proxy request
  proxy(req, res);
};
