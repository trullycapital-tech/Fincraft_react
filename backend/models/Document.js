const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true
  },
  requestId: {
    type: String,
    required: true
  },
  panNumber: {
    type: String,
    required: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number']
  },
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
  documentType: {
    type: String,
    enum: ['statement_of_account', 'repayment_schedule', 'sanction_letter', 'foreclosure_letter', 'noc', 'other'],
    required: true
  },
  documentSubType: {
    type: String, // e.g., 'last_6_months', 'last_12_months', 'complete_tenure'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'downloaded', 'failed', 'expired'],
    default: 'pending'
  },
  // File information
  fileName: String,
  filePath: String,
  fileSize: Number, // in bytes
  mimeType: String,
  downloadUrl: String,
  // Security
  encryptionKey: String,
  checksum: String, // for file integrity
  // Processing information
  generatedAt: Date,
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  maxDownloads: {
    type: Number,
    default: 10
  },
  lastDownloadedAt: Date,
  // Document metadata
  period: {
    startDate: Date,
    endDate: Date
  },
  totalPages: Number,
  documentVersion: {
    type: String,
    default: '1.0'
  },
  // Processing details
  processingStartedAt: Date,
  processingCompletedAt: Date,
  processingDuration: Number, // in milliseconds
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  // Source information
  sourceSystem: {
    type: String,
    enum: ['BANK_API', 'SCRAPING', 'MANUAL_UPLOAD', 'GENERATED'],
    default: 'BANK_API'
  },
  sourceReference: String,
  // Sharing and access
  shareTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    accessCount: {
      type: Number,
      default: 0
    },
    maxAccess: {
      type: Number,
      default: 5
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // Audit trail
  accessLog: [{
    accessedAt: {
      type: Date,
      default: Date.now
    },
    accessType: {
      type: String,
      enum: ['VIEW', 'DOWNLOAD', 'SHARE', 'DELETE'],
      required: true
    },
    ipAddress: String,
    userAgent: String,
    sessionId: String
  }],
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
documentSchema.index({ panNumber: 1, documentType: 1 });
documentSchema.index({ requestId: 1 });
documentSchema.index({ loanId: 1, documentType: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ expiresAt: 1 });
documentSchema.index({ 'shareTokens.token': 1 });
documentSchema.index({ createdAt: -1 });

// Update timestamp on save
documentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for human-readable document type
documentSchema.virtual('displayName').get(function() {
  const typeMap = {
    'statement_of_account': 'Statement of Account',
    'repayment_schedule': 'Repayment Schedule',
    'sanction_letter': 'Sanction Letter',
    'foreclosure_letter': 'Foreclosure Letter',
    'noc': 'No Objection Certificate',
    'other': 'Other Document'
  };
  return typeMap[this.documentType] || this.documentType;
});

// Virtual for file size in human-readable format
documentSchema.virtual('fileSizeFormatted').get(function() {
  if (!this.fileSize) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.fileSize;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
});

// Virtual for expiry status
documentSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Virtual for days until expiry
documentSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const diffTime = this.expiresAt - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Method to check if document can be downloaded
documentSchema.methods.canDownload = function() {
  return this.status === 'ready' && 
         !this.isExpired && 
         this.downloadCount < this.maxDownloads;
};

// Method to record access
documentSchema.methods.recordAccess = function(accessType, metadata = {}) {
  this.accessLog.push({
    accessType,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    sessionId: metadata.sessionId
  });
  
  if (accessType === 'DOWNLOAD') {
    this.downloadCount += 1;
    this.lastDownloadedAt = new Date();
  }
  
  return this.save();
};

// Method to generate share token
documentSchema.methods.generateShareToken = function(expiresInHours = 24, maxAccess = 5) {
  const token = require('crypto').randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  
  this.shareTokens.push({
    token,
    expiresAt,
    maxAccess
  });
  
  return this.save().then(() => token);
};

// Method to validate share token
documentSchema.methods.validateShareToken = function(token) {
  const shareToken = this.shareTokens.find(st => 
    st.token === token && 
    st.isActive && 
    st.expiresAt > new Date() && 
    st.accessCount < st.maxAccess
  );
  
  if (shareToken) {
    shareToken.accessCount += 1;
    this.save();
    return true;
  }
  
  return false;
};

// Method to get document summary
documentSchema.methods.getSummary = function() {
  return {
    documentId: this.documentId,
    bankName: this.bankName,
    documentType: this.documentType,
    displayName: this.displayName,
    status: this.status,
    fileName: this.fileName,
    fileSize: this.fileSizeFormatted,
    generatedAt: this.generatedAt,
    expiresAt: this.expiresAt,
    isExpired: this.isExpired,
    daysUntilExpiry: this.daysUntilExpiry,
    downloadCount: this.downloadCount,
    canDownload: this.canDownload()
  };
};

// Static method to get documents by PAN
documentSchema.statics.getDocumentsByPAN = function(panNumber, status = null) {
  const query = { panNumber: panNumber.toUpperCase() };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('loanId', 'bankName loanType');
};

// Static method to get documents by request ID
documentSchema.statics.getDocumentsByRequestId = function(requestId) {
  return this.find({ requestId })
    .sort({ bankName: 1, documentType: 1 });
};

// Static method to cleanup expired documents
documentSchema.statics.cleanupExpiredDocuments = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    status: { $in: ['ready', 'downloaded'] }
  });
};

module.exports = mongoose.model('Document', documentSchema);