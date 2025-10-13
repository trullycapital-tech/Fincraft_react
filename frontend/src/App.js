import React, { useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LandingPage from "./components/LandingPage";
import PANEntry from "./components/PANEntry";
import ConsentVerification from "./components/ConsentVerification";
import LoanDashboard from "./components/LoanDashboard";
import DocumentRetrieval from "./components/DocumentRetrieval";
import { Toaster } from "./components/ui/sonner";

// New Single-OTP Flow Components
import PANVerification from "./components/PANVerification";
import CIBILConsent from "./components/CIBILConsent";
import LoansList from "./components/LoansList";
import DocumentSelection from "./components/DocumentSelection";
import BatchConsent from "./components/BatchConsent";
import BatchOTPVerify from "./components/BatchOTPVerify";
import DocumentCenter from "./components/DocumentCenter";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing Route */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Legacy Flow Routes (for backward compatibility) */}
            <Route path="/pan-entry" element={<PANEntry />} />
            <Route path="/consent" element={<ConsentVerification />} />
            <Route path="/dashboard" element={<LoanDashboard />} />
            <Route path="/documents" element={<DocumentRetrieval />} />
            
            {/* New Single-OTP Loan Document Aggregator Flow */}
            <Route path="/pan-verification" element={<PANVerification />} />
            <Route path="/cibil-consent" element={<CIBILConsent />} />
            <Route path="/loans-list" element={<LoansList />} />
            <Route path="/document-selection" element={<DocumentSelection />} />
            <Route path="/batch-consent" element={<BatchConsent />} />
            <Route path="/batch-otp-verify" element={<BatchOTPVerify />} />
            <Route path="/document-center" element={<DocumentCenter />} />
            
            {/* Catch-all route - redirect to landing page */}
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </div>
  );
}

export default App;