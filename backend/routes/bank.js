const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * @route   POST /api/request-consent
 * @desc    Request bank consent for document access
 * @access  Public
 */
router.post('/request-consent', [
  body('account_id')
    .notEmpty()
    .withMessage('Account ID is required'),
  body('pan_number')
    .isLength({ min: 10, max: 10 })
    .withMessage('PAN number must be 10 characters')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { account_id, pan_number } = req.body;
    const panUpper = pan_number.toUpperCase();

    // Find user and account details
    let user = null;
    let accountInfo = null;

    try {
      user = await User.findOne({ panNumber: panUpper });
      if (user && user.cibilData) {
        accountInfo = user.cibilData.accounts.find(acc => acc.accountId === account_id);
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // Continue in demo mode
      if (process.env.DEMO_MODE !== 'true') {
        throw dbError;
      }
    }

    if (!accountInfo && process.env.DEMO_MODE !== 'true') {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Generate consent token and OTP
    const consentToken = uuidv4();
    const otpCode = OTP.generateOTP(6);
    const identifier = `${panUpper}-${account_id}`;

    // In demo mode, return mock response
    if (process.env.DEMO_MODE === 'true') {
      // Mock bank info if not found
      if (!accountInfo) {
        accountInfo = {
          bankName: 'Demo Bank',
          accountType: 'Demo Account'
        };
      }

      try {
        // Save OTP to database (if available)
        const otpRecord = new OTP({
          identifier,
          otpCode,
          otpType: 'bank_consent',
          panNumber: panUpper,
          accountId: account_id,
          bankName: accountInfo.bankName
        });
        await otpRecord.save();
      } catch (dbError) {
        console.log('Database operation failed in demo mode:', dbError.message);
        // Continue without database in demo mode
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return res.json({
        success: true,
        message: `OTP sent to registered mobile number for ${accountInfo.bankName}`,
        consent_token: consentToken,
        bank_name: accountInfo.bankName,
        account_id: account_id,
        expires_in: 300, // 5 minutes
        otp_length: 6,
        demo_otp: process.env.NODE_ENV === 'development' ? otpCode : undefined
      });
    }

    // Real bank API integration would go here
    try {
      const otpRecord = new OTP({
        identifier,
        otpCode,
        otpType: 'bank_consent',
        panNumber: panUpper,
        accountId: account_id,
        bankName: accountInfo.bankName
      });
      await otpRecord.save();

      // Here you would integrate with actual bank API to send OTP
      // await bankAPI.requestConsent({ accountId: account_id, panNumber: panUpper });

      res.json({
        success: true,
        message: `OTP sent to registered mobile number for ${accountInfo.bankName}`,
        consent_token: consentToken,
        bank_name: accountInfo.bankName,
        account_id: account_id,
        expires_in: 300, // 5 minutes
        otp_length: 6
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to process consent request');
    }

  } catch (error) {
    console.error('Bank consent request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request bank consent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/verify-bank-otp
 * @desc    Verify bank OTP and grant consent
 * @access  Public
 */
router.post('/verify-bank-otp', [
  body('consent_token')
    .isUUID()
    .withMessage('Invalid consent token'),
  body('otp_code')
    .isLength({ min: 4, max: 6 })
    .withMessage('Invalid OTP code'),
  body('account_id')
    .notEmpty()
    .withMessage('Account ID is required'),
  body('pan_number')
    .isLength({ min: 10, max: 10 })
    .withMessage('PAN number must be 10 characters')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { consent_token, otp_code, account_id, pan_number } = req.body;
    const panUpper = pan_number.toUpperCase();

    // Find OTP record
    let otpRecord = null;
    try {
      otpRecord = await OTP.findOne({
        otpType: 'bank_consent',
        panNumber: panUpper,
        accountId: account_id,
        isVerified: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // In demo mode, continue without database verification
      if (process.env.DEMO_MODE !== 'true') {
        throw dbError;
      }
    }

    // Verify OTP
    if (process.env.DEMO_MODE === 'true') {
      // In demo mode, accept any 6-digit OTP
      if (otp_code.length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP code'
        });
      }
    } else {
      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      try {
        await otpRecord.verifyOTP(otp_code);
      } catch (otpError) {
        return res.status(400).json({
          success: false,
          message: otpError.message
        });
      }
    }

    // Generate access token for bank
    const accessToken = require('jsonwebtoken').sign(
      { 
        panNumber: panUpper,
        accountId: account_id,
        consentToken: consent_token,
        purpose: 'DOCUMENT_ACCESS',
        type: 'bank_consent'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update user record with bank consent
    try {
      let user = await User.findOne({ panNumber: panUpper });
      if (user) {
        await user.addBankConsent({
          bankName: otpRecord?.bankName || 'Demo Bank',
          accountId: account_id,
          consentId: consent_token,
          accessToken: accessToken
        });
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // Continue without database in demo mode
      if (process.env.DEMO_MODE !== 'true') {
        throw dbError;
      }
    }

    // Simulate API delay
    if (process.env.DEMO_MODE === 'true') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      success: true,
      consent_verified: true,
      message: 'Bank consent verified successfully',
      access_token: accessToken,
      account_id: account_id,
      bank_name: otpRecord?.bankName || 'Demo Bank',
      expires_in: 86400, // 24 hours
      next_step: 'document_retrieval'
    });

  } catch (error) {
    console.error('Bank OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify bank OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/bank/supported-banks
 * @desc    Get list of supported banks
 * @access  Public
 */
router.get('/supported-banks', (req, res) => {
  const supportedBanks = [
    {
      id: 'hdfc',
      name: 'HDFC Bank',
      code: 'HDFC',
      supports_api: true,
      document_types: ['statements', 'sanction_letter', 'noc', 'foreclosure']
    },
    {
      id: 'icici',
      name: 'ICICI Bank',
      code: 'ICICI',
      supports_api: true,
      document_types: ['statements', 'sanction_letter', 'noc']
    },
    {
      id: 'sbi',
      name: 'State Bank of India',
      code: 'SBI',
      supports_api: true,
      document_types: ['statements', 'sanction_letter', 'noc', 'foreclosure']
    },
    {
      id: 'axis',
      name: 'Axis Bank',
      code: 'AXIS',
      supports_api: true,
      document_types: ['statements', 'sanction_letter', 'noc']
    },
    {
      id: 'kotak',
      name: 'Kotak Mahindra Bank',
      code: 'KOTAK',
      supports_api: true,
      document_types: ['statements', 'sanction_letter', 'noc']
    },
    {
      id: 'pnb',
      name: 'Punjab National Bank',
      code: 'PNB',
      supports_api: false,
      document_types: ['statements', 'sanction_letter']
    }
  ];

  res.json({
    success: true,
    banks: supportedBanks,
    total_banks: supportedBanks.length,
    api_enabled_banks: supportedBanks.filter(bank => bank.supports_api).length
  });
});

/**
 * @route   GET /api/bank/document-types/:bankCode
 * @desc    Get supported document types for a specific bank
 * @access  Public
 */
router.get('/document-types/:bankCode', (req, res) => {
  const { bankCode } = req.params;
  
  const documentTypes = {
    'HDFC': {
      statements: {
        name: 'Account Statements',
        description: 'Monthly account statements',
        formats: ['PDF'],
        max_months: 12
      },
      sanction_letter: {
        name: 'Sanction Letter',
        description: 'Original loan sanction letter',
        formats: ['PDF'],
        max_months: null
      },
      noc: {
        name: 'No Objection Certificate',
        description: 'NOC after loan closure',
        formats: ['PDF'],
        max_months: null
      },
      foreclosure: {
        name: 'Foreclosure Letter',
        description: 'Loan foreclosure documentation',
        formats: ['PDF'],
        max_months: null
      }
    },
    'ICICI': {
      statements: {
        name: 'Account Statements',
        description: 'Monthly account statements',
        formats: ['PDF'],
        max_months: 24
      },
      sanction_letter: {
        name: 'Sanction Letter',
        description: 'Original loan sanction letter',
        formats: ['PDF'],
        max_months: null
      },
      noc: {
        name: 'No Objection Certificate',
        description: 'NOC after loan closure',
        formats: ['PDF'],
        max_months: null
      }
    }
    // Add more banks as needed
  };

  const bankDocTypes = documentTypes[bankCode.toUpperCase()] || documentTypes['HDFC'];

  res.json({
    success: true,
    bank_code: bankCode.toUpperCase(),
    document_types: bankDocTypes
  });
});

module.exports = router;