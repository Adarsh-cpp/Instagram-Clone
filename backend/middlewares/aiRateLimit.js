// Per-user rate limiting for AI routes.
//
// Hand-rolled fixed-window counter rather than a package, because the only
// thing being protected here is a free-tier third-party quota and this
// needs zero new dependencies. Counters live in process memory, so with
// multiple instances each one enforces its own share — acceptable for
// this use case, and the ceiling is deliberately conservative.
//
// Keyed on the authenticated user id (these routes are always behind auth),
// falling back to IP so an unauthenticated request can never bypass it.

const buckets = new Map();

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Periodically drop stale buckets so the Map can't grow forever.
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.dayStart > DAY_MS) buckets.delete(key);
  }
}, HOUR_MS);

// Don't hold the event loop open on shutdown.
if (typeof cleanup.unref === "function") cleanup.unref();

const getKey = (req) => {
  if (req.user?._id) return `u:${req.user._id.toString()}`;
  return `ip:${req.ip || req.socket?.remoteAddress || "unknown"}`;
};

/**
 * @param {Object} options
 * @param {number} options.windowMs      short window length
 * @param {number} options.maxPerWindow  requests allowed per short window
 * @param {number} options.maxPerDay     requests allowed per rolling day
 * @param {string} options.name          bucket namespace, so /chat and /caption
 *                                       don't share a counter
 */
export const createAiRateLimit = ({
  windowMs = 60 * 1000,
  maxPerWindow = 8,
  maxPerDay = 120,
  name = "default",
} = {}) => {
  return (req, res, next) => {
    const key = `${name}:${getKey(req)}`;
    const now = Date.now();

    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = { windowStart: now, windowCount: 0, dayStart: now, dayCount: 0 };
      buckets.set(key, bucket);
    }

    if (now - bucket.windowStart >= windowMs) {
      bucket.windowStart = now;
      bucket.windowCount = 0;
    }

    if (now - bucket.dayStart >= DAY_MS) {
      bucket.dayStart = now;
      bucket.dayCount = 0;
    }

    if (bucket.dayCount >= maxPerDay) {
      const retryAfter = Math.ceil((bucket.dayStart + DAY_MS - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        message: "You have reached your daily AI limit. Please try again tomorrow.",
        retryAfter,
      });
    }

    if (bucket.windowCount >= maxPerWindow) {
      const retryAfter = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        message: `Too many AI requests. Please wait ${retryAfter}s and try again.`,
        retryAfter,
      });
    }

    bucket.windowCount += 1;
    bucket.dayCount += 1;

    res.set("X-AI-RateLimit-Remaining", String(maxPerWindow - bucket.windowCount));

    next();
  };
};

// Ready-made limiters for the current features.
export const captionRateLimit = createAiRateLimit({
  name: "caption",
  maxPerWindow: 6,
  maxPerDay: 80,
});

export const bioRateLimit = createAiRateLimit({
  name: "bio",
  maxPerWindow: 8,
  maxPerDay: 60,
});

// Comments are the lightest-weight of the image features (shorter output
// than a caption) but still an image call, so it gets the same shape of
// budget as captionRateLimit rather than chat's higher ceiling.
export const commentRateLimit = createAiRateLimit({
  name: "comment",
  maxPerWindow: 6,
  maxPerDay: 80,
});

export const chatRateLimit = createAiRateLimit({
  name: "chat",
  maxPerWindow: 12,
  maxPerDay: 200,
});

// Reply suggestions are text-only and users tend to tap them a few times
// per conversation, so the budget sits between chat and comment.
export const replyRateLimit = createAiRateLimit({
  name: "reply",
  maxPerWindow: 10,
  maxPerDay: 150,
});
