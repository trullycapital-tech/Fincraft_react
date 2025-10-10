const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    index: true // For faster queries
  },
  otpCode: {
    type: String,
    required: true
  },
  otpType: {
    type: String,
    enum: ['cibil_consent', 'bank_consent', 'phone_verification'],
    required: true
  },
  phoneNumber: String,
  panNumber: String,
  accountId: String,
  bankName: String,
  attempts: {
    type: Number,
    default: 0,
    max: 3
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Document expires after 5 minutes (300 seconds)
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    }
  }
});

// Index for cleanup
otpSchema.index({ "createdAt": 1 }, { expireAfterSeconds: 300 });

// Instance method to verify OTP
otpSchema.methods.verifyOTP = function(providedOTP) {
  if (this.attempts >= 3) {
    throw new Error('Maximum OTP attempts exceeded');
  }
  
  if (this.expiresAt < new Date()) {
    throw new Error('OTP has expired');
  }
  
  this.attempts += 1;
  
  if (this.otpCode === providedOTP) {
    this.isVerified = true;
    return this.save();
  } else {
    if (this.attempts >= 3) {
      throw new Error('Maximum OTP attempts exceeded');
    }
    this.save();
    throw new Error('Invalid OTP');
  }
};

// Static method to generate OTP
otpSchema.statics.generateOTP = function(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// Static method to find valid OTP
otpSchema.statics.findValidOTP = function(identifier, otpType) {
  return this.findOne({
    identifier,
    otpType,
    isVerified: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 3 }
  });
};

module.exports = mongoose.model('OTP', otpSchema);