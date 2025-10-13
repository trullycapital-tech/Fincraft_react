const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/mysql-database');

class User extends Model {
  // Generate JWT access token
  generateAccessToken() {
    return jwt.sign(
      { 
        id: this.id, 
        panNumber: this.panNumber,
        holderName: this.holderName 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }

  // Add CIBIL consent
  async addCibilConsent(consentData) {
    this.cibilConsentGranted = true;
    this.cibilConsentGrantedAt = new Date();
    this.cibilConsentExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    this.cibilConsentId = consentData.consentId;
    this.cibilAccessToken = consentData.accessToken;
    return await this.save();
  }

  // Check if CIBIL consent is valid
  isCibilConsentValid() {
    return this.cibilConsentGranted && 
           this.cibilConsentExpiresAt > new Date();
  }

  // Update last login
  async updateLastLogin() {
    this.lastLogin = new Date();
    return await this.save();
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Authentication fields
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: [0, 100]
    }
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: [0, 100]
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      len: [6, 255]
    }
  },
  
  // Core user fields
  panNumber: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      notEmpty: true
    }
  },
  holderName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  phoneNumber: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      is: /^[6-9]\d{9}$/,
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },

  // CIBIL Consent fields
  cibilConsentGranted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  cibilConsentGrantedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cibilConsentExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cibilConsentId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  cibilAccessToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // CIBIL Data (stored as JSON)
  cibilScore: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  cibilReportDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cibilAccounts: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },

  // Bank Consents (stored as JSON array)
  bankConsents: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },

  // Document requests (stored as JSON array)
  documentRequests: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },

  // Status fields
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeSave: async (user) => {
      // Hash password if it's being changed
      if (user.changed('password') && user.password) {
        const saltRounds = 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    }
  }
});

module.exports = User;