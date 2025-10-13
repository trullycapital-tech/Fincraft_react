const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  loanId: {
    type: String,
    required: true
  },
  panNumber: {
    type: String,
    required: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number']
  },
  bankName: {
    type: String,
    required: true
  },
  accountId: {
    type: String,
    required: true
  },
  loanType: {
    type: String,
    enum: ['home_loan', 'personal_loan', 'business_loan', 'credit_card', 'auto_loan', 'other'],
    default: 'other'
  },
  outstandingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  sanctionedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  emi: {
    type: Number,
    required: true,
    min: 0
  },
  nextDueDate: {
    type: Date,
    required: true
  },
  tenure: {
    type: Number, // in months
    min: 1
  },
  interestRate: {
    type: Number,
    min: 0,
    max: 100
  },
  accountStatus: {
    type: String,
    enum: ['ACTIVE', 'CLOSED', 'OVERDUE', 'SETTLED'],
    default: 'ACTIVE'
  },
  dateOpened: {
    type: Date,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Additional loan details from CIBIL
  disbursementDate: Date,
  maturityDate: Date,
  repaymentFrequency: {
    type: String,
    enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'],
    default: 'MONTHLY'
  },
  collateralType: String,
  guarantorDetails: String,
  // Consent tracking
  consentGranted: {
    type: Boolean,
    default: false
  },
  consentGrantedAt: Date,
  consentExpiresAt: Date,
  // Source information
  sourceSystem: {
    type: String,
    enum: ['CIBIL', 'BANK_API', 'MANUAL'],
    default: 'CIBIL'
  },
  sourceId: String, // Reference ID from source system
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
loanSchema.index({ panNumber: 1, bankName: 1 });
loanSchema.index({ accountId: 1 }, { unique: true });
loanSchema.index({ loanId: 1 }, { unique: true });
loanSchema.index({ accountStatus: 1 });
loanSchema.index({ nextDueDate: 1 });

// Update timestamp on save
loanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for remaining tenure
loanSchema.virtual('remainingTenure').get(function() {
  if (this.maturityDate) {
    const now = new Date();
    const diffTime = this.maturityDate - now;
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return Math.max(0, diffMonths);
  }
  return null;
});

// Virtual for loan progress percentage
loanSchema.virtual('loanProgress').get(function() {
  if (this.sanctionedAmount && this.outstandingAmount) {
    return Math.round(((this.sanctionedAmount - this.outstandingAmount) / this.sanctionedAmount) * 100);
  }
  return 0;
});

// Method to check if loan is overdue
loanSchema.methods.isOverdue = function() {
  return this.nextDueDate < new Date() && this.accountStatus === 'ACTIVE';
};

// Method to get loan summary
loanSchema.methods.getSummary = function() {
  return {
    loanId: this.loanId,
    bankName: this.bankName,
    loanType: this.loanType,
    outstandingAmount: this.outstandingAmount,
    sanctionedAmount: this.sanctionedAmount,
    emi: this.emi,
    nextDueDate: this.nextDueDate,
    accountStatus: this.accountStatus,
    isOverdue: this.isOverdue(),
    loanProgress: this.loanProgress,
    remainingTenure: this.remainingTenure
  };
};

// Static method to get loans by PAN
loanSchema.statics.getLoansByPAN = function(panNumber) {
  return this.find({ 
    panNumber: panNumber.toUpperCase(),
    accountStatus: { $in: ['ACTIVE', 'OVERDUE'] }
  }).sort({ nextDueDate: 1 });
};

// Static method to get loans by bank
loanSchema.statics.getLoansByBank = function(panNumber, bankName) {
  return this.find({ 
    panNumber: panNumber.toUpperCase(),
    bankName: bankName,
    accountStatus: { $in: ['ACTIVE', 'OVERDUE'] }
  });
};

module.exports = mongoose.model('Loan', loanSchema);