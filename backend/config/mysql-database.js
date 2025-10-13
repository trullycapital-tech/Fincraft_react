const { Sequelize } = require('sequelize');

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'fincraft_db',
  process.env.MYSQL_USERNAME || 'root',
  process.env.MYSQL_PASSWORD || '',
  {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  }
);

const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log('📊 MySQL Connected successfully');
    
    // Sync all models (create tables if they don't exist)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('📋 Database tables synchronized');
    }

    return sequelize;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    
    // In demo mode, continue without database
    if (process.env.DEMO_MODE === 'true') {
      console.log('🔄 Running in demo mode - continuing without database');
      return null;
    }
    
    process.exit(1);
  }
};

// Handle application termination
process.on('SIGINT', async () => {
  if (sequelize) {
    await sequelize.close();
    console.log('📊 MySQL connection closed due to application termination');
  }
  process.exit(0);
});

module.exports = { sequelize, connectMySQL };