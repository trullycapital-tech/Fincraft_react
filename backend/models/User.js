const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic user information (no authentication)
  panNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number']
  },
  holderName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  cibilConsent: {
    isGranted: {
      type: Boolean,
      default: false
    },
    grantedAt: Date,
    expiresAt: Date,
    consentId: String,
    accessToken: String
  },
  bankConsents: [{
    bankName: String,
    accountId: String,
    consentId: String,
    isGranted: {
      type: Boolean,
      default: false
    },
    grantedAt: Date,
    expiresAt: Date,
    accessToken: String
  }],
  cibilData: {
    score: Number,
    reportDate: Date,
    accounts: [{
      accountId: String,
      bankName: String,
      accountType: String,
      currentBalance: Number,
      sanctionedAmount: Number,
      accountStatus: String,
      dateOpened: Date,
      lastUpdated: Date
    }]
  },
  documentRequests: [{
    requestId: {
      type: String,
      unique: true
    },
    accountIds: [String],
    documentTypes: [{
      accountId: String,
      types: [String]
    }],
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    documents: [{
      accountId: String,
      documentType: String,
      fileName: String,
      filePath: String,
      fileSize: Number,
      downloadUrl: String,
      status: {
        type: String,
        enum: ['pending', 'retrieved', 'failed'],
        default: 'pending'
      }
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add CIBIL consent
userSchema.methods.addCibilConsent = function(consentData) {
  this.cibilConsent = {
    isGranted: true,
    grantedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    consentId: consentData.consentId,
    accessToken: consentData.accessToken
  };
  return this.save();
};

// Add bank consent
userSchema.methods.addBankConsent = function(bankConsentData) {
  const existingIndex = this.bankConsents.findIndex(
    consent => consent.accountId === bankConsentData.accountId
  );
  
  const newConsent = {
    bankName: bankConsentData.bankName,
    accountId: bankConsentData.accountId,
    consentId: bankConsentData.consentId,
    isGranted: true,
    grantedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    accessToken: bankConsentData.accessToken
  };

  if (existingIndex > -1) {
    this.bankConsents[existingIndex] = newConsent;
  } else {
    this.bankConsents.push(newConsent);
  }
  
  return this.save();
};

// Check if CIBIL consent is valid
userSchema.methods.isCibilConsentValid = function() {
  return this.cibilConsent.isGranted && 
         this.cibilConsent.expiresAt > new Date();
};

// Check if bank consent is valid
userSchema.methods.isBankConsentValid = function(accountId) {
  const consent = this.bankConsents.find(c => c.accountId === accountId);
  return consent && consent.isGranted && consent.expiresAt > new Date();
};

module.exports = mongoose.model('User', userSchema);