const express = require('express');
const { body, validationResult } = require('express-validator');
const ConsentBatch = require('../models/ConsentBatch');
const Loan = require('../models/Loan');
const Document = require('../models/Document');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * @route   POST /api/consent/batch/create
 * @desc    Create a new batch consent request
 * @access  Public
 */
router.post('/batch/create', [
  body('panNumber')
    .isLength({ min: 10, max: 10 })
    .withMessage('PAN number must be 10 characters'),
  body('selectedLoans')
    .isArray({ min: 1 })
    .withMessage('At least one loan must be selected'),
  body('selectedLoans.*.loanId')
    .notEmpty()
    .withMessage('Loan ID is required'),
  body('selectedLoans.*.requestedDocuments')
    .isArray({ min: 1 })
    .withMessage('At least one document type must be selected for each loan')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { panNumber, selectedLoans, phoneNumber, emailAddress } = req.body;
    const panUpper = panNumber.toUpperCase();

    // Validate user exists and has CIBIL consent
    let user = null;
    try {
      user = await User.findOne({ panNumber: panUpper });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please complete PAN verification first.'
        });
      }

      if (!user.isCibilConsentValid()) {
        return res.status(401).json({
          success: false,
          message: 'CIBIL consent has expired. Please renew consent.'
        });
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      
      if (process.env.DEMO_MODE !== 'true') {
        throw dbError;
      }
    }

    // Generate batch ID
    const batchId = `BATCH_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Calculate total documents
    let totalDocuments = 0;
    selectedLoans.forEach(loan => {
      totalDocuments += loan.requestedDocuments.length;
    });

    // Create consent batch
    const consentBatch = {
      batchId,
      panNumber: panUpper,
      selectedLoans,
      totalDocumentsRequested: totalDocuments,
      phoneNumber: phoneNumber || user?.phoneNumber,
      emailAddress: emailAddress || user?.email,
      requestMetadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID || uuidv4(),
        source: 'WEB'
      },
      progress: {
        stages: [
          { stageName: 'CONSENT_PENDING', status: 'in_progress' },
          { stageName: 'OTP_VERIFICATION', status: 'pending' },
          { stageName: 'PROCESSING_STARTED', status: 'pending' },
          { stageName: 'FETCHING_DOCUMENTS', status: 'pending' },
          { stageName: 'GENERATING_DOCUMENTS', status: 'pending' },
          { stageName: 'COMPLETED', status: 'pending' }
        ]
      }
    };

    let savedBatch = null;
    try {
      savedBatch = await ConsentBatch.create(consentBatch);
      await savedBatch.calculateTotalDocuments();
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      
      if (process.env.DEMO_MODE === 'true') {
        // Return demo response
        return res.json({
          success: true,
          message: 'Batch consent request created successfully',
          batchId,
          totalLoans: selectedLoans.length,
          totalDocuments,
          estimatedTime: '5-10 minutes',
          next_step: 'send_otp'
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      message: 'Batch consent request created successfully',
      batchId: savedBatch.batchId,
      totalLoans: selectedLoans.length,
      totalDocuments: savedBatch.totalDocumentsRequested,
      estimatedTime: '5-10 minutes',
      next_step: 'send_otp'
    });

  } catch (error) {
    console.error('Error creating batch consent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create batch consent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/consent/batch/send-otp
 * @desc    Send OTP for batch consent verification
 * @access  Public
 */
router.post('/batch/send-otp', [
  body('batchId')
    .notEmpty()
    .withMessage('Batch ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { batchId } = req.body;

    let batch = null;
    try {
      batch = await ConsentBatch.findOne({ batchId });
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'Batch consent request not found'
        });
      }

      if (batch.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'OTP already sent or batch is in different state'
        });
      }

      // Generate and send OTP
      await batch.generateOTP();
      
      // Add notification
      await batch.addNotification('SMS', `Your OTP for document consent is: ${batch.otpCode}`);

    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      
      if (process.env.DEMO_MODE === 'true') {
        // Return demo OTP
        return res.json({
          success: true,
          message: 'OTP sent successfully to registered mobile number',
          batchId,
          expiresIn: 300, // 5 minutes
          demo_otp: process.env.NODE_ENV === 'development' ? '999888' : undefined
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to registered mobile number',
      batchId: batch.batchId,
      expiresIn: 300, // 5 minutes
      demo_otp: process.env.NODE_ENV === 'development' ? batch.otpCode : undefined
    });

  } catch (error) {
    console.error('Error sending batch OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/consent/batch/verify-otp
 * @desc    Verify OTP and start document generation process
 * @access  Public
 */
router.post('/batch/verify-otp', [
  body('batchId')
    .notEmpty()
    .withMessage('Batch ID is required'),
  body('otpCode')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { batchId, otpCode } = req.body;

    let batch = null;
    try {
      batch = await ConsentBatch.findOne({ batchId });
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'Batch consent request not found'
        });
      }

      // Verify OTP
      await batch.verifyOTP(otpCode);

      // Start document processing (simulate)
      batch.status = 'processing';
      batch.processingStartedAt = new Date();
      batch.estimatedCompletionTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Update progress
      batch.progress.currentStage = 'FETCHING_DOCUMENTS';
      await batch.updateStage('PROCESSING_STARTED', 'completed');
      await batch.updateStage('FETCHING_DOCUMENTS', 'in_progress');

      await batch.save();

      // Start async document generation process
      this.startDocumentGeneration(batch);

    } catch (dbError) {
      if (dbError.message.includes('OTP') || dbError.message.includes('Invalid')) {
        return res.status(400).json({
          success: false,
          message: dbError.message
        });
      }
      
      console.log('Database operation failed:', dbError.message);
      
      if (process.env.DEMO_MODE === 'true') {
        return res.json({
          success: true,
          message: 'OTP verified successfully. Document generation started.',
          batchId,
          status: 'processing',
          estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000),
          next_step: 'check_status'
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      message: 'OTP verified successfully. Document generation started.',
      batchId: batch.batchId,
      status: batch.status,
      estimatedCompletion: batch.estimatedCompletionTime,
      next_step: 'check_status'
    });

  } catch (error) {
    console.error('Error verifying batch OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/consent/batch/status/:batchId
 * @desc    Get batch processing status
 * @access  Public
 */
router.get('/batch/status/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;

    let batch = null;
    try {
      batch = await ConsentBatch.findOne({ batchId });
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'Batch consent request not found'
        });
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      
      if (process.env.DEMO_MODE === 'true') {
        return res.json({
          success: true,
          batch: {
            batchId,
            status: 'completed',
            progress: 100,
            currentStage: 'COMPLETED',
            totalDocumentsRequested: 6,
            documentsGenerated: 6,
            documentsFailed: 0,
            bankProcessingStatus: [
              { bankName: 'HDFC Bank', status: 'completed', documentsGenerated: 2 },
              { bankName: 'ICICI Bank', status: 'completed', documentsGenerated: 2 },
              { bankName: 'State Bank of India', status: 'completed', documentsGenerated: 2 }
            ]
          }
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      batch: batch.getSummary(),
      bankProcessingStatus: batch.bankProcessingStatus,
      progress: {
        percentage: batch.overallProgress,
        currentStage: batch.progress.currentStage,
        stages: batch.progress.stages
      }
    });

  } catch (error) {
    console.error('Error getting batch status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get batch status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/consent/batch/history/:panNumber
 * @desc    Get batch consent history for a PAN
 * @access  Public
 */
router.get('/batch/history/:panNumber', async (req, res) => {
  try {
    const { panNumber } = req.params;
    const panUpper = panNumber.toUpperCase();

    let batches = [];
    try {
      batches = await ConsentBatch.getBatchesByPAN(panUpper);
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      
      if (process.env.DEMO_MODE === 'true') {
        batches = [
          {
            batchId: 'BATCH_DEMO_001',
            status: 'completed',
            totalLoans: 3,
            totalDocumentsRequested: 6,
            documentsGenerated: 6,
            progress: 100,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
          }
        ];
      } else {
        throw dbError;
      }
    }

    res.json({
      success: true,
      message: `Found ${batches.length} batch requests`,
      batches: batches.map(batch => batch.getSummary ? batch.getSummary() : batch),
      total: batches.length
    });

  } catch (error) {
    console.error('Error getting batch history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get batch history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to start document generation (async)
async function startDocumentGeneration(batch) {
  try {
    // Simulate document generation process
    setTimeout(async () => {
      try {
        // Update to generating stage
        await batch.updateStage('GENERATING_DOCUMENTS', 'in_progress');
        
        // Process each bank
        for (const loan of batch.selectedLoans) {
          await batch.updateBankStatus(loan.bankName, 'processing', {
            documentsRequested: loan.requestedDocuments.length
          });
          
          // Simulate document generation for each requested document
          for (const docRequest of loan.requestedDocuments) {
            // Create document record
            const documentId = `DOC_${Date.now()}_${uuidv4().substring(0, 8)}`;
            
            const document = {
              documentId,
              requestId: batch.batchId,
              panNumber: batch.panNumber,
              loanId: loan.loanId,
              accountId: loan.accountId,
              bankName: loan.bankName,
              documentType: docRequest.documentType,
              documentSubType: docRequest.subType,
              status: 'ready',
              fileName: `${loan.bankName}_${docRequest.documentType}_${Date.now()}.pdf`,
              filePath: `/uploads/documents/${documentId}.pdf`,
              fileSize: Math.floor(Math.random() * 1000000) + 100000, // Random size between 100KB-1MB
              mimeType: 'application/pdf',
              generatedAt: new Date(),
              sourceSystem: 'BANK_API'
            };

            // Save document
            await Document.create(document);
            batch.documentsGenerated += 1;
          }
          
          await batch.updateBankStatus(loan.bankName, 'completed', {
            documentsGenerated: loan.requestedDocuments.length
          });
        }
        
        // Complete the batch
        batch.status = 'completed';
        batch.processingCompletedAt = new Date();
        batch.completedAt = new Date();
        batch.progress.currentStage = 'COMPLETED';
        
        await batch.updateStage('GENERATING_DOCUMENTS', 'completed');
        await batch.updateStage('COMPLETED', 'completed');
        
        await batch.save();
        
        // Send completion notification
        await batch.addNotification('SMS', 'Your documents are ready for download!');
        
      } catch (error) {
        console.error('Error in document generation:', error);
        batch.status = 'failed';
        await batch.addError('GENERATION_FAILED', error.message);
        await batch.save();
      }
    }, 5000); // 5 second delay to simulate processing
    
  } catch (error) {
    console.error('Error starting document generation:', error);
  }
}

module.exports = router;
