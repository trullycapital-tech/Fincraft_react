import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Shield, FileText, Zap, Lock, CheckCircle, ArrowRight } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FileText className="w-8 h-8 text-blue-600" />,
      title: "All Loan Documents",
      description: "Access statements, schedules, sanction letters, and foreclosure documents in one place"
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-600" />,
      title: "Instant Retrieval",
      description: "Get your documents within minutes through secure bank API connections"
    },
    {
      icon: <Shield className="w-8 h-8 text-blue-600" />,
      title: "Bank-Grade Security",
      description: "End-to-end encryption with consent-based access for complete data protection"
    },
    {
      icon: <Lock className="w-8 h-8 text-blue-600" />,
      title: "CIBIL Integration",
      description: "Fetch all your loan accounts automatically through official CIBIL API"
    }
  ];

  const benefits = [
    "No branch visits required",
    "Eliminate WhatsApp dependency",
    "One-time OTP consent process",
    "Secure document storage",
    "Multi-bank support",
    "Instant document access"
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TCF</h1>
                <p className="text-xs text-gray-500">Trully Capital Fintech</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/pan-verification")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50"></div>
        <div className="container mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 fade-in">
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Your Loan Documents,
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Instantly</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Access all your loan documents from multiple banks in one secure platform. 
                  No branch visits, no paperwork, just instant digital access.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/pan-verification")}
                  className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4"
                  data-testid="hero-get-started-btn"
                >
                  Get Started Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/learn-more")}
                  className="text-lg px-8 py-4 border-gray-300"
                >
                  Learn More
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="security-badge">
                  <Shield className="w-4 h-4" />
                  Bank-Grade Security
                </div>
                <div className="security-badge">
                  <CheckCircle className="w-4 h-4" />
                  CIBIL Authorized
                </div>
              </div>
            </div>

            <div className="relative">                  
              <div className="glass-card p-8">
                <img 
                  src="/banking-interface.png"
                  alt="Digital banking interface"
                  className="w-full h-80 object-cover rounded-lg"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 glass-card p-4 max-w-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Documents Retrieved</p>
                    <p className="text-xs text-gray-500">Secure & Instant</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50" data-testid="features-section">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Loan Document Solution
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Access all your loan documents from any bank or NBFC through our secure, 
              consent-based document retrieval platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="card p-6 text-center slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple 4-Step Process
            </h2>
            <p className="text-xl text-gray-600">
              Get all your loan documents in minutes, not days
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Enter PAN", desc: "Provide your PAN number or upload PAN card photo" },
              { step: "2", title: "View Loans", desc: "See all your active loans through CIBIL integration" },
              { step: "3", title: "Select Documents", desc: "Choose which documents you need from each bank" },
              { step: "4", title: "Get Documents", desc: "Receive all documents securely in the app" }
            ].map((item, index) => (
              <div key={index} className="text-center slide-up" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Why Choose TCF Loan Aggregator?
              </h2>
              <p className="text-blue-100 text-lg mb-8">
                Experience the fastest, most secure way to access your loan documents 
                from all major banks and NBFCs in India.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-blue-50">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate("/pan-verification")}
                className="mt-8 bg-white text-blue-600 hover:bg-blue-50"
                data-testid="cta-get-started-btn"
              >
                Get Started Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            <div className="relative">
              <img
                src="/assets/digital-marketing.png"
                alt="Digital marketing"
                className="w-full rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Access Your Loan Documents?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of customers who trust TCF for secure, instant loan document retrieval.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/pan-verification")}
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4"
            data-testid="final-cta-btn"
          >
            Start Document Retrieval
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">TCF</span>
              </div>
              <p className="text-gray-300 text-sm">
                Trully Capital Fintech Pvt Ltd - Your trusted partner for secure loan document management.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>Document Retrieval</li>
                <li>CIBIL Integration</li>
                <li>Bank API Connections</li>
                <li>Secure Storage</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Security</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>End-to-end Encryption</li>
                <li>Consent-based Access</li>
                <li>Bank-grade Security</li>
                <li>Compliance Ready</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2024 Trully Capital Fintech Pvt Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;