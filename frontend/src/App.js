import React, { useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import PANEntry from "./components/PANEntry";
import ConsentVerification from "./components/ConsentVerification";
import LoanDashboard from "./components/LoanDashboard";
import DocumentRetrieval from "./components/DocumentRetrieval";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pan-entry" element={<PANEntry />} />
          <Route path="/consent" element={<ConsentVerification />} />
          <Route path="/dashboard" element={<LoanDashboard />} />
          <Route path="/documents" element={<DocumentRetrieval />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;