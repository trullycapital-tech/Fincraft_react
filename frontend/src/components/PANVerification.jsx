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
  Clock,
  Camera,
  UploadCloud,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PANVerification = () => {
  const navigate = useNavigate();
  const [panNumber, setPanNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [mode, setMode] = useState("manual"); // 'manual' | 'upload'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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
        holder_name: holderName,
      });

      if (response.data && response.data.is_valid) {
        setValidationResult(response.data);
        toast.success("PAN validation successful!");

        // Auto-proceed to CIBIL consent immediately after success
        navigate("/cibil-consent", {
          state: {
            panNumber: panNumber.toUpperCase(),
            holderName: response.data.holder_name || holderName,
          },
        });
      } else {
        toast.error(response.data?.message || "PAN validation failed");
      }
    } catch (error) {
      console.error("PAN validation error:", error);
      toast.error(error.response?.data?.message || "PAN validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload an image file (jpg, png, webp)");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File too large. Max 5MB allowed.");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removeSelectedFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Resize image on the client to reduce upload size and improve speed
  const resizeImage = (file, maxWidth = 1200) => {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const scale = Math.min(1, maxWidth / img.width);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve(file);
                  return;
                }
                const newFile = new File([blob], file.name, { type: blob.type || file.type });
                resolve(newFile);
              },
              file.type,
              0.85
            );
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      } catch (err) {
        // On any error, fall back to original file
        resolve(file);
      }
    });
  };

  const uploadPANImage = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select an image of your PAN card to upload");
      return;
    }

    try {
      setIsValidating(true);
      setUploadProgress(0);

      // Resize to cut down upload size (improves latency on slow networks)
      const fileToUpload = await resizeImage(selectedFile);

      const formData = new FormData();
      // backend multer is configured with upload.single('file') so use 'file' as the field name
      formData.append("file", fileToUpload);

      const response = await axios.post(`${API}/upload-pan-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      if (response.data && response.data.is_valid) {
        setValidationResult(response.data);
        toast.success("PAN validation successful!");

        // Navigate immediately after successful upload and validation
        navigate("/cibil-consent", {
          state: {
            panNumber: response.data.pan_number,
            holderName: response.data.holder_name,
          },
        });
      } else {
        toast.error(response.data?.message || "PAN validation failed");
      }
    } catch (error) {
      console.error("PAN image validation error:", error);
      toast.error(error.response?.data?.message || "PAN image validation failed");
    } finally {
      setIsValidating(false);
      setUploadProgress(0);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PAN Verification</h1>
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
            <div className="space-y-6">
              {/* Mode selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={`flex items-start gap-3 p-4 rounded-lg border hover:shadow-sm transition ${
                    mode === "manual"
                      ? "ring-2 ring-blue-300 bg-blue-50"
                      : "bg-white"
                  }`}
                >
                  <div className="p-2 rounded-md bg-white border">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Manual Entry</div>
                    <div className="text-xs text-gray-600">
                      Enter your PAN number and name manually
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  className={`flex items-start gap-3 p-4 rounded-lg border hover:shadow-sm transition ${
                    mode === "upload"
                      ? "ring-2 ring-blue-300 bg-blue-50"
                      : "bg-white"
                  }`}
                >
                  <div className="p-2 rounded-md bg-white border">
                    <Camera className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Upload PAN Card</div>
                    <div className="text-xs text-gray-600">
                      Take a photo or upload PAN card image
                    </div>
                  </div>
                </button>
              </div>

              {mode === "manual" ? (
                <form onSubmit={validatePAN} className="space-y-6">
                  <div>
                    <Label
                      htmlFor="panNumber"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      PAN Number
                    </Label>
                    <Input
                      id="panNumber"
                      type="text"
                      value={panNumber}
                      onChange={(e) =>
                        setPanNumber(e.target.value.toUpperCase())
                      }
                      placeholder="ABCDE1234F"
                      className="h-12 text-lg tracking-wider font-mono"
                      maxLength={10}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your 10-digit PAN number
                    </p>
                  </div>

                  <div>
                    <Label
                      htmlFor="holderName"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Name as per PAN
                    </Label>
                    <Input
                      id="holderName"
                      type="text"
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      placeholder="Full name as on PAN card"
                      className="h-12"
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
                <form onSubmit={uploadPANImage} className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Upload PAN Image
                    </Label>
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer inline-flex items-center gap-3 px-4 py-2 rounded-md border bg-white hover:bg-gray-50">
                        <UploadCloud className="w-5 h-5 text-blue-600" />
                        <span className="text-sm">Choose image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>

                      {selectedFile && (
                        <div className="flex items-center gap-3">
                          <img
                            src={previewUrl}
                            alt="preview"
                            className="w-28 h-20 object-contain rounded border"
                          />
                          <div>
                            <div className="text-sm font-medium">
                              {selectedFile.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                            <button
                              type="button"
                              onClick={removeSelectedFile}
                              className="text-xs text-red-600 mt-1"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Take a clear photo of the PAN card (front). Max 5MB.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isValidating || !selectedFile}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verifying PAN...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mr-2" />
                        Verify PAN
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
              <h2 className="text-xl font-semibold text-gray-800">
                PAN Verified Successfully!
              </h2>
              <p className="text-sm text-gray-600">
                Redirecting to CIBIL consent...
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PANVerification;
