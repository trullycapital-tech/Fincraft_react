import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  Eye,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Filter,
  Search,
  File,
  FileSpreadsheet,
  FileClock,
  Home,
  RefreshCw
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DocumentCenter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { panNumber, holderName, batchId, accessToken, selectedDocumentsForCenter } = location.state || {};

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBank, setSelectedBank] = useState("all");

  useEffect(() => {
    if (!panNumber) {
      navigate("/pan-verification");
      return;
    }
    // If selectedDocumentsForCenter is present, use it directly
    if (selectedDocumentsForCenter && selectedDocumentsForCenter.length > 0) {
      // Add default fields for UI, and set download_url
      setDocuments(selectedDocumentsForCenter.map(doc => {
        const fileName = `${doc.bankName.replace(/ /g, '_')}_${doc.displayName.replace(/ /g, '')}.pdf`;
        return {
          ...doc,
          status: 'ready',
          fileName,
          fileSize: '1.5 MB',
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          downloadCount: 0,
          canDownload: true,
          download_url: `/api/documents/download/demo/${fileName}`
        };
      }));
      setIsLoading(false);
    } else {
      fetchDocuments();
    }
  }, [panNumber]);

  // fetchDocuments is only used for fallback/demo mode now
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      let docs = [];
      const response = await axios.get(`${API}/documents/${panNumber}`);
      if (response.data.success) {
        docs = response.data.documents || [];
      } else {
        docs = getDemoDocuments();
      }
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments(getDemoDocuments());
    } finally {
      setIsLoading(false);
    }
  };

  const getDemoDocuments = () => {
    const demoDate = new Date();
    // Helper to add download_url for each demo doc
    const addDownloadUrl = (fileName, rest) => ({
      ...rest,
      fileName,
      download_url: `/api/documents/download/demo/${fileName}`,
    });
    return [
      // HDFC
      addDownloadUrl('HDFC_Statement_Oct2024.pdf', {
        documentId: 'DOC_HDFC_SOA_001',
        bankName: 'HDFC Bank',
        documentType: 'statement_of_account',
        displayName: 'Statement of Account',
        status: 'ready',
        fileSize: '2.3 MB',
        generatedAt: new Date(demoDate.getTime() - 1000 * 60 * 5),
        expiresAt: new Date(demoDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        canDownload: true
      }),
      addDownloadUrl('HDFC_RepaymentSchedule.pdf', {
        documentId: 'DOC_HDFC_RS_001',
        bankName: 'HDFC Bank',
        documentType: 'repayment_schedule',
        displayName: 'Repayment Schedule',
        status: 'ready',
        fileSize: '1.8 MB',
        generatedAt: new Date(demoDate.getTime() - 1000 * 60 * 5),
        expiresAt: new Date(demoDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        canDownload: true
      }),
      // ICICI
      addDownloadUrl('ICICI_Statement_Oct2024.pdf', {
        documentId: 'DOC_ICICI_SOA_001',
        bankName: 'ICICI Bank',
        documentType: 'statement_of_account',
        displayName: 'Statement of Account',
        status: 'ready',
        fileSize: '1.9 MB',
        generatedAt: new Date(demoDate.getTime() - 1000 * 60 * 5),
        expiresAt: new Date(demoDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        canDownload: true
      }),
      addDownloadUrl('ICICI_RepaymentSchedule.pdf', {
        documentId: 'DOC_ICICI_RS_001',
        bankName: 'ICICI Bank',
        documentType: 'repayment_schedule',
        displayName: 'Repayment Schedule',
        status: 'ready',
        fileSize: '1.5 MB',
        generatedAt: new Date(demoDate.getTime() - 1000 * 60 * 5),
        expiresAt: new Date(demoDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        canDownload: true
      }),
      // AXIS
      addDownloadUrl('AXIS_Statement_Oct2024.pdf', {
        documentId: 'DOC_AXIS_SOA_001',
        bankName: 'AXIS Bank',
        documentType: 'statement_of_account',
        displayName: 'Statement of Account',
        status: 'ready',
        fileSize: '1.7 MB',
        generatedAt: new Date(demoDate.getTime() - 1000 * 60 * 5),
        expiresAt: new Date(demoDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        canDownload: true
      }),
      addDownloadUrl('AXIS_RepaymentSchedule.pdf', {
        documentId: 'DOC_AXIS_RS_001',
        bankName: 'AXIS Bank',
        documentType: 'repayment_schedule',
        displayName: 'Repayment Schedule',
        status: 'ready',
        fileSize: '1.2 MB',
        generatedAt: new Date(demoDate.getTime() - 1000 * 60 * 5),
        expiresAt: new Date(demoDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        canDownload: true
      }),
      // KOTAK
      addDownloadUrl('KOTAK_Statement_Oct2024.pdf', {
        documentId: 'DOC_KOTAK_SOA_001',
        bankName: 'KOTAK Bank',
        documentType: 'statement_of_account',
        displayName: 'Statement of Account',
        status: 'ready',
        fileSize: '1.6 MB',
        generatedAt: new Date(demoDate.getTime() - 1000 * 60 * 5),
        expiresAt: new Date(demoDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        canDownload: true
      }),
      addDownloadUrl('KOTAK_RepaymentSchedule.pdf', {
        documentId: 'DOC_KOTAK_RS_001',
        bankName: 'KOTAK Bank',
        documentType: 'repayment_schedule',
        displayName: 'Repayment Schedule',
        status: 'ready',
        fileSize: '1.1 MB',
        generatedAt: new Date(demoDate.getTime() - 1000 * 60 * 5),
        expiresAt: new Date(demoDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        canDownload: true
      })
    ];
  };

  const getDocumentIcon = (documentType) => {
    switch (documentType) {
      case 'statement_of_account':
        return <FileSpreadsheet className="w-6 h-6" />;
      case 'repayment_schedule':
        return <Calendar className="w-6 h-6" />;
      case 'sanction_letter':
        return <File className="w-6 h-6" />;
      case 'foreclosure_letter':
        return <FileClock className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const getDocumentColor = (documentType) => {
    switch (documentType) {
      case 'statement_of_account':
        return 'bg-blue-100 text-blue-600';
      case 'repayment_schedule':
        return 'bg-green-100 text-green-600';
      case 'sanction_letter':
        return 'bg-purple-100 text-purple-600';
      case 'foreclosure_letter':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async (doc) => {
    try {
      // Always use backend download_url with BACKEND_URL prefix
      let fileUrl = doc.download_url;
      if (fileUrl && fileUrl.startsWith('/')) {
        fileUrl = `${BACKEND_URL}${fileUrl}`;
      }
      // Do not fallback to /filename, always require backend URL
      if (!fileUrl) {
        toast.error("No download URL available for this document.");
        return;
      }
      // Check if file exists before downloading
      const res = await fetch(fileUrl, { method: 'HEAD' });
      if (!res.ok) {
        toast.error("File is not available for download.");
        return;
      }
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const handleView = async (document) => {
    try {
      // In demo mode, just show success message
      toast.success(`Opening ${document.fileName}...`);
    } catch (error) {
      console.error("View error:", error);
      toast.error("Failed to view document");
    }
  };

  const handleShare = async (document) => {
    try {
      // In demo mode, just show success message
      toast.success("Share link generated! Valid for 24 hours.");
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to generate share link");
    }
  };

  const filterDocuments = (docs) => {
    return docs.filter(doc => {
      const matchesTab = selectedTab === 'all' || doc.documentType === selectedTab;
      const matchesSearch = searchTerm === '' || 
        doc.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBank = selectedBank === 'all' || doc.bankName === selectedBank;
      
      return matchesTab && matchesSearch && matchesBank;
    });
  };

  const getUniqueBanks = () => {
    return [...new Set(documents.map(doc => doc.bankName))];
  };

  const getDocumentStats = () => {
    const ready = documents.filter(doc => doc.status === 'ready').length;
    const processing = documents.filter(doc => doc.status === 'processing').length;
    const failed = documents.filter(doc => doc.status === 'failed').length;
    
    return { ready, processing, failed, total: documents.length };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Documents</h3>
          <p className="text-gray-600">Fetching your loan documents...</p>
        </div>
      </div>
    );
  }

  const filteredDocuments = filterDocuments(documents);
  const stats = getDocumentStats();
  const uniqueBanks = getUniqueBanks();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Document Center
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            View, download, and share your loan documents
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.ready}</div>
            <div className="text-sm text-gray-600">Ready</div>
          </Card>
          <Card className="p-4 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.processing}</div>
            <div className="text-sm text-gray-600">Processing</div>
          </Card>
          <Card className="p-4 text-center">
            <Building2 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{uniqueBanks.length}</div>
            <div className="text-sm text-gray-600">Banks</div>
          </Card>
          <Card className="p-4 text-center">
            <FileText className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Bank Filter */}
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">All Banks</option>
                {uniqueBanks.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              onClick={fetchDocuments}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Document Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white border">
            <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
            <TabsTrigger value="statement_of_account">
              SOA ({documents.filter(d => d.documentType === 'statement_of_account').length})
            </TabsTrigger>
            <TabsTrigger value="repayment_schedule">
              Schedule ({documents.filter(d => d.documentType === 'repayment_schedule').length})
            </TabsTrigger>
            <TabsTrigger value="sanction_letter">
              Sanction ({documents.filter(d => d.documentType === 'sanction_letter').length})
            </TabsTrigger>
            <TabsTrigger value="foreclosure_letter">
              Foreclosure ({documents.filter(d => d.documentType === 'foreclosure_letter').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4">
            {filteredDocuments.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Documents Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? "No documents match your search criteria." : "No documents available in this category."}
                </p>
                {searchTerm && (
                  <Button onClick={() => setSearchTerm("")} variant="outline">
                    Clear Search
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredDocuments.map((document) => (
                  <Card key={document.documentId} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-4">
                      {/* Document Icon */}
                      <div className={`p-3 rounded-lg ${getDocumentColor(document.documentType)}`}>
                        {getDocumentIcon(document.documentType)}
                      </div>

                      {/* Document Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {document.displayName}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Building2 className="w-4 h-4" />
                              <span>{document.bankName}</span>
                              <span>•</span>
                              <span>{document.fileSize}</span>
                            </div>
                          </div>
                          {getStatusBadge(document.status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <div className="text-gray-500">File Name</div>
                            <div className="font-medium text-gray-900">{document.fileName}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Generated</div>
                            <div className="font-medium text-gray-900">{formatDate(document.generatedAt)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Downloads</div>
                            <div className="font-medium text-gray-900">{document.downloadCount}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Expires</div>
                            <div className="font-medium text-gray-900">{formatDate(document.expiresAt)}</div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleView(document)}
                            disabled={!document.canDownload}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={() => handleDownload(document)}
                            disabled={!document.canDownload}
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                          {!document.canDownload && (
                            <span className="text-xs text-red-500 ml-2">File not available</span>
                          )}
                          <Button
                            onClick={() => handleShare(document)}
                            disabled={!document.canDownload}
                            variant="outline"
                            size="sm"
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/batch-otp-verify", { 
              state: { panNumber, holderName, batchId, accessToken } 
            })}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Processing
          </Button>

          <Button
            onClick={() => navigate("/", { replace: true })}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentCenter;