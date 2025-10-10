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
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConsentVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { panNumber, holderName } = location.state || {};

  const [step, setStep] = useState("phone"); // phone, otp, verified
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [consentId, setConsentId] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [accessToken, setAccessToken] = useState("");
  const [isChecked, setIsChecked] = useState(false);

  // Dummy user info for display
  const user = {
    pan: panNumber || "BKBP****3D",
    name: holderName || "Vivek Maurya",
    phone: "+91 76663 87134",
  };

  useEffect(() => {
    if (!panNumber) {
      navigate("/pan-entry");
      return;
    }
  }, [panNumber, navigate]);

  useEffect(() => {
    if (step === "otp" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, step]);

  const handleOtpSubmit = async (e) => {
    e.preventDefault();

    if (otpCode.length < 4) {
      toast.error("Please enter a valid OTP");
      return;
    }

    try {
      setIsLoading(true);
      
      // Simulate API call for OTP verification
      const response = await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (otpCode === "123456") {
            resolve({
              data: {
                success: true,
                consent_verified: true,
                access_token: "demo_token_" + Date.now(),
                message: "OTP verified successfully"
              }
            });
          } else {
            reject({
              response: {
                data: {
                  detail: "Invalid OTP. Please use 123456 for demo."
                }
              }
            });
          }
        }, 1500);
      });

      if (response.data.success && response.data.consent_verified) {
        setAccessToken(response.data.access_token);
        setStep("verified");
        toast.success(response.data.message);

        setTimeout(() => {
          navigate("/dashboard", {
            state: {
              panNumber,
              holderName,
              consentVerified: true,
              accessToken: response.data.access_token,
            },
          });
        }, 2000);
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error(error.response?.data?.detail || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsent = async () => {
    if (!isChecked) {
      toast.error("Please agree to provide consent before proceeding");
      return;
    }
    
    try {
      setIsLoading(true);
      // Simulate API call for consent request
      const response = await new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            consent_id: "consent_" + Date.now(),
            phone_masked: "+91 76663 ****34",
            expires_in: 300,
            message: "OTP sent successfully"
          });
        }, 1500);
      });

      if (response.success) {
        setConsentId(response.consent_id);
        setMaskedPhone(response.phone_masked);
        setStep("otp");
        setCountdown(response.expires_in);
        toast.success(response.message);
      }
    } catch (error) {
      console.error("Consent request error:", error);
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.slice(0, 10);
  };

  if (!panNumber) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
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

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">TCF</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
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
              CIBIL Access Consent
            </h1>
            <p className="text-gray-600">
              We need your consent to access your CIBIL report securely
            </p>
          </div>

          <Card className="card p-8">
            {/* Phone Number Step */}
            {step === "phone" && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-medium text-blue-900 mb-2">
                        Why do we need your consent?
                      </h3>
                      <p className="text-sm text-blue-800">
                        As per RBI guidelines, we need your explicit consent to
                        access your CIBIL report. This ensures your financial data
                        privacy and security.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">PAN Verified</span>
                  </div>
                  <p className="text-gray-700 text-sm mt-2">
                    <strong>PAN:</strong> {user.pan} <br />
                    <strong>Name:</strong> {user.name} <br />
                    <strong>Phone:</strong> {user.phone}
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    What we will access:
                  </h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>✅ Active Loan Accounts – Current loans from all banks and NBFCs</li>
                    <li>✅ Outstanding Amounts – Current outstanding balances and EMI details</li>
                    <li>✅ Lender Information – Bank/NBFC names and account numbers</li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                    <Lock className="w-4 h-4 text-green-600" /> Security Guarantee
                  </h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 256-bit SSL encryption for all data transmission</li>
                    <li>• Data used only for loan aggregation services</li>
                    <li>• No sharing with third parties without consent</li>
                    <li>• Secure deletion after service completion</li>
                  </ul>
                </div>

                <div className="text-sm text-gray-700 mb-4">
                  <label className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => setIsChecked(!isChecked)}
                      className="mt-1 accent-green-600"
                    />
                    <span>
                      I hereby provide my consent to{" "}
                      <strong>TCF (Trully Capital Fintech Pvt Ltd)</strong> to
                      access my CIBIL credit report for the purpose of aggregating
                      my loan information. I understand that this access is secure
                      and my data will be protected as per the privacy policy.
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleConsent}
                  disabled={!isChecked || isLoading}
                  className={`w-full py-2.5 rounded-lg font-medium transition ${
                    isChecked
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                      Processing...
                    </>
                  ) : (
                    "Provide Consent & Continue"
                  )}
                </button>
              </div>
            )}

            {/* OTP Step */}
            {step === "otp" && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-medium text-green-900 mb-2">
                        OTP Sent Successfully
                      </h3>
                      <p className="text-sm text-green-800">
                        We've sent a 6-digit OTP to {maskedPhone}. Please enter it
                        below to verify your consent.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div>
                    <Label
                      htmlFor="otp"
                      className="text-base font-medium text-gray-900 mb-3 block"
                    >
                      Enter OTP
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otpCode}
                        onChange={(e) =>
                          setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        className="input-field pl-12 text-lg h-14 text-center tracking-widest"
                        maxLength={6}
                        data-testid="otp-input-field"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-500">
                        Didn't receive OTP?{" "}
                        <button type="button" className="text-blue-600 hover:underline">
                          Resend
                        </button>
                      </p>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {formatTime(countdown)}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={otpCode.length < 4 || isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg h-14"
                    data-testid="verify-otp-btn"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verifying OTP...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Verify OTP & Proceed
                      </>
                    )}
                  </Button>
                </form>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-medium text-yellow-900 mb-1">Demo Mode</h4>
                      <p className="text-sm text-yellow-800">
                        For testing, use OTP: <strong>123456</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verified Step */}
            {step === "verified" && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Consent Verified Successfully!
                  </h2>
                  <p className="text-gray-600">
                    You have successfully given consent to access your CIBIL report.
                    We'll now fetch your loan details securely.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to loan dashboard...
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConsentVerification;
