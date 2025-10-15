import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Shield, 
  Download, 
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Timer,
  Building2,
  Eye,
  ExternalLink,
  RefreshCw
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DocumentRetrieval = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { panNumber, holderName, selectedLoans, documentTypes, cibilData } = location.state || {};
  
  const [retrievalStage, setRetrievalStage] = useState("consent"); // consent, otp, retrieving, completed
  const [consentTokens, setConsentTokens] = useState({});
  const [otpValues, setOtpValues] = useState({});
  const [isProcessing, setIsProcessing] = useState({});
  const [retrievedDocuments, setRetrievedDocuments] = useState([]);
  const [errors, setErrors] = useState({});
  const [countdown, setCountdown] = useState(300); // 5 minutes

  useEffect(() => {
    if (!selectedLoans || !documentTypes) {
      navigate("/dashboard");
      return;
    }

    // Start consent process automatically
    initiateConsentProcess();
  }, [selectedLoans, documentTypes, navigate]);

  useEffect(() => {
    // Countdown timer for OTP expiry
    if (retrievalStage === "otp" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, retrievalStage]);

  const initiateConsentProcess = async () => {
    setIsProcessing({ consent: true });

    try {
      // Fire all consent requests in parallel to reduce total latency
      const requests = selectedLoans.map((loan) =>
        axios.post(`${API}/request-consent`, {
          account_id: loan.id,
          pan_number: panNumber,
        }).then(res => ({ loanId: loan.id, data: res.data }))
          .catch(err => ({ loanId: loan.id, error: err }))
      );

      const results = await Promise.allSettled(requests);

      const tokens = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value && r.value.data && r.value.data.consent_token) {
          tokens[r.value.loanId] = r.value.data;
        } else if (r.status === 'fulfilled' && r.value && r.value.error) {
          console.warn(`Consent request failed for loan ${r.value.loanId}`, r.value.error);
        } else if (r.status === 'rejected') {
          console.warn('Consent request promise rejected', r.reason);
        }
      });

      setConsentTokens(tokens);
      setRetrievalStage("otp");
      toast.success("Consent requests sent to all banks!");

    } catch (error) {
      console.error("Consent process error:", error);
      toast.error("Failed to initiate consent process");
      setErrors({ consent: "Failed to request consent from banks" });
    } finally {
      setIsProcessing({ consent: false });
    }
  };

  const handleOtpSubmit = async (loanId) => {
    const otp = otpValues[loanId];
    
    if (!otp || otp.length < 4) {
      toast.error("Please enter a valid OTP");
      return;
    }

    setIsProcessing(prev => ({ ...prev, [loanId]: true }));
    
    try {
      const loan = selectedLoans.find(l => l.id === loanId);
      const selectedDocTypes = Object.keys(documentTypes[loanId] || {})
        .filter(docType => documentTypes[loanId][docType]);

      // Backend expects `selected_loans` (array of loan objects) and `document_types` mapping
      const response = await axios.post(`${API}/retrieve-documents`, {
        pan_number: panNumber,
        selected_loans: [loan],
        document_types: documentTypes,
        consent_otp: otp
      });

      if (response.data.success) {
        setRetrievedDocuments(prev => [...prev, ...response.data.documents]);
        toast.success(`Documents retrieved from ${loan.bank_name}`);
        
        // Remove this loan from processing
        const updatedProcessing = { ...isProcessing };
        delete updatedProcessing[loanId];
        setIsProcessing(updatedProcessing);
        
        // Check if all loans are processed
        const allProcessed = selectedLoans.every(loan => 
          retrievedDocuments.some(doc => doc.account_id === loan.id) ||
          Object.keys(updatedProcessing).includes(loan.id) === false
        );
        
        if (allProcessed && Object.keys(updatedProcessing).length === 1) {
          setTimeout(() => {
            setRetrievalStage("completed");
          }, 1000);
        }
      }
    } catch (error) {
      // Show server response if available
      console.error("Document retrieval error:", error.response ? error.response.data : error.message);
      toast.error("Failed to retrieve documents");
      setErrors(prev => ({ ...prev, [loanId]: "Document retrieval failed" }));
    } finally {
      setIsProcessing(prev => {
        const updated = { ...prev };
        delete updated[loanId];
        return updated;
      });
    }
  };

  const handleDownload = async (doc) => {
    try {
      // backend serves the file stream at doc.download_url; request as arraybuffer
      const url = `${BACKEND_URL}${doc.download_url}`;
      const response = await axios.get(url, { responseType: 'arraybuffer' });

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const urlObj = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.style.display = 'none';
      a.href = urlObj;
      a.download = doc.file_name || (doc.file_path ? doc.file_path.split('\\').pop() : 'document.pdf');
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(urlObj);
      window.document.body.removeChild(a);

      toast.success(`Downloaded ${a.download}`);
    } catch (error) {
      console.error("Download error:", error.response ? error.response.data : error.message);
      toast.error("Failed to download document");
    }
  };

  const handleView = async (doc) => {
    // Open a blank window synchronously to avoid popup blocking in some browsers.
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      toast.error('Popup blocked. Please allow popups for this site to view the document.');
      return;
    }

    try {
      // backend serves the file stream at doc.download_url; request as arraybuffer
      const url = `${BACKEND_URL}${doc.download_url}`;
      const response = await axios.get(url, { responseType: 'arraybuffer' });

      // Create blob and navigate the previously opened window to the blob URL
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const urlObj = window.URL.createObjectURL(blob);

      try {
        newWindow.location.href = urlObj;
        newWindow.focus();
      } catch (navErr) {
        // If for some reason navigation fails, close the window and throw
        try { newWindow.close(); } catch (e) {}
        window.URL.revokeObjectURL(urlObj);
        throw navErr;
      }

      // Revoke the object URL after a minute to give the user time to view
      setTimeout(() => window.URL.revokeObjectURL(urlObj), 60000);
    } catch (error) {
      console.error("View error:", error.response ? error.response.data : error.message);
      toast.error("Failed to open document");
      // Close the blank window we opened earlier if still open
      try { newWindow.close(); } catch (e) {}
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      soa: "Statement of Account",
      repayment_schedule: "Repayment Schedule", 
      sanction_letter: "Sanction Letter",
      foreclosure_letter: "Foreclosure Letter"
    };
    return labels[type] || type;
  };

  const getDocumentIcon = (type) => {
    switch(type) {
      case 'soa': return <FileText className="w-5 h-5" />;
      case 'repayment_schedule': return <Timer className="w-5 h-5" />;
      case 'sanction_letter': return <CheckCircle className="w-5 h-5" />;
      case 'foreclosure_letter': return <ExternalLink className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  if (!selectedLoans || !documentTypes) {
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
              onClick={() => navigate("/dashboard")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="back-to-dashboard-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Timer className="w-4 h-4" />
              Session expires in: {formatTime(countdown)}
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
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              ✓
            </div>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              3
            </div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full">
              <div className="w-3/4 h-full bg-blue-600 rounded-full"></div>
            </div>
            <span className="text-sm text-gray-600">Step 3 of 4</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Document Retrieval
          </h1>
          <p className="text-gray-600">
            Secure consent-based document retrieval from your selected banks
          </p>
        </div>

        {/* Consent Stage */}
        {retrievalStage === "consent" && (
          <div className="max-w-2xl mx-auto">
            <Card className="card p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                {isProcessing.consent ? (
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                ) : (
                  <Shield className="w-8 h-8 text-blue-600" />
                )}
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {isProcessing.consent ? "Requesting Bank Consent..." : "Consent Process Initiated"}
              </h2>
              
              <p className="text-gray-600 mb-6">
                We're securely connecting to your selected banks to request document access permissions.
                This process ensures complete data security and compliance.
              </p>

              <div className="space-y-3">
                {selectedLoans.map((loan, index) => (
                  <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      <span className="font-medium">{loan.bank_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {consentTokens[loan.id] ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* OTP Stage */}
        {retrievalStage === "otp" && (
          <div className="space-y-6">
            <Card className="bg-blue-50 border-blue-200 p-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">
                    OTP Verification Required
                  </h3>
                  <p className="text-sm text-blue-800">
                    Enter the OTP received on your registered mobile number for each bank to authorize document access.
                    For demo purposes, use any 4-6 digit number.
                  </p>
                </div>
              </div>
            </Card>

            {selectedLoans.map((loan) => {
              const selectedDocTypes = Object.keys(documentTypes[loan.id] || {})
                .filter(docType => documentTypes[loan.id][docType]);
              
              const isProcessingLoan = isProcessing[loan.id];
              const hasRetrievedDocs = retrievedDocuments.some(doc => doc.account_id === loan.id);
              const hasError = errors[loan.id];

              return (
                <Card key={loan.id} className="card" data-testid={`otp-card-${loan.id}`}>
                  <div className="p-6">
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
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {loan.bank_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Account: {loan.account_number} • {selectedDocTypes.length} documents
                        </p>
                      </div>
                      
                      {hasRetrievedDocs && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Completed
                        </Badge>
                      )}
                    </div>

                    {!hasRetrievedDocs && !hasError && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`otp-${loan.id}`} className="text-sm font-medium text-gray-900">
                            Enter OTP from {loan.bank_name}
                          </Label>
                          <div className="flex gap-3 mt-2">
                            <Input
                              id={`otp-${loan.id}`}
                              type="text"
                              placeholder="Enter 4-6 digit OTP"
                              value={otpValues[loan.id] || ""}
                              onChange={(e) => setOtpValues(prev => ({
                                ...prev,
                                [loan.id]: e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                              }))}
                              className="flex-1"
                              maxLength={6}
                              data-testid={`otp-input-${loan.id}`}
                            />
                            <Button
                              onClick={() => handleOtpSubmit(loan.id)}
                              disabled={!otpValues[loan.id] || isProcessingLoan}
                              className="bg-blue-600 hover:bg-blue-700"
                              data-testid={`submit-otp-${loan.id}`}
                            >
                              {isProcessingLoan ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 mr-2" />
                                  Verify & Retrieve
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-900 mb-2">Documents to retrieve:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedDocTypes.map(docType => (
                              <Badge key={docType} variant="outline" className="text-xs">
                                {getDocumentTypeLabel(docType)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {hasError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span className="text-sm font-medium text-red-900">
                            {hasError}
                          </span>
                        </div>
                      </div>
                    )}

                    {hasRetrievedDocs && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-900">
                            Documents retrieved successfully
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {retrievedDocuments
                            .filter(doc => doc.account_id === loan.id)
                            .map((doc) => (
                              <div key={doc.file_name} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="flex items-center gap-3">
                                  {getDocumentIcon(doc.document_type)}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                                    <p className="text-xs text-gray-500">
                                      {(doc.file_size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownload(doc)}
                                    data-testid={`download-${doc.file_name}`}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleView(doc)} data-testid={`view-${doc.file_name}`}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Completed Stage */}
        {retrievalStage === "completed" && (
          <div className="max-w-4xl mx-auto">
            <Card className="card p-8 text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Document Retrieval Complete!
              </h2>
              
              <p className="text-gray-600 mb-6">
                All requested documents have been securely retrieved and are ready for download.
              </p>

              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => navigate("/dashboard")}
                  variant="outline"
                  data-testid="back-to-dashboard-final"
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="new-retrieval-btn"
                >
                  Start New Retrieval
                </Button>
              </div>
            </Card>

            {/* All Documents Summary */}
            <Card className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Retrieved Documents ({retrievedDocuments.length})
              </h3>
              
              <div className="space-y-4">
                {retrievedDocuments.map((doc) => {
                  const loan = selectedLoans.find(l => l.id === doc.account_id);
                  return (
                    <div key={doc.file_name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        {getDocumentIcon(doc.document_type)}
                        <div>
                          <p className="font-medium text-gray-900">{doc.file_name}</p>
                          <p className="text-sm text-gray-600">
                            {loan?.bank_name} • {getDocumentTypeLabel(doc.document_type)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(doc)}
                          data-testid={`final-download-${doc.file_name}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentRetrieval;