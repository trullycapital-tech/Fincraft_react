import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Home,
  User,
  Car,
  Briefcase,
  TrendingUp,
  Calendar,
  DollarSign,
  Target,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  ArrowRight
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoansList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { panNumber, holderName, accessToken } = location.state || {};

  const [loans, setLoans] = useState([]);
  const [selectedLoans, setSelectedLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creditScore, setCreditScore] = useState(null);


  // DEMO MODE: Static data for UI demo
  useEffect(() => {
    // Comment out navigation for demo
    // if (!panNumber) {
    //   navigate("/pan-verification");
    //   return;
    // }

    // Static demo data (matches screenshot)
    const demoLoans = [
      {
        loanId: "LAN10023565",
        bankName: "YES Bank",
        loanType: "home_loan",
        accountId: "LAN10023565",
        accountStatus: "ACTIVE",
        outstandingAmount: 3484410,
        emi: 48733,
        nextDueDate: "2024-02-15",
        loanProgress: 60,
        isOverdue: false,
      },
      {
        loanId: "LAN10023984",
        bankName: "HDFC Bank",
        loanType: "education_loan",
        accountId: "LAN10023984",
        accountStatus: "ACTIVE",
        outstandingAmount: 2473945,
        emi: 24170,
        nextDueDate: "2024-02-15",
        loanProgress: 40,
        isOverdue: false,
      },
      {
        loanId: "LAN10024001",
        bankName: "ICICI Bank",
        loanType: "personal_loan",
        accountId: "LAN10024001",
        accountStatus: "ACTIVE",
        outstandingAmount: 1850000,
        emi: 21000,
        nextDueDate: "2024-02-20",
        loanProgress: 30,
        isOverdue: false,
      },
      {
        loanId: "LAN10024002",
        bankName: "SBI Bank",
        loanType: "business_loan",
        accountId: "LAN10024002",
        accountStatus: "ACTIVE",
        outstandingAmount: 5000000,
        emi: 55000,
        nextDueDate: "2024-02-25",
        loanProgress: 50,
        isOverdue: false,
      },
      {
        loanId: "LAN10024003",
        bankName: "AXIS Bank",
        loanType: "auto_loan",
        accountId: "LAN10024003",
        accountStatus: "ACTIVE",
        outstandingAmount: 900000,
        emi: 12000,
        nextDueDate: "2024-02-28",
        loanProgress: 20,
        isOverdue: false,
      },
      {
        loanId: "LAN10024004",
        bankName: "KOTAK Bank",
        loanType: "credit_card",
        accountId: "LAN10024004",
        accountStatus: "ACTIVE",
        outstandingAmount: 150000,
        emi: 5000,
        nextDueDate: "2024-03-01",
        loanProgress: 10,
        isOverdue: false,
      },
    ];
    setLoans(demoLoans);
    setCreditScore(750);
    setIsLoading(false);
  }, []); // Empty deps for static demo

  // fetchLoans and fetchCibilReport are disabled in demo mode

  const getLoanIcon = (loanType) => {
    switch (loanType) {
      case 'home_loan':
        return <Home className="w-6 h-6" />;
      case 'personal_loan':
        return <User className="w-6 h-6" />;
      case 'business_loan':
        return <Briefcase className="w-6 h-6" />;
      case 'auto_loan':
        return <Car className="w-6 h-6" />;
      case 'credit_card':
        return <CreditCard className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleLoanSelection = (loan) => {
    setSelectedLoans(prev => {
      const isSelected = prev.find(l => l.loanId === loan.loanId);
      if (isSelected) {
        return prev.filter(l => l.loanId !== loan.loanId);
      } else {
        return [...prev, loan];
      }
    });
  };

  const selectAllLoans = () => {
    setSelectedLoans(loans);
  };

  const clearSelection = () => {
    setSelectedLoans([]);
  };

  const proceedToDocumentSelection = () => {
    if (selectedLoans.length === 0) {
      toast.error("Please select at least one loan");
      return;
    }

    navigate("/document-selection", {
      state: {
        panNumber,
        holderName,
        selectedLoans,
        accessToken
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Your Loans</h3>
          <p className="text-gray-600">Fetching loan information from CIBIL report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Loan Accounts
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Select the loans for which you want to retrieve documents
          </p>
        </div>

        {/* Credit Score Card */}
        {creditScore && (
          <Card className="p-6 mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-full shadow-sm">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">CIBIL Score</h3>
                  <p className="text-gray-600">Last updated: {formatDate(new Date())}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-green-600">{creditScore}</div>
                <div className="text-sm text-green-700 font-medium">
                  {creditScore >= 750 ? 'Excellent' : creditScore >= 650 ? 'Good' : 'Fair'}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Loan Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 text-center">
            <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{loans.length}</div>
            <div className="text-sm text-gray-600">Active Loans</div>
          </Card>
          <Card className="p-6 text-center">
            <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(loans.reduce((sum, loan) => sum + loan.outstandingAmount, 0))}
            </div>
            <div className="text-sm text-gray-600">Total Outstanding</div>
          </Card>
          <Card className="p-6 text-center">
            <Target className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{selectedLoans.length}</div>
            <div className="text-sm text-gray-600">Selected Loans</div>
          </Card>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Select Loans</h2>
            <p className="text-gray-600">Choose loans for document retrieval</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={clearSelection}
              disabled={selectedLoans.length === 0}
            >
              Clear All
            </Button>
            <Button
              variant="outline"
              onClick={selectAllLoans}
              disabled={selectedLoans.length === loans.length}
            >
              Select All
            </Button>
          </div>
        </div>

        {/* Loans Grid */}
        {loans.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Loans Found</h3>
            <p className="text-gray-600 mb-6">
              We couldn't find any active loan accounts in your CIBIL report.
            </p>
            <Button onClick={() => navigate("/cibil-consent")} variant="outline">
              Refresh CIBIL Data
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 mb-8">
            {loans.map((loan) => {
              const isSelected = selectedLoans.find(l => l.loanId === loan.loanId);
              const isOverdue = loan.isOverdue;
              
              return (
                <Card
                  key={loan.loanId}
                  className={`p-6 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
                      : 'hover:shadow-lg border-gray-200'
                  }`}
                  onClick={() => toggleLoanSelection(loan)}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="mt-1">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                    </div>

                    {/* Loan Icon */}
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      {getLoanIcon(loan.loanType)}
                    </div>

                    {/* Loan Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {loan.bankName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getLoanTypeLabel(loan.loanType)} • {loan.accountId}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(loan.accountStatus)}>
                            {loan.accountStatus}
                          </Badge>
                          {isOverdue && (
                            <Badge className="bg-red-100 text-red-800">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Outstanding</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(loan.outstandingAmount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">EMI</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {loan.emi ? formatCurrency(loan.emi) : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Next Due</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatDate(loan.nextDueDate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Progress</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-300"
                                style={{ width: `${loan.loanProgress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600">
                              {loan.loanProgress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Continue Button */}
        {loans.length > 0 && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/cibil-consent")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to CIBIL Consent
            </Button>

            <Button
              onClick={proceedToDocumentSelection}
              disabled={selectedLoans.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              Select Documents ({selectedLoans.length})
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoansList;