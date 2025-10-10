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
  Upload, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileText
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PANEntry = () => {
  const navigate = useNavigate();
  const [panNumber, setPanNumber] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("manual"); // manual or upload

  const validatePAN = async (pan) => {
    try {
      setIsValidating(true);
      const response = await axios.post(`${API}/validate-pan`, {
        pan_number: pan
      });
      
      if (response.data.is_valid) {
        setValidationResult(response.data);
        toast.success("PAN validation successful!");
        
        // Auto-proceed to consent verification after PAN validation
        setTimeout(() => {
          navigate("/consent", { 
            state: { 
              panNumber: pan, 
              holderName: response.data.holder_name 
            }
          });
        }, 1500);
      } else {
        toast.error(response.data.message);
        setValidationResult(null);
      }
    } catch (error) {
      console.error("PAN validation error:", error);
      toast.error("Failed to validate PAN. Please try again.");
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (panNumber.length === 10) {
      validatePAN(panNumber.toUpperCase());
    } else {
      toast.error("Please enter a valid 10-character PAN number");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    try {
      setIsUploading(true);
      setUploadedFile(file);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/upload-pan-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const extractedPAN = response.data.extracted_pan;
        setPanNumber(extractedPAN);
        toast.success(`PAN extracted: ${extractedPAN}`);
        
        // Auto-validate the extracted PAN
        await validatePAN(extractedPAN);
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Failed to process image. Please try manual entry.");
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const formatPAN = (value) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return cleaned.slice(0, 10);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="back-to-home-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
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
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full">
                <div className="w-1/4 h-full bg-blue-600 rounded-full"></div>
              </div>
              <span className="text-sm text-gray-600">Step 1 of 4</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Enter Your PAN Details
            </h1>
            <p className="text-gray-600">
              We'll use your PAN to securely fetch all your loan accounts through CIBIL
            </p>
          </div>

          <Card className="card p-8">
            {/* Tab Selection */}
            <div className="flex gap-1 mb-8 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("manual")}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === "manual"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                data-testid="manual-entry-tab"
              >
                <CreditCard className="w-4 h-4 mr-2 inline" />
                Manual Entry
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === "upload"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                data-testid="image-upload-tab"
              >
                <Upload className="w-4 h-4 mr-2 inline" />
                Upload PAN Image
              </button>
            </div>

            {/* Manual Entry Tab */}
            {activeTab === "manual" && (
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="pan" className="text-base font-medium text-gray-900 mb-3 block">
                    PAN Number
                  </Label>
                  <Input
                    id="pan"
                    type="text"
                    placeholder="Enter 10-digit PAN (e.g., ABCDE1234F)"
                    value={panNumber}
                    onChange={(e) => setPanNumber(formatPAN(e.target.value))}
                    className="input-field text-lg h-14"
                    maxLength={10}
                    data-testid="pan-input-field"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Format: 5 letters + 4 numbers + 1 letter (e.g., ABCDE1234F)
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={panNumber.length !== 10 || isValidating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-lg h-14"
                  data-testid="validate-pan-btn"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Validating PAN...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Validate PAN & Continue
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Upload Tab */}
            {activeTab === "upload" && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium text-gray-900 mb-3 block">
                    Upload PAN Card Image
                  </Label>
                  
                  <div 
                    className="upload-area"
                    onClick={() => document.getElementById('pan-file-input').click()}
                  >
                    <input
                      id="pan-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      data-testid="pan-file-input"
                    />
                    
                    {isUploading ? (
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
                        <p className="text-lg font-medium text-gray-900">Processing Image...</p>
                        <p className="text-sm text-gray-500">Extracting PAN details from your image</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="text-center">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
                        <p className="text-lg font-medium text-gray-900">Image Uploaded</p>
                        <p className="text-sm text-gray-500">{uploadedFile.name}</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-900">Click to upload PAN card image</p>
                        <p className="text-sm text-gray-500">JPG, PNG files up to 5MB</p>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-3">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Ensure PAN card image is clear and well-lit for best results
                  </p>
                </div>

                {panNumber && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">PAN Extracted Successfully</p>
                        <p className="text-sm text-blue-700">PAN Number: {panNumber}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Validation Result */}
            {validationResult && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6 slide-up">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">
                      PAN Validation Successful!
                    </h3>
                    <div className="space-y-1 text-sm text-green-800">
                      <p><strong>PAN:</strong> {validationResult.pan_number}</p>
                      <p><strong>Name:</strong> {validationResult.holder_name}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-green-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting to loan dashboard...
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Note */}
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    Your Privacy is Protected
                  </h4>
                  <p className="text-sm text-gray-600">
                    All data is encrypted end-to-end. We only access your loan information 
                    with your explicit consent through official banking APIs.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Sample PAN Numbers for Testing */}
          <Card className="mt-6 p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-2">Demo Mode</h4>
                <p className="text-sm text-yellow-800 mb-3">
                  Try these sample PAN numbers for testing:
                </p>
                <div className="grid sm:grid-cols-3 gap-2 text-xs">
                  <code 
                    className="bg-yellow-100 px-2 py-1 rounded cursor-pointer hover:bg-yellow-200"
                    onClick={() => setPanNumber("ABCDE1234F")}
                    data-testid="sample-pan-1"
                  >
                    ABCDE1234F
                  </code>
                  <code 
                    className="bg-yellow-100 px-2 py-1 rounded cursor-pointer hover:bg-yellow-200"
                    onClick={() => setPanNumber("PQRST5678G")}
                    data-testid="sample-pan-2"
                  >
                    PQRST5678G
                  </code>
                  <code 
                    className="bg-yellow-100 px-2 py-1 rounded cursor-pointer hover:bg-yellow-200"
                    onClick={() => setPanNumber("XYZAB9012C")}
                    data-testid="sample-pan-3"
                  >
                    XYZAB9012C
                  </code>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PANEntry;