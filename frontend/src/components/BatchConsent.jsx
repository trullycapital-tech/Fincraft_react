import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Shield,
  Zap,
  Clock,
  Building2,
  FileText,
  CheckCircle,
  Loader2,
  ArrowRight,
  Users,
  Target,
  Sparkles
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BatchConsent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { panNumber, holderName, selectedLoans, totalDocuments, accessToken } = location.state || {};

  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [batchId, setBatchId] = useState("");

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

  const getDocumentTypeLabel = (docType) => {
    const labels = {
      'statement_of_account': 'Statement of Account',
      'repayment_schedule': 'Repayment Schedule',
      'sanction_letter': 'Sanction Letter',
      'foreclosure_letter': 'Foreclosure Letter'
    };
    return labels[docType] || docType;
  };

  const getTotalOutstanding = () => {
    return selectedLoans.reduce((sum, loan) => sum + loan.outstandingAmount, 0);
  };

  const getUniqueBanks = () => {
    return [...new Set(selectedLoans.map(loan => loan.bankName))];
  };

  const createBatchConsent = async () => {
    if (!isConsentChecked) {
      toast.error("Please provide your consent to proceed");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/consent/batch/create`, {
        panNumber,
        selectedLoans
      });
      
      if (response.data.success) {
        setBatchId(response.data.batchId);
        toast.success("Batch consent created successfully!");
        
        // Proceed to OTP verification
        setTimeout(() => {
          navigate("/batch-otp-verify", {
            state: {
              panNumber,
              holderName,
              batchId: response.data.batchId,
              selectedLoans,
              totalDocuments,
              accessToken
            }
          });
        }, 1000);
      } else {
        toast.error(response.data.message || "Failed to create batch consent");
      }
    } catch (error) {
      console.error("Batch consent creation error:", error);
      toast.error(error.response?.data?.message || "Failed to create batch consent");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedLoans?.length) {
    navigate("/document-selection");
    return null;
  }

  const uniqueBanks = getUniqueBanks();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-purple-100 p-3 rounded-full">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Batch Document Consent
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            One consent for all your loan documents across multiple banks
          </p>
        </div>

        {/* Benefits Banner */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto mb-3">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-purple-900 mb-1">Single OTP</h3>
              <p className="text-sm text-purple-700">One OTP for all banks</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-3">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-blue-900 mb-1">Parallel Processing</h3>
              <p className="text-sm text-blue-700">Faster document generation</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-3">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-900 mb-1">Secure Process</h3>
              <p className="text-sm text-green-700">Bank-grade security</p>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <Building2 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-900">{uniqueBanks.length}</div>
            <div className="text-xs text-gray-600">Banks</div>
          </Card>
          <Card className="p-4 text-center">
            <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-900">{selectedLoans.length}</div>
            <div className="text-xs text-gray-600">Loan Accounts</div>
          </Card>
          <Card className="p-4 text-center">
            <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-900">{totalDocuments}</div>
            <div className="text-xs text-gray-600">Documents</div>
          </Card>
          <Card className="p-4 text-center">
            <Target className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-900">5-10</div>
            <div className="text-xs text-gray-600">Minutes</div>
          </Card>
        </div>

        {/* Selected Banks */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Banks & Documents</h3>
          <div className="space-y-4">
            {uniqueBanks.map((bankName, index) => {
              const bankLoans = selectedLoans.filter(loan => loan.bankName === bankName);
              const bankDocuments = bankLoans.reduce((total, loan) => total + loan.requestedDocuments.length, 0);
              
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{bankName}</h4>
                        <p className="text-sm text-gray-600">
                          {bankLoans.length} loan{bankLoans.length > 1 ? 's' : ''} • {bankDocuments} document{bankDocuments > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {formatCurrency(bankLoans.reduce((sum, loan) => sum + loan.outstandingAmount, 0))}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-2">
                    {bankLoans.map((loan, loanIndex) => (
                      <div key={loanIndex} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900">
                            {getLoanTypeLabel(loan.loanType)}
                          </span>
                          <span className="text-sm text-gray-600">{loan.accountId}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {loan.requestedDocuments.map((doc, docIndex) => (
                            <Badge key={docIndex} variant="outline" className="text-xs">
                              {getDocumentTypeLabel(doc.documentType)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Consent Text */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Consent Terms</h3>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
            <h4 className="font-semibold text-blue-900 mb-2">What this consent allows:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Access loan account information from selected banks</li>
              <li>• Generate and download requested document types</li>
              <li>• Process multiple bank requests with single authorization</li>
              <li>• Store documents securely for 30 days for your access</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Your Rights:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• You can revoke this consent at any time</li>
              <li>• Documents will be deleted after 30 days automatically</li>
              <li>• Your data is encrypted and processed securely</li>
              <li>• No information is shared with third parties</li>
            </ul>
          </div>
        </Card>

        {/* Consent Checkbox */}
        <Card className="p-6 mb-8">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="batchConsent"
              checked={isConsentChecked}
              onChange={(e) => setIsConsentChecked(e.target.checked)}
              className="w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-purple-500 mt-1"
            />
            <label htmlFor="batchConsent" className="text-sm text-gray-700 leading-relaxed">
              <span className="font-semibold">I hereby provide my consent</span> to FinCraft for accessing my loan account information from the selected banks ({uniqueBanks.join(', ')}) and generating the requested documents. I understand that this consent covers all selected loans and document types mentioned above, and I can revoke this consent at any time.
            </label>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/document-selection", { 
              state: { panNumber, holderName, selectedLoans, accessToken } 
            })}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Document Selection
          </Button>

          <Button
            onClick={createBatchConsent}
            disabled={!isConsentChecked || isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Consent...
              </>
            ) : (
              <>
                Continue & Send OTP
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BatchConsent;