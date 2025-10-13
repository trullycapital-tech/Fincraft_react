import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  Shield,
  Phone,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  FileText,
  CreditCard,
  Building2,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CIBILConsent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { panNumber, holderName } = location.state || {};

  const [step, setStep] = useState("consent"); // consent, phone, otp, verified
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [consentId, setConsentId] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [accessToken, setAccessToken] = useState("");
  const [isConsentChecked, setIsConsentChecked] = useState(false);

  useEffect(() => {
    if (!panNumber) {
      navigate("/pan-verification");
      return;
    }
  }, [panNumber, navigate]);

  useEffect(() => {
    let timer;
    if (step === "otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConsentSubmit = (e) => {
    e.preventDefault();
    if (!isConsentChecked) {
      toast.error("Please provide your consent to proceed");
      return;
    }
    setStep("phone");
  };

  const sendOTP = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber || phoneNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/request-cibil-consent`, {
        pan_number: panNumber,
        phone_number: phoneNumber
      });
      
      if (response.data.success) {
        setConsentId(response.data.consent_id);
        setMaskedPhone(response.data.phone_masked);
        setStep("otp");
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
      const response = await axios.post(`${API}/verify-cibil-consent`, {
        consent_id: consentId,
        otp_code: otpCode,
        pan_number: panNumber
      });
      
      if (response.data.success) {
        setAccessToken(response.data.access_token);
        setStep("verified");
        toast.success("CIBIL consent verified successfully!");
        
        // Auto-proceed to loans list after verification
        setTimeout(() => {
          navigate("/loans-list", { 
            state: { 
              panNumber,
              holderName,
              accessToken: response.data.access_token
            }
          });
        }, 2000);
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

  const resendOTP = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/request-cibil-consent`, {
        pan_number: panNumber,
        phone_number: phoneNumber
      });
      
      if (response.data.success) {
        setConsentId(response.data.consent_id);
        setCountdown(300);
        toast.success("OTP resent successfully!");
      }
    } catch (error) {
      toast.error("Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-indigo-100 p-3 rounded-full">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            CIBIL Report Access
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Grant permission to fetch your credit report and identify your loan accounts
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === "consent" || step === "phone" || step === "otp" || step === "verified" 
                ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${
              step === "phone" || step === "otp" || step === "verified" 
                ? "bg-indigo-600" : "bg-gray-200"
            }`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === "phone" || step === "otp" || step === "verified" 
                ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${
              step === "otp" || step === "verified" 
                ? "bg-indigo-600" : "bg-gray-200"
            }`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === "otp" || step === "verified" 
                ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        {step === "consent" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <Building2 className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Multiple Banks</h3>
              <p className="text-sm text-gray-600">Access loans from HDFC, ICICI, SBI, and 25+ other banks</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <Zap className="w-8 h-8 text-green-500 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Single OTP</h3>
              <p className="text-sm text-gray-600">One OTP for all your loan documents across banks</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <FileText className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">All Documents</h3>
              <p className="text-sm text-gray-600">SOA, schedules, sanction letters, and more</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <Card className="p-8 shadow-lg border-0 bg-white">
          {step === "consent" && (
            <form onSubmit={handleConsentSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  CIBIL Report Consent
                </h3>
                <p className="text-gray-600">
                  We need your permission to access your CIBIL report to identify your loan accounts
                </p>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">PAN Number:</span>
                  <span className="font-mono font-semibold">{panNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-semibold">{holderName}</span>
                </div>
              </div>

              {/* Consent Text */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">What we'll access:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Credit score and report summary</li>
                  <li>• Active loan account details</li>
                  <li>• Bank names and account information</li>
                  <li>• Outstanding amounts and EMI details</li>
                </ul>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={isConsentChecked}
                  onChange={(e) => setIsConsentChecked(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="consent" className="text-sm text-gray-700 leading-relaxed">
                  I consent to FinCraft accessing my CIBIL report to identify my loan accounts and facilitate document retrieval. I understand this data will be used solely for the purpose of providing loan document services.
                </label>
              </div>

              <Button 
                type="submit"
                disabled={!isConsentChecked}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Shield className="w-5 h-5 mr-2" />
                Provide Consent & Continue
              </Button>
            </form>
          )}

          {step === "phone" && (
            <form onSubmit={sendOTP} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Mobile Verification
                </h3>
                <p className="text-gray-600">
                  Enter your mobile number to receive OTP for CIBIL access
                </p>
              </div>

              <div>
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 mb-2 block">
                  Mobile Number
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">+91</span>
                  </div>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="9876543210"
                    className="h-12 pl-12 text-lg"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  OTP will be sent to this number for verification
                </p>
              </div>

              <Button 
                type="submit"
                disabled={isLoading || phoneNumber.length !== 10}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5 mr-2" />
                    Send OTP
                  </>
                )}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOTP} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Enter OTP
                </h3>
                <p className="text-gray-600">
                  Enter the 6-digit OTP sent to {maskedPhone}
                </p>
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
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    Resend OTP
                  </Button>
                )}
              </div>

              <Button 
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying OTP...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Verify & Access CIBIL
                  </>
                )}
              </Button>
            </form>
          )}

          {step === "verified" && (
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  CIBIL Access Granted
                </h3>
                <p className="text-gray-600">
                  Successfully verified! Fetching your loan accounts...
                </p>
              </div>

              <div className="flex items-center justify-center text-sm text-indigo-600">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading your loans...
              </div>
            </div>
          )}
        </Card>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === "consent") {
                navigate("/pan-verification");
              } else if (step === "phone") {
                setStep("consent");
              } else if (step === "otp") {
                setStep("phone");
              }
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CIBILConsent;