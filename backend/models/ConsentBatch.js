const mongoose = require('mongoose');

const consentBatchSchema = new mongoose.Schema({
  batchId: {
    type: String,
    required: true
  },
  panNumber: {
    type: String,
    required: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number']
  },
  // Batch consent details
  requestType: {
    type: String,
    enum: ['SINGLE_OTP_BATCH', 'INDIVIDUAL_CONSENT'],
    default: 'SINGLE_OTP_BATCH'
  },
  status: {
    type: String,
    enum: ['pending', 'otp_sent', 'verified', 'processing', 'completed', 'failed', 'expired'],
    default: 'pending'
  },
  // OTP details
  otpCode: String,
  otpSentAt: Date,
  otpExpiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    }
  },
  otpVerifiedAt: Date,
  otpAttempts: {
    type: Number,
    default: 0,
    max: 3
  },
  // Selected loans and documents
  selectedLoans: [{
    loanId: {
      type: String,
      required: true
    },
    accountId: {
      type: String,
      required: true
    },
    bankName: {
      type: String,
      required: true
    },
    loanType: String,
    outstandingAmount: Number,
    // Documents requested for this loan
    requestedDocuments: [{
      documentType: {
        type: String,
        enum: ['statement_of_account', 'repayment_schedule', 'sanction_letter', 'foreclosure_letter', 'noc'],
        required: true
      },
      subType: String, // e.g., 'last_6_months', 'complete_tenure'
      priority: {
        type: String,
        enum: ['HIGH', 'MEDIUM', 'LOW'],
        default: 'MEDIUM'
      }
    }]
  }],
  // Batch processing details
  totalDocumentsRequested: {
    type: Number,
    default: 0
  },
  documentsGenerated: {
    type: Number,
    default: 0
  },
  documentsFailed: {
    type: Number,
    default: 0
  },
  // Processing timeline
  processingStartedAt: Date,
  processingCompletedAt: Date,
  estimatedCompletionTime: Date,
  // Consent details
  consentText: String,
  consentVersion: {
    type: String,
    default: '1.0'
  },
  consentGrantedAt: Date,
  consentExpiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
  },
  // User interaction
  phoneNumber: String,
  emailAddress: String,
  // Progress tracking
  progress: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    currentStage: {
      type: String,
      enum: ['CONSENT_PENDING', 'OTP_VERIFICATION', 'PROCESSING_STARTED', 'FETCHING_DOCUMENTS', 'GENERATING_DOCUMENTS', 'COMPLETED'],
      default: 'CONSENT_PENDING'
    },
    stages: [{
      stageName: String,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending'
      },
      startedAt: Date,
      completedAt: Date,
      details: String
    }]
  },
  // Bank-wise processing status
  bankProcessingStatus: [{
    bankName: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    documentsRequested: Number,
    documentsGenerated: Number,
    startedAt: Date,
    completedAt: Date,
    errorMessage: String
  }],
  // Metadata and audit
  requestMetadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    source: {
      type: String,
      enum: ['WEB', 'MOBILE', 'API'],
      default: 'WEB'
    }
  },
  // Error tracking
  errors: [{
    errorCode: String,
    errorMessage: String,
    bankName: String,
    documentType: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  // Notification tracking
  notifications: [{
    type: {
      type: String,
      enum: ['SMS', 'EMAIL', 'PUSH'],
      required: true
    },
    message: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed'],
      default: 'sent'
    }
  }],
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Indexes for better performance
consentBatchSchema.index({ panNumber: 1, status: 1 });
consentBatchSchema.index({ batchId: 1 }, { unique: true });
consentBatchSchema.index({ status: 1, createdAt: -1 });
consentBatchSchema.index({ otpExpiresAt: 1 });
consentBatchSchema.index({ consentExpiresAt: 1 });

// Update timestamp on save
consentBatchSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for checking if OTP is expired
consentBatchSchema.virtual('isOtpExpired').get(function() {
  return this.otpExpiresAt < new Date();
});

// Virtual for checking if consent is expired
consentBatchSchema.virtual('isConsentExpired').get(function() {
  return this.consentExpiresAt < new Date();
});

// Virtual for overall progress calculation
consentBatchSchema.virtual('overallProgress').get(function() {
  if (this.totalDocumentsRequested === 0) return 0;
  return Math.round((this.documentsGenerated / this.totalDocumentsRequested) * 100);
});

// Method to generate OTP
consentBatchSchema.methods.generateOTP = function() {
  // Demo mode - use fixed OTP for easier testing
  if (process.env.DEMO_MODE === 'true') {
    this.otpCode = process.env.DEMO_OTP || '123456';
  } else {
    this.otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  }
  
  this.otpSentAt = new Date();
  this.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  this.status = 'otp_sent';
  return this.save();
};

// Method to verify OTP
consentBatchSchema.methods.verifyOTP = function(providedOtp) {
  // Demo mode check
  if (process.env.DEMO_MODE === 'true') {
    const demoOtp = process.env.DEMO_OTP || '123456';
    if (providedOtp === demoOtp) {
      this.otpVerifiedAt = new Date();
      this.status = 'verified';
      this.consentGrantedAt = new Date();
      
      // Update progress
      this.progress.currentStage = 'PROCESSING_STARTED';
      this.updateStage('OTP_VERIFICATION', 'completed');
      
      return this.save();
    }
  }

  if (this.isOtpExpired) {
    throw new Error('OTP has expired');
  }
  
  if (this.otpAttempts >= 3) {
    throw new Error('Maximum OTP attempts exceeded');
  }
  
  this.otpAttempts += 1;
  
  if (this.otpCode !== providedOtp) {
    this.save();
    throw new Error('Invalid OTP');
  }
  
  this.otpVerifiedAt = new Date();
  this.status = 'verified';
  this.consentGrantedAt = new Date();
  
  // Update progress
  this.progress.currentStage = 'PROCESSING_STARTED';
  this.updateStage('OTP_VERIFICATION', 'completed');
  
  return this.save();
};

// Method to update stage progress
consentBatchSchema.methods.updateStage = function(stageName, status, details = '') {
  let stage = this.progress.stages.find(s => s.stageName === stageName);
  
  if (!stage) {
    stage = {
      stageName,
      status: 'pending'
    };
    this.progress.stages.push(stage);
  }
  
  stage.status = status;
  stage.details = details;
  
  if (status === 'in_progress' && !stage.startedAt) {
    stage.startedAt = new Date();
  }
  
  if (status === 'completed' || status === 'failed') {
    stage.completedAt = new Date();
  }
  
  return this.save();
};

// Method to update bank processing status
consentBatchSchema.methods.updateBankStatus = function(bankName, status, details = {}) {
  let bankStatus = this.bankProcessingStatus.find(b => b.bankName === bankName);
  
  if (!bankStatus) {
    bankStatus = {
      bankName,
      status: 'pending',
      documentsRequested: 0,
      documentsGenerated: 0
    };
    this.bankProcessingStatus.push(bankStatus);
  }
  
  bankStatus.status = status;
  
  if (details.documentsRequested) bankStatus.documentsRequested = details.documentsRequested;
  if (details.documentsGenerated) bankStatus.documentsGenerated = details.documentsGenerated;
  if (details.errorMessage) bankStatus.errorMessage = details.errorMessage;
  
  if (status === 'processing' && !bankStatus.startedAt) {
    bankStatus.startedAt = new Date();
  }
  
  if (status === 'completed' || status === 'failed') {
    bankStatus.completedAt = new Date();
  }
  
  return this.save();
};

// Method to add error
consentBatchSchema.methods.addError = function(errorCode, errorMessage, bankName = null, documentType = null) {
  this.errors.push({
    errorCode,
    errorMessage,
    bankName,
    documentType
  });
  
  return this.save();
};

// Method to add notification
consentBatchSchema.methods.addNotification = function(type, message, status = 'sent') {
  this.notifications.push({
    type,
    message,
    status
  });
  
  return this.save();
};

// Method to calculate total documents
consentBatchSchema.methods.calculateTotalDocuments = function() {
  let total = 0;
  this.selectedLoans.forEach(loan => {
    total += loan.requestedDocuments.length;
  });
  this.totalDocumentsRequested = total;
  return this.save();
};

// Method to get batch summary
consentBatchSchema.methods.getSummary = function() {
  return {
    batchId: this.batchId,
    panNumber: this.panNumber,
    status: this.status,
    totalLoans: this.selectedLoans.length,
    totalDocumentsRequested: this.totalDocumentsRequested,
    documentsGenerated: this.documentsGenerated,
    documentsFailed: this.documentsFailed,
    progress: this.overallProgress,
    currentStage: this.progress.currentStage,
    createdAt: this.createdAt,
    estimatedCompletionTime: this.estimatedCompletionTime,
    isConsentExpired: this.isConsentExpired
  };
};

// Static method to get batches by PAN
consentBatchSchema.statics.getBatchesByPAN = function(panNumber, status = null) {
  const query = { panNumber: panNumber.toUpperCase() };
  if (status) query.status = status;
  
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to cleanup expired batches
consentBatchSchema.statics.cleanupExpiredBatches = function() {
  return this.deleteMany({
    $or: [
      { otpExpiresAt: { $lt: new Date() }, status: 'otp_sent' },
      { consentExpiresAt: { $lt: new Date() }, status: { $in: ['pending', 'otp_sent'] } }
    ]
  });
};

module.exports = mongoose.model('ConsentBatch', consentBatchSchema);