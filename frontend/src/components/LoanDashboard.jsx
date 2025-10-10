import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  IndianRupee,
  Calendar,
  Shield
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoanDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { panNumber, holderName, consentVerified, accessToken } = location.state || {};
  
  const [cibilData, setCibilData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLoans, setSelectedLoans] = useState({});
  const [documentTypes, setDocumentTypes] = useState({});
  
  useEffect(() => {
    if (!panNumber) {
      navigate("/pan-entry");
      return;
    }
    
    if (!consentVerified) {
      navigate("/consent", { state: { panNumber, holderName } });
      return;
    }
    
    fetchCibilReport();
  }, [panNumber, consentVerified, holderName, navigate]);

  const fetchCibilReport = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/cibil-report`, {
        pan_number: panNumber
      });
      
      setCibilData(response.data);
      toast.success("CIBIL report fetched successfully!");
    } catch (error) {
      console.error("CIBIL fetch error:", error);
      toast.error("Failed to fetch CIBIL report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoanSelection = (loanId, checked) => {
    setSelectedLoans(prev => ({
      ...prev,
      [loanId]: checked
    }));
    
    if (!checked) {
      // Remove document types for deselected loan
      setDocumentTypes(prev => {
        const updated = { ...prev };
        delete updated[loanId];
        return updated;
      });
    }
  };

  const handleDocumentTypeSelection = (loanId, docType, checked) => {
    setDocumentTypes(prev => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        [docType]: checked
      }
    }));
  };

  const getSelectedDocumentCount = () => {
    return Object.values(documentTypes).reduce((total, loanDocs) => {
      return total + Object.values(loanDocs || {}).filter(Boolean).length;
    }, 0);
  };

  const proceedToDocumentRetrieval = () => {
    const selectedLoanIds = Object.keys(selectedLoans).filter(id => selectedLoans[id]);
    
    if (selectedLoanIds.length === 0) {
      toast.error("Please select at least one loan account");
      return;
    }

    const totalDocuments = getSelectedDocumentCount();
    if (totalDocuments === 0) {
      toast.error("Please select at least one document type");
      return;
    }

    // Build selected loan objects safely in case cibilData.loan_accounts is missing
    const selectedLoanObjects = selectedLoanIds.map(id => {
      if (!Array.isArray(cibilData?.loan_accounts)) return null;
  return (Array.isArray(cibilData.loan_accounts) ? cibilData.loan_accounts.find(loan => String(loan?.id) === String(id)) : null) || null;
    }).filter(Boolean);

    navigate("/documents", {
      state: {
        panNumber,
        holderName,
        selectedLoans: selectedLoanObjects,
        documentTypes,
        cibilData
      }
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const documentTypeOptions = [
    { id: 'soa', label: 'Statement of Account', icon: <FileText className="w-4 h-4" /> },
    { id: 'repayment_schedule', label: 'Repayment Schedule', icon: <Calendar className="w-4 h-4" /> },
    { id: 'sanction_letter', label: 'Sanction Letter', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'foreclosure_letter', label: 'Foreclosure Letter', icon: <Download className="w-4 h-4" /> }
  ];

  if (!panNumber) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/pan-entry")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="back-to-pan-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to PAN Entry
            </Button>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={fetchCibilReport}
                disabled={isLoading}
                data-testid="refresh-data-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              ✓
            </div>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full">
              <div className="w-2/4 h-full bg-blue-600 rounded-full"></div>
            </div>
            <span className="text-sm text-gray-600">Step 2 of 4</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Loan Accounts
          </h1>
          <p className="text-gray-600">
            Select loans and documents you want to retrieve from banks
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Fetching Your CIBIL Report
            </h3>
            <p className="text-gray-600">
              Connecting to CIBIL and retrieving your loan accounts...
            </p>
          </div>
        ) : cibilData ? (
          <div className="space-y-8">
            {/* CIBIL Summary */}
            <div className="grid lg:grid-cols-4 gap-6">
              <Card className="card p-6" data-testid="cibil-score-card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{cibilData.credit_score}</p>
                    <p className="text-sm text-gray-600">CIBIL Score</p>
                  </div>
                </div>
              </Card>

              <Card className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{cibilData.total_loans}</p>
                    <p className="text-sm text-gray-600">Active Loans</p>
                  </div>
                </div>
              </Card>

              <Card className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(
                        (Array.isArray(cibilData?.loan_accounts) ? cibilData.loan_accounts : []).reduce(
                          (sum, loan) => sum + (loan?.outstanding_amount || 0),
                          0
                        )
                      )}
                    </p>
                    <p className="text-sm text-gray-600">Total Outstanding</p>
                  </div>
                </div>
              </Card>

              <Card className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{holderName}</p>
                    <p className="text-sm text-gray-600">PAN: {panNumber}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Loan Accounts */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Select Loan Accounts & Documents
              </h2>
              
              <div className="space-y-4">
                {(Array.isArray(cibilData?.loan_accounts) ? cibilData.loan_accounts : []).map((loan) => (
                  <Card key={loan.id} className="card" data-testid={`loan-card-${loan.id}`}>
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedLoans[loan.id] || false}
                          onCheckedChange={(checked) => handleLoanSelection(loan.id, checked)}
                          className="mt-2"
                          data-testid={`loan-checkbox-${loan.id}`}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4 mb-4">
                            <img
                              src={loan.bank_logo || "/api/placeholder/40/40"}
                              alt={loan.bank_name}
                              className="bank-logo"
                              onError={(e) => {
                                e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzNiODJmNiIvPgo8dGV4dCB4PSIyMCIgeT0iMjQiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iNjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5CPC90ZXh0Pgo8L3N2Zz4K";
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {loan.bank_name}
                                </h3>
                                <Badge className={getStatusColor(loan.status)}>
                                  {loan.status}
                                </Badge>
                              </div>
                              <p className="text-gray-600">
                                {loan.loan_type} • Account: {loan.account_number}
                              </p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-600">Principal Amount</p>
                              <p className="font-semibold">{formatCurrency(loan.principal_amount)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Outstanding</p>
                              <p className="font-semibold">{formatCurrency(loan.outstanding_amount)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">EMI Amount</p>
                              <p className="font-semibold">{formatCurrency(loan.emi_amount)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Tenure</p>
                              <p className="font-semibold">{loan.tenure_months} months</p>
                            </div>
                          </div>

                          {/* Document Types Selection */}
                          {selectedLoans[loan.id] && (
                            <div className="bg-gray-50 rounded-lg p-4 slide-up">
                              <h4 className="font-medium text-gray-900 mb-3">
                                Select Documents to Retrieve:
                              </h4>
                              <div className="grid sm:grid-cols-2 gap-3">
                                {documentTypeOptions.map((docType) => (
                                  <div key={docType.id} className="flex items-center gap-3">
                                    <Checkbox
                                      checked={documentTypes[loan.id]?.[docType.id] || false}
                                      onCheckedChange={(checked) => 
                                        handleDocumentTypeSelection(loan.id, docType.id, checked)
                                      }
                                      data-testid={`doc-checkbox-${loan.id}-${docType.id}`}
                                    />
                                    <div className="flex items-center gap-2">
                                      {docType.icon}
                                      <span className="text-sm text-gray-700">{docType.label}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 -mx-6">
              <div className="flex items-center justify-between max-w-6xl mx-auto">
                <div className="text-sm text-gray-600">
                  {Object.keys(selectedLoans).filter(id => selectedLoans[id]).length} loans selected • {getSelectedDocumentCount()} documents
                </div>
                
                <Button
                  onClick={proceedToDocumentRetrieval}
                  disabled={getSelectedDocumentCount() === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="proceed-to-documents-btn"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Retrieve Documents ({getSelectedDocumentCount()})
                </Button>
              </div>
            </div>

            {/* Security Note */}
            <Card className="bg-blue-50 border-blue-200 p-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">
                    Secure Document Retrieval Process
                  </h4>
                  <p className="text-sm text-blue-800">
                    We'll request consent from each selected bank through their official APIs. 
                    You'll receive OTP confirmations for secure document access. No passwords or 
                    credentials are stored.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Data Available
            </h3>
            <p className="text-gray-600 mb-4">
              Unable to fetch CIBIL report. Please try again.
            </p>
            <Button onClick={fetchCibilReport} variant="outline">
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanDashboard;