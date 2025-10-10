const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = 'uploads/documents';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * @route   POST /api/retrieve-documents
 * @desc    Retrieve documents from banks
 * @access  Public (with consent verification)
 */
router.post('/retrieve-documents', [
  body('pan_number')
    .isLength({ min: 10, max: 10 })
    .withMessage('PAN number must be 10 characters'),
  body('selected_loans')
    .isArray({ min: 1 })
    .withMessage('At least one loan must be selected'),
  body('document_types')
    .isObject()
    .withMessage('Document types must be specified')
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

    const { pan_number, selected_loans, document_types } = req.body;
    const panUpper = pan_number.toUpperCase();

    // Check user and consent validity
    let user = null;
    try {
      user = await User.findOne({ panNumber: panUpper });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check CIBIL consent
      if (!user.isCibilConsentValid()) {
        return res.status(401).json({
          success: false,
          message: 'CIBIL consent has expired'
        });
      }

      // Check bank consents for selected loans
      for (const loan of selected_loans) {
        if (!user.isBankConsentValid(loan.id)) {
          return res.status(401).json({
            success: false,
            message: `Bank consent has expired for ${loan.bank_name}`
          });
        }
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // Continue in demo mode
      if (process.env.DEMO_MODE !== 'true') {
        throw dbError;
      }
    }

    // Generate request ID
    const requestId = uuidv4();

    // In demo mode, simulate document retrieval
    if (process.env.DEMO_MODE === 'true') {
      const retrievedDocuments = [];
      
      // Simulate document generation for each selected loan
      for (const loan of selected_loans) {
        const loanDocTypes = document_types[loan.id] || {};
        
        for (const [docType, isSelected] of Object.entries(loanDocTypes)) {
          if (isSelected) {
            // Generate mock document
            const fileName = `${loan.bank_name}_${docType}_${loan.account_number}_${Date.now()}.pdf`;
            const filePath = path.join(uploadsDir, fileName);
            
            // Create a minimal valid PDF file so the downloaded file can be opened by a PDF viewer
            const buildSimplePdfBuffer = (text) => {
              // Build small PDF with 5 objects: catalog, pages, page, font, content stream
              const header = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';

              const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
              const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
              const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

              // content stream
              const content = `BT /F1 24 Tf 72 720 Td (${text.replace(/\)/g,'\\)')}) Tj ET`;
              const stream = content;
              const obj5 = `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`;

              const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;

              // Build body and track offsets
              let body = '';
              const offsets = [];
              body += obj1; offsets.push(body.length - obj1.length);
              body += obj2; offsets.push(body.length - obj2.length);
              body += obj3; offsets.push(body.length - obj3.length);
              body += obj4; offsets.push(body.length - obj4.length);
              body += obj5; offsets.push(body.length - obj5.length);

              // xref table
              const xrefStart = Buffer.byteLength(header + body, 'utf8');
              let xref = 'xref\n0 6\n0000000000 65535 f \n';
              for (let off of offsets) {
                xref += String(off).padStart(10, '0') + ' 00000 n \n';
              }

              const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

              const full = header + body + xref + trailer;
              return Buffer.from(full, 'utf8');
            };

            const mockPdfBuffer = buildSimplePdfBuffer(`Mock ${docType} document for ${loan.bank_name} account ${loan.account_number}`);
            fs.writeFileSync(filePath, mockPdfBuffer);
            
            const document = {
              account_id: loan.id,
              account_number: loan.account_number,
              bank_name: loan.bank_name,
              document_type: docType,
              file_name: fileName,
              file_path: filePath,
              file_size: fs.statSync(filePath).size,
              download_url: `/api/documents/download/${requestId}/${fileName}`,
              status: 'retrieved',
              retrieved_at: new Date().toISOString()
            };
            
            retrievedDocuments.push(document);
          }
        }
      }

      // Save document request to user record
      try {
        if (user) {
          const documentRequest = {
            requestId: requestId,
            accountIds: selected_loans.map(loan => loan.id),
            documentTypes: Object.entries(document_types).map(([accountId, types]) => ({
              accountId,
              types: Object.entries(types).filter(([_, selected]) => selected).map(([type, _]) => type)
            })),
            status: 'completed',
            requestedAt: new Date(),
            completedAt: new Date(),
            documents: retrievedDocuments.map(doc => ({
              accountId: doc.account_id,
              documentType: doc.document_type,
              fileName: doc.file_name,
              filePath: doc.file_path,
              fileSize: doc.file_size,
              downloadUrl: doc.download_url,
              status: 'retrieved'
            }))
          };
          
          user.documentRequests.push(documentRequest);
          await user.save();
        }
      } catch (dbError) {
        console.log('Database operation failed:', dbError.message);
        // Continue without database in demo mode
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      return res.json({
        success: true,
        message: 'Documents retrieved successfully',
        request_id: requestId,
        total_documents: retrievedDocuments.length,
        documents: retrievedDocuments,
        processing_time: '3.2 seconds',
        next_step: 'download_documents'
      });
    }

    // Real document retrieval logic would go here
    // This would involve calling bank APIs to fetch actual documents

    res.json({
      success: true,
      message: 'Document retrieval initiated',
      request_id: requestId,
      status: 'processing',
      estimated_time: '5-10 minutes'
    });

  } catch (error) {
    console.error('Document retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/documents/download/:requestId/:fileName
 * @desc    Download a specific document
 * @access  Public
 */
router.get('/download/:requestId/:fileName', optionalAuth, async (req, res) => {
  try {
    const { requestId, fileName } = req.params;
    const filePath = path.join(uploadsDir, fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading file'
      });
    });

  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/documents/status/:requestId
 * @desc    Get document retrieval status
 * @access  Public
 */
router.get('/status/:requestId', optionalAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find user with this request
    let documentRequest = null;
    try {
      const user = await User.findOne({
        'documentRequests.requestId': requestId
      });

      if (user) {
        documentRequest = user.documentRequests.find(req => req.requestId === requestId);
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // Continue in demo mode
      if (process.env.DEMO_MODE !== 'true') {
        throw dbError;
      }
    }

    if (!documentRequest && process.env.DEMO_MODE !== 'true') {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Mock response for demo mode
    if (process.env.DEMO_MODE === 'true' && !documentRequest) {
      return res.json({
        success: true,
        request_id: requestId,
        status: 'completed',
        total_documents: 5,
        completed_documents: 5,
        failed_documents: 0,
        processing_time: '3.2 seconds'
      });
    }

    res.json({
      success: true,
      request_id: requestId,
      status: documentRequest.status,
      total_documents: documentRequest.documents.length,
      completed_documents: documentRequest.documents.filter(doc => doc.status === 'retrieved').length,
      failed_documents: documentRequest.documents.filter(doc => doc.status === 'failed').length,
      requested_at: documentRequest.requestedAt,
      completed_at: documentRequest.completedAt,
      documents: documentRequest.documents
    });

  } catch (error) {
    console.error('Document status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/documents/history/:panNumber
 * @desc    Get document request history for a user
 * @access  Public
 */
router.get('/history/:panNumber', optionalAuth, async (req, res) => {
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
      // Return empty history in demo mode
      if (process.env.DEMO_MODE === 'true') {
        return res.json({
          success: true,
          total_requests: 0,
          requests: []
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      total_requests: user.documentRequests.length,
      requests: user.documentRequests.map(req => ({
        request_id: req.requestId,
        status: req.status,
        total_documents: req.documents.length,
        requested_at: req.requestedAt,
        completed_at: req.completedAt,
        account_ids: req.accountIds
      }))
    });

  } catch (error) {
    console.error('Document history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   DELETE /api/documents/:requestId/:fileName
 * @desc    Delete a specific document
 * @access  Public
 */
router.delete('/:requestId/:fileName', optionalAuth, async (req, res) => {
  try {
    const { requestId, fileName } = req.params;
    const filePath = path.join(uploadsDir, fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    // Update database record
    try {
      const user = await User.findOne({
        'documentRequests.requestId': requestId
      });

      if (user) {
        const requestIndex = user.documentRequests.findIndex(req => req.requestId === requestId);
        if (requestIndex > -1) {
          const documentIndex = user.documentRequests[requestIndex].documents.findIndex(doc => doc.fileName === fileName);
          if (documentIndex > -1) {
            user.documentRequests[requestIndex].documents.splice(documentIndex, 1);
            await user.save();
          }
        }
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      // Continue in demo mode
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Document deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;