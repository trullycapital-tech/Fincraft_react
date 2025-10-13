const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/mysql-database');

class OTP extends Model {
  // Instance method to verify OTP
  verifyOTP(providedOTP) {
    if (this.attempts >= 3) {
      throw new Error('Maximum OTP attempts exceeded');
    }

    if (new Date() > this.expiresAt) {
      throw new Error('OTP has expired');
    }

    this.attempts += 1;

    if (this.otpCode === providedOTP) {
      this.isVerified = true;
      return this.save().then(() => true);
    }

    return this.save().then(() => false);
  }

  // Check if OTP is still valid
  isValid() {
    return !this.isVerified && 
           this.attempts < 3 && 
           new Date() < this.expiresAt;
  }
}

OTP.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  identifier: {
    type: DataTypes.STRING(255),
    allowNull: false,
    index: true // For faster queries
  },
  otpCode: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  otpType: {
    type: DataTypes.ENUM('cibil_consent', 'bank_consent', 'phone_verification'),
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  panNumber: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  accountId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      max: 3
    }
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
  }
}, {
  sequelize,
  modelName: 'OTP',
  tableName: 'otps',
  timestamps: true,
  indexes: [
    {
      fields: ['identifier']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Clean up expired OTPs (you can run this periodically)
OTP.cleanupExpired = async function() {
  const now = new Date();
  const deletedCount = await OTP.destroy({
    where: {
      expiresAt: {
        [sequelize.Sequelize.Op.lt]: now
      }
    }
  });
  console.log(`Cleaned up ${deletedCount} expired OTPs`);
  return deletedCount;
};

module.exports = OTP;