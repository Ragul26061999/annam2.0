'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeIndianRupee } from 'lucide-react';

const StockPriceCheckPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/settings/pharmacy')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Pharmacy Settings</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-lg">
              <BadgeIndianRupee className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Price Check</h1>
              <p className="text-gray-600">Upload Excel and review purchase rate / MRP differences</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="text-gray-900 font-semibold">Coming next</div>
          <div className="text-gray-600 mt-1">
            Excel upload + header normalization using the same style as Bulk Upload Excel.
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockPriceCheckPage;
