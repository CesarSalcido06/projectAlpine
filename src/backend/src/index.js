/**
 * Project Alpine - Express Server Entry Point
 *
 * Main server file that initializes the Express app,
 * connects to the master database, and mounts API routes.
 * Supports multi-user authentication with per-user database isolation.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Master database for user credentials
const { initializeMasterDatabase } = require('./db/masterDatabase');

// Auth middleware
const { requireAuth, requireAdmin } = require('./middleware/auth');

// Rate limiting middleware
const { apiLimiter, sensitiveLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const taskRoutes = require('./routes/tasks');
const categoryRoutes = require('./routes/categories');
const tagRoutes = require('./routes/tags');
const statsRoutes = require('./routes/stats');
const trackerRoutes = require('./routes/trackers');

// ============================================================
// APP CONFIGURATION
// ============================================================

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ============================================================
// MIDDLEWARE
// ============================================================

// Enable CORS for frontend (allow local network in development)
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    // Allow all localhost origins in development
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (origin.match(/^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d+$/)) {
      return callback(null, true);
    }
    // Check against FRONTEND_URL env var
    const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (origin === allowedOrigin) {
      return callback(null, true);
    }
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Parse cookies
app.use(cookieParser());

// Parse JSON request bodies
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================
// RATE LIMITING
// ============================================================

// Apply general rate limiting to all API routes
app.use('/api', apiLimiter);

// ============================================================
// PUBLIC API ROUTES (No auth required)
// ============================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'project-alpine-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (login, register, logout)
app.use('/api/auth', authRoutes);

// ============================================================
// PROTECTED API ROUTES (Auth required)
// ============================================================

// Admin routes (require admin privileges, extra rate limiting)
app.use('/api/admin', sensitiveLimiter, requireAuth, requireAdmin, adminRoutes);

// Protected data routes (require authentication)
// These routes will have access to req.user, req.userSequelize, and req.models
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/categories', requireAuth, categoryRoutes);
app.use('/api/tags', requireAuth, tagRoutes);
app.use('/api/stats', requireAuth, statsRoutes);
app.use('/api/trackers', requireAuth, trackerRoutes);

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================================
// SERVER STARTUP
// ============================================================

async function startServer() {
  try {
    // Initialize master database (for user credentials)
    const masterInitialized = await initializeMasterDatabase();
    if (!masterInitialized) {
      throw new Error('Failed to initialize master database');
    }

    // Start listening on all interfaces (0.0.0.0) to allow network access
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════════╗
║        PROJECT ALPINE API SERVER               ║
╠════════════════════════════════════════════════╣
║  Status:  Running                              ║
║  Port:    ${PORT}                                 ║
║  Mode:    ${process.env.NODE_ENV || 'development'}                       ║
║  Auth:    Multi-user enabled                   ║
║  Time:    ${new Date().toLocaleTimeString()}                          ║
╚════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
