const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Database imports
const connectDB = require('./config/database'); // MongoDB
const { connectMySQL } = require('./config/mysql-database'); // MySQL

// Route imports
const userRoutes = require('./routes/user'); // MongoDB routes
const userMySQLRoutes = require('./routes/userMySQL'); // MySQL routes
const bankRoutes = require('./routes/bank');
const cibilRoutes = require('./routes/cibil');
const panRoutes = require('./routes/pan');
const documentRoutes = require('./routes/documents');

// Middleware imports
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: process.env.USE_MYSQL === 'true' ? 'MySQL' : 'MongoDB',
    demo_mode: process.env.DEMO_MODE === 'true'
  });
});

// Database connection and route setup
const initializeServer = async () => {
  try {
    // Choose database based on environment variable
    if (process.env.USE_MYSQL === 'true') {
      console.log('🔄 Using MySQL database...');
      await connectMySQL();
      // Use MySQL routes
      app.use('/api/user', userMySQLRoutes);
    } else {
      console.log('🔄 Using MongoDB database...');
      await connectDB();
      // Use MongoDB routes
      app.use('/api/user', userRoutes);
    }

    // Common routes (work with both databases)
    app.use('/api/bank', bankRoutes);
    app.use('/api/cibil', cibilRoutes);
    app.use('/api/pan', panRoutes);
    app.use('/api/documents', documentRoutes);

    // Error handling middleware
    app.use(errorHandler);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database: ${process.env.USE_MYSQL === 'true' ? 'MySQL' : 'MongoDB'}`);
      console.log(`🔧 Demo Mode: ${process.env.DEMO_MODE === 'true' ? 'ON' : 'OFF'}`);
    });

  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
};

// Initialize server
initializeServer();

module.exports = app;