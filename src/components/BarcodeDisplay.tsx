'use client';
import React, { useState, useEffect } from 'react';
import { Printer, Download, Copy, CheckCircle } from 'lucide-react';
import { 
  generateRealisticBarcodeSVG, 
  generatePrintableBarcodeData, 
  generateBarcodeForPatient 
} from '../lib/barcodeUtils';

interface BarcodeDisplayProps {
  uhid: string;
  patientName: string;
  barcodeId?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function BarcodeDisplay({
  uhid,
  patientName,
  barcodeId: initialBarcodeId,
  showLabel = true,
  size = 'medium',
  className = ''
}: BarcodeDisplayProps) {
  const [barcodeId, setBarcodeId] = useState<string>(initialBarcodeId || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!barcodeId && uhid) {
      generateBarcode();
    }
  }, [uhid, barcodeId]);

  const generateBarcode = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const generatedBarcodeId = await generateBarcodeForPatient(uhid);
      setBarcodeId(generatedBarcodeId);
    } catch (err) {
      console.error('Error generating barcode:', err);
      setError('Failed to generate barcode');
    } finally {
      setIsGenerating(false);
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: '200px', height: '60px' };
      case 'large':
        return { width: '400px', height: '100px' };
      default:
        return { width: '300px', height: '80px' };
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(barcodeId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePrint = () => {
    const printData = generatePrintableBarcodeData(uhid, barcodeId, patientName);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Patient Barcode - ${patientName}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body>
            ${printData}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const svg = generateRealisticBarcodeSVG(barcodeId);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode_${uhid}_${barcodeId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-600 text-sm">{error}</p>
        <button 
          onClick={generateBarcode}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
          <span className="ml-2 text-gray-600">Generating barcode...</span>
        </div>
      </div>
    );
  }

  if (!barcodeId) {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <p className="text-gray-600 text-sm">No barcode available</p>
      </div>
    );
  }

  const barcodeStyles = getSizeStyles();

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {showLabel && (
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Patient Barcode</h3>
          <p className="text-sm text-gray-500">UHID: {uhid}</p>
        </div>
      )}
      
      <div className="flex flex-col items-center space-y-4">
        {/* Barcode Display */}
        <div 
          className="border border-gray-300 rounded-lg p-4 bg-white"
          style={barcodeStyles}
        >
          <div
            dangerouslySetInnerHTML={{ 
              __html: generateRealisticBarcodeSVG(barcodeId) 
            }}
            className="w-full h-full"
          />
        </div>
        
        {/* Barcode ID */}
        <div className="flex items-center space-x-2">
          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
            {barcodeId}
          </code>
          <button
            onClick={copyToClipboard}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Copy barcode ID"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Barcode Scanner Component (for future use)
interface BarcodeScannerProps {
  onScan: (barcodeId: string) => void;
  className?: string;
}

export function BarcodeScanner({ onScan, className = '' }: BarcodeScannerProps) {
  const [scanValue, setScanValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    if (scanValue.trim()) {
      setIsScanning(true);
      // Simulate scanning delay
      setTimeout(() => {
        onScan(scanValue.trim());
        setScanValue('');
        setIsScanning(false);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Scan Barcode</h3>
        <p className="text-sm text-gray-500">Enter or scan patient barcode</p>
      </div>
      
      <div className="flex space-x-2">
        <input
          type="text"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter barcode ID or scan..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          disabled={isScanning}
        />
        <button
          onClick={handleScan}
          disabled={isScanning || !scanValue.trim()}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isScanning ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Scanning...</span>
            </div>
          ) : (
            'Scan'
          )}
        </button>
      </div>
    </div>
  );
}

// Barcode Quick View Component
interface BarcodeQuickViewProps {
  barcodeId: string;
  size?: 'small' | 'medium';
  className?: string;
}

export function BarcodeQuickView({ 
  barcodeId, 
  size = 'small', 
  className = '' 
}: BarcodeQuickViewProps) {
  const sizeStyles = size === 'small' ? 
    { width: '120px', height: '40px' } : 
    { width: '200px', height: '60px' };

  return (
    <div className={`inline-block ${className}`}>
      <div 
        className="border border-gray-300 rounded bg-white p-1"
        style={sizeStyles}
      >
        <div
          dangerouslySetInnerHTML={{ 
            __html: generateRealisticBarcodeSVG(barcodeId) 
          }}
          className="w-full h-full"
        />
      </div>
    </div>
  );
} 
