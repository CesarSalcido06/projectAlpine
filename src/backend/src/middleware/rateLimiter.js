/**
 * Project Alpine - Rate Limiting Middleware
 *
 * Protects against brute force attacks on authentication endpoints.
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 1000 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication endpoints
 * 50 attempts per 15 minutes per IP (for login/register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: 'Too many authentication attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Moderate rate limiter for sensitive operations
 * 200 requests per 15 minutes per IP
 */
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for guest session creation
 * 5 attempts per hour per IP to prevent DDOS/abuse
 * Does NOT skip successful requests (unlike authLimiter)
 */
const guestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many guest sessions created. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count ALL requests
});

module.exports = {
  apiLimiter,
  authLimiter,
  sensitiveLimiter,
  guestLimiter,
};
