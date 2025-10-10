const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * @route   POST /api/request-cibil-consent
 * @desc    Request CIBIL consent and send OTP
 * @access  Public
 */
router.post('/request-cibil-consent', [
  body('pan_number')
    .isLength({ min: 10, max: 10 })
    .withMessage('PAN number must be 10 characters')
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN number format'),
  body('phone_number')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid phone number format'),
  body('purpose')
    .optional()
    .isIn(['CIBIL_REPORT_ACCESS', 'LOAN_APPLICATION', 'DOCUMENT_RETRIEVAL'])
    .withMessage('Invalid purpose')
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

    const { pan_number, phone_number, purpose = 'CIBIL_REPORT_ACCESS' } = req.body;
    const panUpper = pan_number.toUpperCase();

    // Generate consent ID and OTP
    const consentId = uuidv4();
    const otpCode = OTP.generateOTP(6);
    const identifier = `${panUpper}-${phone_number}`;

    // In demo mode, return mock response
    if (process.env.DEMO_MODE === 'true') {
      try {
        // Save OTP to database (if available)
        const otpRecord = new OTP({
          identifier,
          otpCode,
          otpType: 'cibil_consent',
          phoneNumber: phone_number,
          panNumber: panUpper
        });
        await otpRecord.save();
      } catch (dbError) {
        console.log('Database operation failed in demo mode:', dbError.message);
        // Continue without database in demo mode
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      return res.json({
        success: true,
        message: `OTP sent successfully to ${phone_number.replace(/(\d{6})(\d{4})/, 'XXXXXX$2')}`,
        consent_id: consentId,
        phone_masked: phone_number.replace(/(\d{6})(\d{4})/, 'XXXXXX$2'),
        expires_in: 300, // 5 minutes
        otp_length: 6,
        demo_otp: process.env.NODE_ENV === 'development' ? otpCode : undefined
      });
    }

    // Real CIBIL API integration would go here
    // For now, simulate the process

    // Save OTP record
    try {
      const otpRecord = new OTP({
        identifier,
        otpCode,
        otpType: 'cibil_consent',
        phoneNumber: phone_number,
        panNumber: panUpper
      });
      await otpRecord.save();

      // Here you would integrate with actual CIBIL API to send OTP
      // await cibilAPI.requestConsent({ panNumber: panUpper, phoneNumber: phone_number });

      res.json({
        success: true,
        message: `OTP sent successfully to ${phone_number.replace(/(\d{6})(\d{4})/, 'XXXXXX$2')}`,
        consent_id: consentId,
        phone_masked: phone_number.replace(/(\d{6})(\d{4})/, 'XXXXXX$2'),
        expires_in: 300, // 5 minutes
        otp_length: 6
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to process consent request');
    }

  } catch (error) {
    console.error('CIBIL consent request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request CIBIL consent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/verify-cibil-consent
 * @desc    Verify CIBIL OTP and grant consent
 * @access  Public
 */
router.post('/verify-cibil-consent', [
  body('consent_id')
    .isUUID()
    .withMessage('Invalid consent ID'),
  body('otp_code')
    .isLength({ min: 4, max: 6 })
    .withMessage('Invalid OTP code'),
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

    const { consent_id, otp_code, pan_number } = req.body;
    const panUpper = pan_number.toUpperCase();

    // Find OTP record
    let otpRecord = null;
    try {
      otpRecord = await OTP.findOne({
        otpType: 'cibil_consent',
        panNumber: panUpper,
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
      // In demo mode, accept any 6-digit OTP or the actual stored OTP
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

    // Generate access token
    const accessToken = require('jsonwebtoken').sign(
      { 
        panNumber: panUpper,
        consentId: consent_id,
        purpose: 'CIBIL_ACCESS',
        type: 'cibil_consent'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update user record with consent
    try {
      let user = await User.findOne({ panNumber: panUpper });
      if (!user) {
        user = new User({
          panNumber: panUpper,
          holderName: 'User Name', // Would come from PAN validation
          phoneNumber: otpRecord?.phoneNumber || '9999999999'
        });
      }

      await user.addCibilConsent({
        consentId: consent_id,
        accessToken: accessToken
      });

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
      message: 'CIBIL consent verified successfully',
      access_token: accessToken,
      expires_in: 86400, // 24 hours
      next_step: 'fetch_cibil_report',
      redirect_url: '/dashboard'
    });

  } catch (error) {
    console.error('CIBIL consent verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify CIBIL consent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/cibil-report
 * @desc    Fetch CIBIL report data
 * @access  Public (with consent verification)
 */
router.post('/cibil-report', [
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

    const { pan_number } = req.body;
    const panUpper = pan_number.toUpperCase();

    // Check consent validity
    let user = null;
    try {
      user = await User.findOne({ panNumber: panUpper });
      if (user && !user.isCibilConsentValid()) {
        return res.status(401).json({
          success: false,
          message: 'CIBIL consent has expired. Please re-authorize.',
          code: 'CONSENT_EXPIRED'
        });
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // Continue in demo mode
      if (process.env.DEMO_MODE !== 'true') {
        throw dbError;
      }
    }

    // In demo mode, return mock CIBIL data
    if (process.env.DEMO_MODE === 'true') {
      const mockCibilData = {
        success: true,
        score: 750,
        grade: 'GOOD',
        report_date: new Date().toISOString(),
        summary: {
          total_accounts: 5,
          active_accounts: 3,
          closed_accounts: 2,
          overdue_accounts: 0,
          total_balance: 850000,
          total_limit: 1200000
        },
        accounts: [
          {
            id: 'HDFC_CC_001',
            bank_name: 'HDFC Bank',
            account_type: 'Credit Card',
            account_number: 'XXXXXXXXXXXX1234',
            current_balance: 45000,
            credit_limit: 200000,
            account_status: 'ACTIVE',
            date_opened: '2020-03-15',
            last_payment_date: '2024-09-15',
            payment_history: 'REGULAR'
          },
          {
            id: 'ICICI_HL_002',
            bank_name: 'ICICI Bank',
            account_type: 'Home Loan',
            account_number: 'XXXXXXXXXXXX5678',
            current_balance: 650000,
            sanctioned_amount: 800000,
            account_status: 'ACTIVE',
            date_opened: '2019-08-20',
            emi_amount: 45000,
            payment_history: 'REGULAR'
          },
          {
            id: 'SBI_PL_003',
            bank_name: 'State Bank of India',
            account_type: 'Personal Loan',
            account_number: 'XXXXXXXXXXXX9012',
            current_balance: 150000,
            sanctioned_amount: 300000,
            account_status: 'ACTIVE',
            date_opened: '2021-12-10',
            emi_amount: 15000,
            payment_history: 'REGULAR'
          },
          {
            id: 'AXIS_CC_004',
            bank_name: 'Axis Bank',
            account_type: 'Credit Card',
            account_number: 'XXXXXXXXXXXX3456',
            current_balance: 0,
            credit_limit: 150000,
            account_status: 'CLOSED',
            date_opened: '2018-05-12',
            date_closed: '2023-06-30',
            payment_history: 'REGULAR'
          },
          {
            id: 'KOTAK_AL_005',
            bank_name: 'Kotak Mahindra Bank',
            account_type: 'Auto Loan',
            account_number: 'XXXXXXXXXXXX7890',
            current_balance: 0,
            sanctioned_amount: 400000,
            account_status: 'CLOSED',
            date_opened: '2017-01-15',
            date_closed: '2022-12-31',
            payment_history: 'REGULAR'
          }
        ],
        enquiries: [
          {
            date: '2024-08-15',
            bank_name: 'HDFC Bank',
            enquiry_type: 'Credit Card',
            amount: 500000
          },
          {
            date: '2023-11-20',
            bank_name: 'SBI',
            enquiry_type: 'Personal Loan',
            amount: 300000
          }
        ]
      };

      // Update user record with CIBIL data
      try {
        if (user) {
          user.cibilData = {
            score: mockCibilData.score,
            reportDate: new Date(),
            accounts: mockCibilData.accounts.map(acc => ({
              accountId: acc.id,
              bankName: acc.bank_name,
              accountType: acc.account_type,
              currentBalance: acc.current_balance,
              sanctionedAmount: acc.sanctioned_amount || acc.credit_limit,
              accountStatus: acc.account_status,
              dateOpened: new Date(acc.date_opened),
              lastUpdated: new Date()
            }))
          };
          await user.save();
        }
      } catch (dbError) {
        console.log('Database operation failed:', dbError.message);
        // Continue without database in demo mode
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Transform mockCibilData into the shape expected by the frontend
      const transformed = {
        success: true,
        credit_score: mockCibilData.score,
        total_loans: mockCibilData.summary?.active_accounts || (mockCibilData.accounts || []).length,
        loan_accounts: (mockCibilData.accounts || []).map(acc => ({
          id: acc.id,
          bank_name: acc.bank_name,
          loan_type: acc.account_type || acc.account_type || acc.account_type,
          account_number: acc.account_number,
          principal_amount: acc.sanctioned_amount || acc.credit_limit || 0,
          outstanding_amount: acc.current_balance || 0,
          emi_amount: acc.emi_amount || 0,
          tenure_months: acc.tenure_months || 0,
          status: (acc.account_status || acc.account_status || 'UNKNOWN').toLowerCase(),
          bank_logo: acc.bank_logo || ''
        })),
        raw: mockCibilData
      };

      return res.json(transformed);
    }

    // Real CIBIL API integration would go here
    res.json({
      success: true,
      message: 'CIBIL report fetch not implemented for live mode',
      accounts: []
    });

  } catch (error) {
    console.error('CIBIL report fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CIBIL report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;