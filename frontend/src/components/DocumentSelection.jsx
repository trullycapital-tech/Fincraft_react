import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Calendar,
  CreditCard,
  DollarSign,
  CheckCircle,
  Building2,
  ArrowRight,
  File,
  FileSpreadsheet,
  FileClock,
  Shield
} from "lucide-react";

const DocumentSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { panNumber, holderName, selectedLoans, accessToken } = location.state || {};

  const [documentSelections, setDocumentSelections] = useState({});

  // Document types configuration
  const documentTypes = [
    {
      id: 'statement_of_account',
      name: 'Statement of Account',
      description: 'Detailed transaction history and balance statements',
      icon: <FileSpreadsheet className="w-6 h-6" />,
      color: 'bg-blue-100 text-blue-600',
      popular: true
    },
    {
      id: 'repayment_schedule',
      name: 'Repayment Schedule',
      description: 'EMI schedule and payment timeline',
      icon: <Calendar className="w-6 h-6" />,
      color: 'bg-green-100 text-green-600',
      popular: true
    },
    {
      id: 'sanction_letter',
      name: 'Sanction Letter',
      description: 'Original loan approval document',
      icon: <File className="w-6 h-6" />,
      color: 'bg-purple-100 text-purple-600',
      popular: false
    },
    {
      id: 'foreclosure_letter',
      name: 'Foreclosure Letter',
      description: 'Pre-closure calculation and process',
      icon: <FileClock className="w-6 h-6" />,
      color: 'bg-orange-100 text-orange-600',
      popular: false
    }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getLoanTypeLabel = (loanType) => {
    const labels = {
      'home_loan': 'Home Loan',
      'personal_loan': 'Personal Loan',
      'business_loan': 'Business Loan',
      'auto_loan': 'Auto Loan',
      'credit_card': 'Credit Card',
      'other': 'Other'
    };
    return labels[loanType] || loanType;
  };

  const toggleDocumentSelection = (loanId, documentType) => {
    setDocumentSelections(prev => {
      const loanSelections = prev[loanId] || [];
      const isSelected = loanSelections.includes(documentType);
      
      if (isSelected) {
        return {
          ...prev,
          [loanId]: loanSelections.filter(type => type !== documentType)
        };
      } else {
        return {
          ...prev,
          [loanId]: [...loanSelections, documentType]
        };
      }
    });
  };

  const selectAllDocumentsForLoan = (loanId) => {
    setDocumentSelections(prev => ({
      ...prev,
      [loanId]: documentTypes.map(doc => doc.id)
    }));
  };

  const selectPopularDocuments = () => {
    const popularDocs = documentTypes.filter(doc => doc.popular).map(doc => doc.id);
    const newSelections = {};
    
    selectedLoans.forEach(loan => {
      newSelections[loan.loanId] = popularDocs;
    });
    
    setDocumentSelections(newSelections);
  };

  const selectAllDocuments = () => {
    const allDocs = documentTypes.map(doc => doc.id);
    const newSelections = {};
    
    selectedLoans.forEach(loan => {
      newSelections[loan.loanId] = allDocs;
    });
    
    setDocumentSelections(newSelections);
  };

  const clearAllSelections = () => {
    setDocumentSelections({});
  };

  const getTotalSelectedDocuments = () => {
    return Object.values(documentSelections).reduce((total, docs) => total + docs.length, 0);
  };


  // Helper: Flatten selected documents for Document Center (with displayName)
  const getSelectedDocumentsForCenter = () => {
    // Returns array of { bankName, documentType, displayName, loanId, accountId, loanType }
    const docs = [];
    selectedLoans.forEach(loan => {
      (documentSelections[loan.loanId] || []).forEach(docType => {
        const docTypeObj = documentTypes.find(d => d.id === docType);
        docs.push({
          bankName: loan.bankName,
          documentType: docType,
          displayName: docTypeObj?.name || docType,
          loanId: loan.loanId,
          accountId: loan.accountId,
          loanType: loan.loanType
        });
      });
    });
    return docs;
  };

  const proceedToBatchConsent = () => {
    const totalSelected = getTotalSelectedDocuments();
    if (totalSelected === 0) {
      toast.error("Please select at least one document");
      return;
    }

    // Transform selections for backend
    const transformedLoans = selectedLoans.map(loan => ({
      loanId: loan.loanId,
      accountId: loan.accountId,
      bankName: loan.bankName,
      loanType: loan.loanType,
      outstandingAmount: loan.outstandingAmount,
      requestedDocuments: (documentSelections[loan.loanId] || []).map(docType => ({
        documentType: docType,
        priority: documentTypes.find(d => d.id === docType)?.popular ? 'HIGH' : 'MEDIUM'
      }))
    })).filter(loan => loan.requestedDocuments.length > 0);

    if (transformedLoans.length === 0) {
      toast.error("Please select at least one document");
      return;
    }

    // Pass selectedDocumentsForCenter in navigation state for Document Center
    navigate("/batch-consent", {
      state: {
        panNumber,
        holderName,
        selectedLoans: transformedLoans,
        totalDocuments: totalSelected,
        accessToken,
        selectedDocumentsForCenter: getSelectedDocumentsForCenter()
      }
    });
  };

  if (!selectedLoans?.length) {
    navigate("/loans-list");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-indigo-100 p-3 rounded-full">
              <FileText className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Select Documents
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Choose the documents you want to retrieve for each loan
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 text-center">
            <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{selectedLoans.length}</div>
            <div className="text-sm text-gray-600">Selected Loans</div>
          </Card>
          <Card className="p-6 text-center">
            <FileText className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{getTotalSelectedDocuments()}</div>
            <div className="text-sm text-gray-600">Documents Selected</div>
          </Card>
          <Card className="p-6 text-center">
            <Shield className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">1</div>
            <div className="text-sm text-gray-600">OTP Required</div>
          </Card>
        </div>

        {/* Quick Selection Controls */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Selection</h3>
              <p className="text-gray-600">Select documents for all loans at once</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={clearAllSelections}
                disabled={getTotalSelectedDocuments() === 0}
              >
                Clear All
              </Button>
              <Button
                variant="outline"
                onClick={selectPopularDocuments}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                Select Popular
              </Button>
              <Button
                onClick={selectAllDocuments}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Select All Documents
              </Button>
            </div>
          </div>

          {/* Document Types Preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {documentTypes.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 p-3 bg-white rounded-lg">
                <div className={`p-2 rounded-lg ${doc.color}`}>
                  {doc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {doc.name}
                  </div>
                  {doc.popular && (
                    <Badge variant="secondary" className="text-xs">Popular</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Loan-wise Document Selection */}
        <div className="space-y-6 mb-8">
          {selectedLoans.map((loan, index) => {
            const loanSelections = documentSelections[loan.loanId] || [];
            const selectedCount = loanSelections.length;
            
            return (
              <Card key={loan.loanId} className="p-6">
                {/* Loan Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {loan.bankName}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{getLoanTypeLabel(loan.loanType)}</span>
                      <span>•</span>
                      <span>Outstanding: {formatCurrency(loan.outstandingAmount)}</span>
                      <span>•</span>
                      <span>{loan.accountId}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {selectedCount} Document{selectedCount !== 1 ? 's' : ''}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllDocumentsForLoan(loan.loanId)}
                      disabled={selectedCount === documentTypes.length}
                    >
                      Select All
                    </Button>
                  </div>
                </div>

                {/* Document Types Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentTypes.map((docType) => {
                    const isSelected = loanSelections.includes(docType.id);
                    
                    return (
                      <div
                        key={docType.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-25'
                        }`}
                        onClick={() => toggleDocumentSelection(loan.loanId, docType.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${docType.color}`}>
                            {docType.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-1">
                                  {docType.name}
                                  {docType.popular && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      Popular
                                    </Badge>
                                  )}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {docType.description}
                                </p>
                              </div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-600'
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Benefits Banner */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <div className="flex items-start gap-4">
            <div className="bg-green-100 p-3 rounded-full">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 mb-2">Single OTP Advantage</h3>
              <p className="text-green-800 text-sm leading-relaxed">
                Instead of requesting OTP from each bank separately, we'll generate all your selected 
                documents with just one OTP verification. This saves time and provides a seamless experience.
              </p>
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/loans-list", { state: { panNumber, holderName, accessToken } })}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Loans
          </Button>

          <Button
            onClick={() => {
              // Also pass selectedDocumentsForCenter when going to Document Center directly (if needed)
              proceedToBatchConsent();
            }}
            disabled={getTotalSelectedDocuments() === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
          >
            Proceed to Consent ({getTotalSelectedDocuments()} documents)
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentSelection;