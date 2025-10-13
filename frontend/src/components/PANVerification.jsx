import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileText,
  Building2,
  Clock
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PANVerification = () => {
  const navigate = useNavigate();
  const [panNumber, setPanNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const validatePAN = async (e) => {
    e.preventDefault();
    
    if (!panNumber || !holderName) {
      toast.error("Please enter both PAN number and holder name");
      return;
    }

    if (panNumber.length !== 10) {
      toast.error("PAN number must be 10 characters");
      return;
    }

    try {
      setIsValidating(true);
      const response = await axios.post(`${API}/validate-pan`, {
        pan_number: panNumber.toUpperCase(),
        holder_name: holderName
      });
      
      if (response.data.is_valid) {
        setValidationResult(response.data);
        toast.success("PAN validation successful!");
        
        // Auto-proceed to CIBIL consent after PAN validation
        setTimeout(() => {
          navigate("/cibil-consent", { 
            state: { 
              panNumber: panNumber.toUpperCase(), 
              holderName: response.data.holder_name || holderName
            }
          });
        }, 1500);
      } else {
        toast.error(response.data.message || "PAN validation failed");
      }
    } catch (error) {
      console.error("PAN validation error:", error);
      toast.error(error.response?.data?.message || "PAN validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PAN Verification
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Enter your PAN details to verify your identity and access loan documents
          </p>
        </div>

        {/* Benefits Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border">
            <Shield className="w-6 h-6 text-green-500" />
            <div>
              <div className="font-semibold text-sm text-gray-900">Secure</div>
              <div className="text-xs text-gray-600">Bank-grade security</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border">
            <Clock className="w-6 h-6 text-blue-500" />
            <div>
              <div className="font-semibold text-sm text-gray-900">Fast</div>
              <div className="text-xs text-gray-600">2-minute verification</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border">
            <Building2 className="w-6 h-6 text-purple-500" />
            <div>
              <div className="font-semibold text-sm text-gray-900">Multiple Banks</div>
              <div className="text-xs text-gray-600">All major banks</div>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <Card className="p-8 shadow-lg border-0 bg-white">
          {!validationResult ? (
            <form onSubmit={validatePAN} className="space-y-6">
              <div>
                <Label htmlFor="panNumber" className="text-sm font-medium text-gray-700 mb-2 block">
                  PAN Number
                </Label>
                <Input
                  id="panNumber"
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className="h-12 text-lg tracking-wider font-mono"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your 10-digit PAN number
                </p>
              </div>

              <div>
                <Label htmlFor="holderName" className="text-sm font-medium text-gray-700 mb-2 block">
                  Name as per PAN
                </Label>
                <Input
                  id="holderName"
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Full name as on PAN card"
                  className="h-12"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your full name exactly as mentioned in PAN card
                </p>
              </div>

              <Button 
                type="submit"
                disabled={isValidating || !panNumber || !holderName}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying PAN...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Verify PAN & Continue
                  </>
                )}
              </Button>
            </form>
          ) : (
            /* Success State */
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  PAN Verified Successfully
                </h3>
                <p className="text-gray-600">
                  Your identity has been verified. Redirecting to next step...
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">PAN Number:</span>
                  <span className="font-mono font-semibold">{validationResult.pan_number}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-600">Holder Name:</span>
                  <span className="font-semibold">{validationResult.holder_name}</span>
                </div>
              </div>

              <div className="flex items-center justify-center text-sm text-blue-600">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Proceeding to CIBIL consent...
              </div>
            </div>
          )}
        </Card>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-blue-900 mb-1">Your Privacy & Security</div>
              <div className="text-blue-800">
                Your PAN details are encrypted and processed securely. We comply with all data protection regulations and never store sensitive information permanently.
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PANVerification;