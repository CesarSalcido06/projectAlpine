/**
 * Project Alpine - Express Server Entry Point
 *
 * Main server file that initializes the Express app,
 * connects to the database, and mounts API routes.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initializeDatabase, testConnection } = require('./db/database');

// Import routes
const taskRoutes = require('./routes/tasks');
const categoryRoutes = require('./routes/categories');
const tagRoutes = require('./routes/tags');
const statsRoutes = require('./routes/stats');

// ============================================================
// APP CONFIGURATION
// ============================================================

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directory exists for SQLite database
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ============================================================
// MIDDLEWARE
// ============================================================

// Enable CORS for frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

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
// API ROUTES
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

// Mount API routes
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/stats', statsRoutes);

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
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Initialize database (sync models)
    await initializeDatabase();

    // Ensure default category exists
    const { Category } = require('./models');
    const defaultCategory = await Category.findOne({ where: { isDefault: true } });
    if (!defaultCategory) {
      await Category.create({
        name: 'General',
        color: '#718096',
        isDefault: true,
      });
      console.log('Created default category: General');
    }

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║        PROJECT ALPINE API SERVER               ║
╠════════════════════════════════════════════════╣
║  Status:  Running                              ║
║  Port:    ${PORT}                                 ║
║  Mode:    ${process.env.NODE_ENV || 'development'}                       ║
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
