/**
 * Project Alpine - Authentication Configuration
 *
 * JWT and security settings for user authentication.
 */

module.exports = {
  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'alpine-dev-secret-change-in-production',
  jwtExpiresIn: '7d',

  // bcrypt configuration
  bcryptRounds: 12,

  // Cookie configuration
  cookieName: 'alpine_auth',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  },

  // Password requirements
  passwordMinLength: 8,
};
