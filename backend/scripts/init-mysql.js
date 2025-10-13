const { connectMySQL } = require('../config/mysql-database');
const User = require('../models/UserMySQL');
const OTP = require('../models/OTPMySQL');

const initializeMySQL = async () => {
  try {
    console.log('🔄 Initializing MySQL database...');
    
    // Connect to MySQL
    const sequelize = await connectMySQL();
    
    if (!sequelize) {
      console.log('❌ MySQL connection failed - running in demo mode');
      return;
    }

    // Create tables (if they don't exist)
    await User.sync({ alter: true });
    await OTP.sync({ alter: true });
    
    console.log('✅ MySQL database initialized successfully');
    console.log('📋 Tables created: users, otps');
    
    // Check if admin user exists
    const adminUser = await User.findOne({
      where: { email: 'admin@fincraft.com' }
    });

    if (!adminUser) {
      console.log('👤 Creating default admin user...');
      await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@fincraft.com',
        phoneNumber: '9999999999',
        panNumber: 'ADMIN1234A',
        holderName: 'Admin User',
        password: 'Admin@123', // Will be hashed automatically
        isActive: true
      });
      console.log('✅ Default admin user created');
      console.log('📧 Email: admin@fincraft.com');
      console.log('🔑 Password: Admin@123');
    }

    // Clean up expired OTPs
    await OTP.cleanupExpired();
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ MySQL initialization failed:', error);
    process.exit(1);
  }
};

// Run initialization
initializeMySQL();