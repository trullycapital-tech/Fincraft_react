import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft,
  Shield,
  Lock,
  CheckCircle,
  Loader2,
  Clock,
  Zap,
  Building2,
  FileText,
  Sparkles,
  ArrowRight,
  AlertCircle
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BatchOTPVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { panNumber, holderName, batchId, selectedLoans, totalDocuments, accessToken } = location.state || {};

  const [step, setStep] = useState("send_otp"); // send_otp, verify_otp, processing, completed
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [bankStatuses, setBankStatuses] = useState([]);

  useEffect(() => {
    if (!batchId) {
      navigate("/batch-consent");
      return;
    }
    // Auto-send OTP when component loads
    sendOTP();
  }, [batchId]);

  useEffect(() => {
    let timer;
    if (step === "verify_otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  useEffect(() => {
    let statusTimer;
    if (step === "processing") {
      // Poll for status updates every 2 seconds
      statusTimer = setInterval(checkProcessingStatus, 2000);
    }
    return () => clearInterval(statusTimer);
  }, [step]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendOTP = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/consent/batch/send-otp`, {
        batchId
      });
      
      if (response.data.success) {
        setStep("verify_otp");
        setCountdown(300); // Reset countdown
        toast.success("OTP sent successfully!");
      } else {
        toast.error(response.data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("OTP send error:", error);
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/consent/batch/verify-otp`, {
        batchId,
        otpCode
      });
      
      if (response.data.success) {
        setStep("processing");
        setProcessingStage("Document generation started");
        toast.success("OTP verified! Generating documents...");
        
        // Initialize bank statuses
        const uniqueBanks = [...new Set(selectedLoans.map(loan => loan.bankName))];
        setBankStatuses(uniqueBanks.map(bank => ({
          bankName: bank,
          status: 'pending',
          documentsGenerated: 0,
          documentsRequested: selectedLoans
            .filter(loan => loan.bankName === bank)
            .reduce((total, loan) => total + loan.requestedDocuments.length, 0)
        })));
        
      } else {
        toast.error(response.data.message || "OTP verification failed");
      }
    } catch (error) {
      console.error("OTP verify error:", error);
      toast.error(error.response?.data?.message || "OTP verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const checkProcessingStatus = async () => {
    try {
      const response = await axios.get(`${API}/consent/batch/status/${batchId}`);
      
      if (response.data.success) {
        const batch = response.data.batch;
        setProcessingProgress(batch.progress);
        setProcessingStage(batch.currentStage);
        
        if (response.data.bankProcessingStatus) {
          setBankStatuses(response.data.bankProcessingStatus);
        }
        
        if (batch.status === 'completed') {
          setStep("completed");
          toast.success("All documents generated successfully!");
        } else if (batch.status === 'failed') {
          toast.error("Document generation failed");
        }
      }
    } catch (error) {
      console.error("Status check error:", error);
    }
  };

  const resendOTP = async () => {
    await sendOTP();
  };

  // Helper: Flatten selected documents for Document Center (with displayName)
  const getSelectedDocumentsForCenter = () => {
    // Returns array of { bankName, documentType, displayName, loanId, accountId, loanType }
    const docs = [];
    if (!selectedLoans) return docs;
    selectedLoans.forEach(loan => {
      (loan.requestedDocuments || []).forEach(docTypeObj => {
        docs.push({
          bankName: loan.bankName,
          documentType: docTypeObj.documentType,
          displayName: docTypeObj.displayName || docTypeObj.documentType,
          loanId: loan.loanId,
          accountId: loan.accountId,
          loanType: loan.loanType
        });
      });
    });
    return docs;
  };

  const proceedToDocuments = () => {
    navigate("/document-center", {
      state: {
        panNumber,
        holderName,
        batchId,
        accessToken,
        selectedDocumentsForCenter: getSelectedDocumentsForCenter()
      }
    });
  };

  const getStageMessage = (stage) => {
    const stages = {
      'CONSENT_PENDING': 'Preparing consent...',
      'OTP_VERIFICATION': 'Verifying OTP...',
      'PROCESSING_STARTED': 'Starting document generation...',
      'FETCHING_DOCUMENTS': 'Connecting to banks...',
      'GENERATING_DOCUMENTS': 'Generating documents...',
      'COMPLETED': 'All documents ready!'
    };
    return stages[stage] || stage;
  };

  const getBankStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (!batchId) {
    navigate("/batch-consent");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              {step === "completed" ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <Zap className="w-8 h-8 text-blue-600" />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === "completed" ? "Documents Ready!" : "Batch Document Generation"}
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            {step === "completed" 
              ? "All your documents have been generated successfully"
              : "Verify OTP to generate all your loan documents"
            }
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === "send_otp" || step === "verify_otp" || step === "processing" || step === "completed" 
                ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${
              step === "verify_otp" || step === "processing" || step === "completed" 
                ? "bg-blue-600" : "bg-gray-200"
            }`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === "processing" || step === "completed" 
                ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${
              step === "completed" ? "bg-blue-600" : "bg-gray-200"
            }`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === "completed" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card className="p-8 shadow-lg border-0 bg-white">
          {step === "send_otp" && (
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center mb-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Sending OTP</h3>
              <p className="text-gray-600">
                Please wait while we send the OTP to your registered mobile number...
              </p>
            </div>
          )}

          {step === "verify_otp" && (
            <form onSubmit={verifyOTP} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Enter Batch OTP
                </h3>
                <p className="text-gray-600">
                  Enter the 6-digit OTP sent to your registered mobile number
                </p>
              </div>

              {/* Summary Banner */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-blue-900">This OTP will generate:</span>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-800">{totalDocuments} documents</span>
                    <span className="text-blue-800">•</span>
                    <span className="text-blue-800">{selectedLoans.length} loans</span>
                    <span className="text-blue-800">•</span>
                    <span className="text-blue-800">{[...new Set(selectedLoans.map(l => l.bankName))].length} banks</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="otpCode" className="text-sm font-medium text-gray-700 mb-2 block">
                  OTP Code
                </Label>
                <Input
                  id="otpCode"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="h-12 text-center text-lg tracking-wider font-mono"
                  maxLength={6}
                  required
                />
                
                {/* Demo Mode Indicator */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center text-sm text-blue-700">
                      <Sparkles className="w-4 h-4 mr-1" />
                      <span className="font-medium">Demo Mode:</span>
                      <span className="ml-1">Use OTP</span>
                      <span className="mx-1 font-mono font-bold">123456</span>
                      <span>for testing</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center text-sm">
                {countdown > 0 ? (
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-1" />
                    OTP expires in {formatTime(countdown)}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resendOTP}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Resend OTP
                  </Button>
                )}
              </div>

              <Button 
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying OTP...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Verify & Generate All Documents
                  </>
                )}
              </Button>
            </form>
          )}

          {step === "processing" && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Generating Documents
                </h3>
                <p className="text-gray-600">
                  Please wait while we generate all your loan documents
                </p>
              </div>

              {/* Overall Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{getStageMessage(processingStage)}</span>
                  <span className="font-medium text-gray-900">{processingProgress}%</span>
                </div>
                <Progress value={processingProgress} className="h-3" />
              </div>

              {/* Bank-wise Status */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Bank Processing Status</h4>
                {bankStatuses.map((bank, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getBankStatusIcon(bank.status)}
                      <div>
                        <div className="font-medium text-gray-900">{bank.bankName}</div>
                        <div className="text-sm text-gray-600">
                          {bank.documentsGenerated}/{bank.documentsRequested} documents
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-600 capitalize">
                      {bank.status}
                    </div>
                  </div>
                ))}
              </div>

              {/* Estimated Time */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-sm text-blue-800">
                  Estimated completion time: 5-10 minutes
                </div>
              </div>
            </div>
          )}

          {step === "completed" && (
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  All Documents Generated!
                </h3>
                <p className="text-gray-600">
                  Your loan documents are ready for download
                </p>
              </div>

              {/* Success Summary */}
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalDocuments}</div>
                  <div className="text-sm text-gray-600">Documents Ready</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedLoans.length}</div>
                  <div className="text-sm text-gray-600">Loans Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{[...new Set(selectedLoans.map(l => l.bankName))].length}</div>
                  <div className="text-sm text-gray-600">Banks Connected</div>
                </div>
              </div>

              <Button 
                onClick={proceedToDocuments}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5 mr-2" />
                View & Download Documents
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </Card>

        {/* Back Button */}
        {step !== "processing" && step !== "completed" && (
          <div className="mt-8 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/batch-consent", { 
                state: { panNumber, holderName, selectedLoans, totalDocuments, accessToken } 
              })}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Consent
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchOTPVerify;