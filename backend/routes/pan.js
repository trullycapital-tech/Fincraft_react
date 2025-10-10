const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/pan-images/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pan-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an image file'), false);
    }
  }
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = 'uploads/pan-images';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * @route   POST /api/validate-pan
 * @desc    Validate PAN number
 * @access  Public
 */
router.post('/validate-pan', [
  body('pan_number')
    .isLength({ min: 10, max: 10 })
    .withMessage('PAN number must be 10 characters')
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN number format')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        is_valid: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { pan_number } = req.body;
    const panUpper = pan_number.toUpperCase();

    // In demo mode, return mock data
    if (process.env.DEMO_MODE === 'true') {
      // Mock validation logic
      const mockHolderNames = {
        'ABCDE1234F': 'John Doe',
        'FGHIJ5678K': 'Jane Smith',
        'KLMNO9012P': 'Robert Johnson',
        'PQRST3456U': 'Mary Williams'
      };

      const holderName = mockHolderNames[panUpper] || 'Demo User';
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = {
        success: true,
        is_valid: true,
        message: 'PAN validation successful',
        pan_number: panUpper,
        holder_name: holderName,
        status: 'VALID',
        source: 'MOCK_API'
      };

      // Try to find or create user record
      try {
        let user = await User.findOne({ panNumber: panUpper });
        if (!user) {
          user = new User({
            panNumber: panUpper,
            holderName: holderName,
            phoneNumber: '9999999999' // Will be updated when phone is provided
          });
          await user.save();
        }
        result.user_id = user._id;
      } catch (dbError) {
        console.log('Database operation failed in demo mode:', dbError.message);
        // Continue without database in demo mode
      }

      return res.json(result);
    }

    // Real PAN validation logic would go here
    // For now, return a generic success response
    res.json({
      success: true,
      is_valid: true,
      message: 'PAN validation successful',
      pan_number: panUpper,
      holder_name: 'User Name', // Would come from actual API
      status: 'VALID',
      source: 'LIVE_API'
    });

  } catch (error) {
    console.error('PAN validation error:', error);
    res.status(500).json({
      success: false,
      is_valid: false,
      message: 'PAN validation failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/upload-pan-image
 * @desc    Upload and extract PAN from image using OCR
 * @access  Public
 */
router.post('/upload-pan-image', upload.single('file'), optionalAuth, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const imagePath = req.file.path;
    
    try {
      // Preprocess image for better OCR accuracy
      const processedImagePath = imagePath.replace(path.extname(imagePath), '_processed.png');
      
      await sharp(imagePath)
        .resize(800, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .sharpen()
        .normalise()
        .png()
        .toFile(processedImagePath);

      // Perform OCR
      const { data: { text } } = await Tesseract.recognize(
        processedImagePath, 
        'eng',
        {
          logger: m => console.log(m)
        }
      );

      // Extract PAN number from OCR text
      const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/g;
      const panMatches = text.match(panRegex);
      
      if (panMatches && panMatches.length > 0) {
        const extractedPAN = panMatches[0];
        
        // Validate the extracted PAN
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/validate-pan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pan_number: extractedPAN })
        });
        
        const validationResult = await response.json();
        
        // Clean up temporary files
        fs.unlinkSync(imagePath);
        fs.unlinkSync(processedImagePath);
        
        if (validationResult.is_valid) {
          return res.json({
            success: true,
            message: 'PAN extracted and validated successfully',
            extracted_pan: extractedPAN,
            holder_name: validationResult.holder_name,
            confidence: 'HIGH',
            ocr_text: text
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Extracted PAN is invalid',
            extracted_pan: extractedPAN,
            ocr_text: text
          });
        }
      } else {
        // Clean up files
        fs.unlinkSync(imagePath);
        fs.unlinkSync(processedImagePath);
        
        return res.status(400).json({
          success: false,
          message: 'No valid PAN number found in the image',
          suggestion: 'Please ensure the image is clear and contains a valid PAN card',
          ocr_text: text
        });
      }

    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      
      // Clean up files
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to process image',
        error: 'OCR processing failed'
      });
    }

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/pan/validate/:panNumber
 * @desc    Alternative endpoint for PAN validation
 * @access  Public
 */
router.get('/validate/:panNumber', optionalAuth, async (req, res) => {
  try {
    const { panNumber } = req.params;
    
    if (!panNumber || panNumber.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN number'
      });
    }

    // Call the main validation endpoint
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/validate-pan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pan_number: panNumber })
    });
    
    const result = await response.json();
    res.status(response.status).json(result);

  } catch (error) {
    console.error('PAN validation error:', error);
    res.status(500).json({
      success: false,
      message: 'PAN validation failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;