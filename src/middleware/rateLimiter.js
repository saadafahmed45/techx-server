// ==========================================
// middleware/rateLimiter.js
// Lightweight In-Memory Sliding-Window Rate Limiter
// ==========================================

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes default
  max = 100,                  // Max requests per window
  message = "Too many requests from this IP, please try again later.",
} = {}) => {
  const hits = new Map();

  // Periodic cleanup of stale entries every 5 minutes to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const validTimestamps = timestamps.filter((time) => now - time < windowMs);
      if (validTimestamps.length === 0) {
        hits.delete(ip);
      } else {
        hits.set(ip, validTimestamps);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Determine client IP
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown-ip";

    const now = Date.now();
    const timestamps = hits.get(clientIp) || [];

    // Filter to requests within current window
    const recentHits = timestamps.filter((time) => now - time < windowMs);

    if (recentHits.length >= max) {
      const oldestHit = recentHits[0];
      const retryAfterSeconds = Math.ceil((windowMs - (now - oldestHit)) / 1000);

      res.setHeader("Retry-After", retryAfterSeconds);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", 0);

      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    }

    recentHits.push(now);
    hits.set(clientIp, recentHits);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", max - recentHits.length);

    next();
  };
};

// General API Limiter: 300 requests per 15 minutes
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests from this device. Please try again in a few minutes.",
});

// Strict Auth Limiter: 15 attempts per 15 minutes (protects login and register against brute force)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many authentication attempts. Please try again after 15 minutes.",
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
};
