const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/user/profile/:panNumber
 * @desc    Get user profile
 * @access  Public
 */
router.get('/profile/:panNumber', optionalAuth, async (req, res) => {
  try {
    const { panNumber } = req.params;
    const panUpper = panNumber.toUpperCase();

    let user = null;
    try {
      user = await User.findOne({ panNumber: panUpper }).select('-bankConsents.accessToken -cibilConsent.accessToken');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // Return mock profile in demo mode
      if (process.env.DEMO_MODE === 'true') {
        return res.json({
          success: true,
          user: {
            panNumber: panUpper,
            holderName: 'Demo User',
            phoneNumber: '9999999999',
            email: 'demo@example.com',
            cibilConsent: {
              isGranted: true,
              grantedAt: new Date(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            },
            bankConsents: [],
            cibilData: null,
            documentRequests: [],
            isActive: true,
            createdAt: new Date(),
            lastLogin: new Date()
          }
        });
      }
      throw dbError;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      user: {
        panNumber: user.panNumber,
        holderName: user.holderName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        cibilConsent: {
          isGranted: user.cibilConsent.isGranted,
          grantedAt: user.cibilConsent.grantedAt,
          expiresAt: user.cibilConsent.expiresAt
        },
        bankConsents: user.bankConsents.map(consent => ({
          bankName: consent.bankName,
          accountId: consent.accountId,
          isGranted: consent.isGranted,
          grantedAt: consent.grantedAt,
          expiresAt: consent.expiresAt
        })),
        cibilData: user.cibilData,
        totalDocumentRequests: user.documentRequests.length,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/user/profile/:panNumber
 * @desc    Update user profile
 * @access  Public
 */
router.put('/profile/:panNumber', [
  body('holderName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Holder name must be between 2 and 100 characters'),
  body('phoneNumber')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid phone number format'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
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

    const { panNumber } = req.params;
    const panUpper = panNumber.toUpperCase();
    const { holderName, phoneNumber, email } = req.body;

    let user = null;
    try {
      user = await User.findOne({ panNumber: panUpper });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update fields if provided
      if (holderName) user.holderName = holderName;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (email) user.email = email;

      await user.save();
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // Return success in demo mode
      if (process.env.DEMO_MODE === 'true') {
        return res.json({
          success: true,
          message: 'Profile updated successfully (demo mode)',
          user: {
            panNumber: panUpper,
            holderName: holderName || 'Demo User',
            phoneNumber: phoneNumber || '9999999999',
            email: email || 'demo@example.com'
          }
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        panNumber: user.panNumber,
        holderName: user.holderName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('User profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   DELETE /api/user/consent/:panNumber/:consentType
 * @desc    Revoke user consent
 * @access  Public
 */
router.delete('/consent/:panNumber/:consentType', optionalAuth, async (req, res) => {
  try {
    const { panNumber, consentType } = req.params;
    const panUpper = panNumber.toUpperCase();

    if (!['cibil', 'bank'].includes(consentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consent type. Must be "cibil" or "bank"'
      });
    }

    let user = null;
    try {
      user = await User.findOne({ panNumber: panUpper });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (consentType === 'cibil') {
        user.cibilConsent.isGranted = false;
        user.cibilConsent.accessToken = null;
      } else if (consentType === 'bank') {
        // Revoke all bank consents
        user.bankConsents = user.bankConsents.map(consent => ({
          ...consent,
          isGranted: false,
          accessToken: null
        }));
      }

      await user.save();
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // Return success in demo mode
      if (process.env.DEMO_MODE === 'true') {
        return res.json({
          success: true,
          message: `${consentType.toUpperCase()} consent revoked successfully (demo mode)`
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      message: `${consentType.toUpperCase()} consent revoked successfully`
    });

  } catch (error) {
    console.error('Consent revocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke consent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/user/dashboard/:panNumber
 * @desc    Get user dashboard data
 * @access  Public
 */
router.get('/dashboard/:panNumber', optionalAuth, async (req, res) => {
  try {
    const { panNumber } = req.params;
    const panUpper = panNumber.toUpperCase();

    let user = null;
    try {
      user = await User.findOne({ panNumber: panUpper });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // Return mock dashboard in demo mode
      if (process.env.DEMO_MODE === 'true') {
        return res.json({
          success: true,
          dashboard: {
            user: {
              panNumber: panUpper,
              holderName: 'Demo User',
              phoneNumber: '9999999999'
            },
            cibil: {
              score: 750,
              grade: 'GOOD',
              totalAccounts: 5,
              activeAccounts: 3
            },
            consents: {
              cibil: { isGranted: true, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
              banks: 2
            },
            documents: {
              totalRequests: 3,
              totalDocuments: 12,
              lastRequestDate: new Date()
            }
          }
        });
      }
      throw dbError;
    }

    // Calculate dashboard statistics
    const dashboard = {
      user: {
        panNumber: user.panNumber,
        holderName: user.holderName,
        phoneNumber: user.phoneNumber,
        lastLogin: user.lastLogin
      },
      cibil: user.cibilData ? {
        score: user.cibilData.score,
        grade: user.cibilData.score >= 750 ? 'EXCELLENT' : user.cibilData.score >= 650 ? 'GOOD' : 'FAIR',
        totalAccounts: user.cibilData.accounts?.length || 0,
        activeAccounts: user.cibilData.accounts?.filter(acc => acc.accountStatus === 'ACTIVE').length || 0,
        reportDate: user.cibilData.reportDate
      } : null,
      consents: {
        cibil: {
          isGranted: user.cibilConsent.isGranted,
          expiresAt: user.cibilConsent.expiresAt
        },
        banks: user.bankConsents.filter(consent => consent.isGranted).length
      },
      documents: {
        totalRequests: user.documentRequests.length,
        totalDocuments: user.documentRequests.reduce((total, req) => total + req.documents.length, 0),
        lastRequestDate: user.documentRequests.length > 0 ? 
          user.documentRequests[user.documentRequests.length - 1].requestedAt : null,
        recentRequests: user.documentRequests.slice(-5).map(req => ({
          requestId: req.requestId,
          status: req.status,
          documentCount: req.documents.length,
          requestedAt: req.requestedAt
        }))
      }
    };

    res.json({
      success: true,
      dashboard
    });

  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/user/activity/:panNumber
 * @desc    Get user activity log
 * @access  Public
 */
router.get('/activity/:panNumber', optionalAuth, async (req, res) => {
  try {
    const { panNumber } = req.params;
    const panUpper = panNumber.toUpperCase();

    // Mock activity data for demo mode
    if (process.env.DEMO_MODE === 'true') {
      const activities = [
        {
          id: 1,
          type: 'DOCUMENT_REQUEST',
          description: 'Requested documents from HDFC Bank',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          status: 'COMPLETED'
        },
        {
          id: 2,
          type: 'CONSENT_GRANTED',
          description: 'Granted consent for ICICI Bank',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          status: 'ACTIVE'
        },
        {
          id: 3,
          type: 'CIBIL_ACCESS',
          description: 'Accessed CIBIL report',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          status: 'COMPLETED'
        },
        {
          id: 4,
          type: 'PAN_VERIFICATION',
          description: 'PAN number verified successfully',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
          status: 'COMPLETED'
        }
      ];

      return res.json({
        success: true,
        activities,
        total: activities.length
      });
    }

    // For real implementation, you would query activity logs from database
    res.json({
      success: true,
      activities: [],
      total: 0,
      message: 'Activity logging not implemented for live mode'
    });

  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user activity',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;