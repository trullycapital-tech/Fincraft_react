const express = require('express');
const { body, validationResult } = require('express-validator');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * @route   GET /api/loans/:panNumber
 * @desc    Get all loans for a PAN number
 * @access  Public
 */
router.get('/:panNumber', async (req, res) => {
  try {
    const { panNumber } = req.params;
    const panUpper = panNumber.toUpperCase();

    // Validate PAN format
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panUpper)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN number format'
      });
    }

    let loans = [];
    
    try {
      // Try to get loans from database
      loans = await Loan.getLoansByPAN(panUpper);
      
      // If no loans found, try to get from user's CIBIL data
      if (loans.length === 0) {
        const user = await User.findOne({ panNumber: panUpper });
        if (user && user.cibilData && user.cibilData.accounts) {
          // Convert CIBIL accounts to loan format
          const cibilLoans = user.cibilData.accounts
            .filter(acc => acc.accountStatus === 'ACTIVE')
            .map(acc => ({
              loanId: `LOAN_${acc.accountId || uuidv4()}`,
              panNumber: panUpper,
              bankName: acc.bankName,
              accountId: acc.accountId || `ACC_${uuidv4()}`,
              loanType: this.mapAccountTypeToLoanType(acc.accountType),
              outstandingAmount: acc.currentBalance || 0,
              sanctionedAmount: acc.sanctionedAmount || acc.creditLimit || acc.currentBalance || 0,
              emi: this.calculateEMI(acc.currentBalance, acc.accountType),
              nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              accountStatus: 'ACTIVE',
              dateOpened: acc.dateOpened || new Date(),
              sourceSystem: 'CIBIL',
              sourceId: acc.accountId
            }));
          
          loans = cibilLoans;
        }
      }
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      
      // Return demo loans in demo mode
      if (process.env.DEMO_MODE === 'true') {
        loans = this.getDemoLoans(panUpper);
      } else {
        throw dbError;
      }
    }

    // If still no loans, return demo data
    if (loans.length === 0 && process.env.DEMO_MODE === 'true') {
      loans = this.getDemoLoans(panUpper);
    }

    res.json({
      success: true,
      message: `Found ${loans.length} active loans`,
      loans: loans.map(loan => ({
        loanId: loan.loanId,
        bankName: loan.bankName,
        accountId: loan.accountId,
        loanType: loan.loanType,
        outstandingAmount: loan.outstandingAmount,
        sanctionedAmount: loan.sanctionedAmount,
        emi: loan.emi,
        nextDueDate: loan.nextDueDate,
        accountStatus: loan.accountStatus,
        dateOpened: loan.dateOpened,
        isOverdue: loan.isOverdue ? loan.isOverdue() : false,
        loanProgress: loan.loanProgress || 0
      })),
      totalLoans: loans.length,
      totalOutstanding: loans.reduce((sum, loan) => sum + loan.outstandingAmount, 0)
    });

  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loans',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/loans/:panNumber/bank/:bankName
 * @desc    Get loans for a specific bank
 * @access  Public
 */
router.get('/:panNumber/bank/:bankName', async (req, res) => {
  try {
    const { panNumber, bankName } = req.params;
    const panUpper = panNumber.toUpperCase();

    let loans = [];
    
    try {
      loans = await Loan.getLoansByBank(panUpper, bankName);
    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      
      if (process.env.DEMO_MODE === 'true') {
        const allLoans = this.getDemoLoans(panUpper);
        loans = allLoans.filter(loan => 
          loan.bankName.toLowerCase() === bankName.toLowerCase()
        );
      } else {
        throw dbError;
      }
    }

    res.json({
      success: true,
      message: `Found ${loans.length} loans with ${bankName}`,
      loans: loans.map(loan => loan.getSummary ? loan.getSummary() : loan),
      bankName
    });

  } catch (error) {
    console.error('Error fetching bank loans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank loans',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/loans/sync/:panNumber
 * @desc    Sync loans from CIBIL data to loans collection
 * @access  Public
 */
router.post('/sync/:panNumber', [
  body('force')
    .optional()
    .isBoolean()
    .withMessage('Force must be a boolean')
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

    const { panNumber } = req.params;
    const { force = false } = req.body;
    const panUpper = panNumber.toUpperCase();

    let syncedLoans = 0;
    let existingLoans = 0;

    try {
      const user = await User.findOne({ panNumber: panUpper });
      if (!user || !user.cibilData || !user.cibilData.accounts) {
        return res.status(404).json({
          success: false,
          message: 'No CIBIL data found for this PAN'
        });
      }

      for (const account of user.cibilData.accounts) {
        if (account.accountStatus !== 'ACTIVE') continue;

        const existingLoan = await Loan.findOne({ 
          panNumber: panUpper, 
          accountId: account.accountId 
        });

        if (existingLoan && !force) {
          existingLoans++;
          continue;
        }

        const loanData = {
          loanId: existingLoan?.loanId || `LOAN_${account.accountId || uuidv4()}`,
          panNumber: panUpper,
          bankName: account.bankName,
          accountId: account.accountId || `ACC_${uuidv4()}`,
          loanType: this.mapAccountTypeToLoanType(account.accountType),
          outstandingAmount: account.currentBalance || 0,
          sanctionedAmount: account.sanctionedAmount || account.creditLimit || account.currentBalance || 0,
          emi: this.calculateEMI(account.currentBalance, account.accountType),
          nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          accountStatus: 'ACTIVE',
          dateOpened: account.dateOpened || new Date(),
          sourceSystem: 'CIBIL',
          sourceId: account.accountId
        };

        if (existingLoan) {
          await Loan.findByIdAndUpdate(existingLoan._id, loanData);
        } else {
          await Loan.create(loanData);
        }
        
        syncedLoans++;
      }

    } catch (dbError) {
      console.log('Database operation failed:', dbError.message);
      
      if (process.env.DEMO_MODE !== 'true') {
        throw dbError;
      }
    }

    res.json({
      success: true,
      message: 'Loans synchronized successfully',
      syncedLoans,
      existingLoans,
      totalProcessed: syncedLoans + existingLoans
    });

  } catch (error) {
    console.error('Error syncing loans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync loans',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper methods
function mapAccountTypeToLoanType(accountType) {
  const typeMap = {
    'Home Loan': 'home_loan',
    'Personal Loan': 'personal_loan',
    'Business Loan': 'business_loan',
    'Credit Card': 'credit_card',
    'Auto Loan': 'auto_loan',
    'Mortgage': 'home_loan',
    'Term Loan': 'business_loan'
  };
  return typeMap[accountType] || 'other';
}

function calculateEMI(outstandingAmount, accountType) {
  // Simple EMI calculation - in real scenario, this would use proper loan terms
  const baseEMI = outstandingAmount * 0.015; // 1.5% of outstanding as rough EMI
  
  if (accountType === 'Credit Card') return 0; // Credit cards don't have fixed EMI
  if (accountType === 'Home Loan') return baseEMI * 0.7; // Home loans typically have lower EMI ratio
  
  return Math.round(baseEMI);
}

function getDemoLoans(panNumber) {
  return [
    {
      loanId: 'LOAN_HDFC_001',
      panNumber,
      bankName: 'HDFC Bank',
      accountId: 'HDFC123456789',
      loanType: 'home_loan',
      outstandingAmount: 2500000,
      sanctionedAmount: 3000000,
      emi: 28500,
      nextDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      accountStatus: 'ACTIVE',
      dateOpened: new Date('2020-03-15'),
      sourceSystem: 'CIBIL',
      isOverdue: () => false,
      loanProgress: 17
    },
    {
      loanId: 'LOAN_ICICI_001',
      panNumber,
      bankName: 'ICICI Bank',
      accountId: 'ICICI987654321',
      loanType: 'personal_loan',
      outstandingAmount: 450000,
      sanctionedAmount: 500000,
      emi: 12500,
      nextDueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      accountStatus: 'ACTIVE',
      dateOpened: new Date('2022-06-10'),
      sourceSystem: 'CIBIL',
      isOverdue: () => false,
      loanProgress: 10
    },
    {
      loanId: 'LOAN_SBI_001',
      panNumber,
      bankName: 'State Bank of India',
      accountId: 'SBI456789123',
      loanType: 'business_loan',
      outstandingAmount: 800000,
      sanctionedAmount: 1000000,
      emi: 18500,
      nextDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      accountStatus: 'ACTIVE',
      dateOpened: new Date('2021-09-20'),
      sourceSystem: 'CIBIL',
      isOverdue: () => false,
      loanProgress: 20
    }
  ];
}

module.exports = router;