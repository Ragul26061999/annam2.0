import React from 'react';
import { 
  Pill, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  AlertTriangle, 
  Package, 
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function PharmacyPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
          <p className="text-gray-500 mt-1">Manage medicine inventory and prescriptions</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            <Package size={16} className="mr-2" />
            Add Stock
          </button>
          <button className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            <Plus size={16} className="mr-2" />
            New Medicine
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Medicines</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">1,247</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+23 new this week</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <Pill className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">18</p>
              <div className="flex items-center mt-2">
                <AlertTriangle className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">Requires reorder</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sales Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹45,200</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+12% from yesterday</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <DollarSign className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Prescriptions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">124</p>
              <div className="flex items-center mt-2">
                <ShoppingCart className="h-3 w-3 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">32 pending</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <ShoppingCart className="text-white" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search medicines by name, category, or manufacturer..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Categories</option>
              <option>Antibiotics</option>
              <option>Pain Relief</option>
              <option>Vitamins</option>
              <option>Cardiac</option>
              <option>Diabetes</option>
            </select>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Stock</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Medicine Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Medicine Card 1 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                P
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Paracetamol</h3>
                <p className="text-sm text-gray-500">MED001 • Pain Relief</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                In Stock
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Stock Quantity:</span>
              <span className="font-medium text-gray-900">1,250 tablets</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Unit Price:</span>
              <span className="font-medium text-gray-900">₹2.50</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Manufacturer:</span>
              <span className="font-medium text-gray-900">Cipla Ltd</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-blue-700">Expiry Date</p>
              <span className="text-xs text-blue-600">12 months left</span>
            </div>
            <p className="text-sm text-blue-900">Dec 2025</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Package size={14} className="mr-1" />
              Restock
            </button>
          </div>
        </div>

        {/* Medicine Card 2 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Amoxicillin</h3>
                <p className="text-sm text-gray-500">MED002 • Antibiotic</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                Low Stock
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Stock Quantity:</span>
              <span className="font-medium text-orange-600">45 capsules</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Unit Price:</span>
              <span className="font-medium text-gray-900">₹8.75</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Manufacturer:</span>
              <span className="font-medium text-gray-900">Sun Pharma</span>
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl p-3 mb-4 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-orange-700">Expiry Date</p>
              <span className="text-xs text-orange-600">8 months left</span>
            </div>
            <p className="text-sm text-orange-900">Aug 2025</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-orange-100 text-orange-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-200 transition-colors">
              <Package size={14} className="mr-1" />
              Urgent
            </button>
          </div>
        </div>

        {/* Medicine Card 3 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                V
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Vitamin D3</h3>
                <p className="text-sm text-gray-500">MED003 • Vitamin</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                In Stock
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Stock Quantity:</span>
              <span className="font-medium text-gray-900">800 tablets</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Unit Price:</span>
              <span className="font-medium text-gray-900">₹12.00</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Manufacturer:</span>
              <span className="font-medium text-gray-900">Abbott</span>
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-purple-700">Expiry Date</p>
              <span className="text-xs text-purple-600">18 months left</span>
            </div>
            <p className="text-sm text-purple-900">Jun 2026</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Package size={14} className="mr-1" />
              Restock
            </button>
          </div>
        </div>
      </div>

      {/* Recent Prescriptions */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Prescriptions</h2>
          <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">View All</button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                SJ
              </div>
              <div>
                <p className="font-medium text-gray-900">Sarah Johnson</p>
                <p className="text-sm text-gray-500">3 medicines • Dr. Priya Sharma</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Pending
              </span>
              <button className="p-1 text-gray-500 hover:text-orange-600 rounded-lg transition-colors">
                <Eye size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                MR
              </div>
              <div>
                <p className="font-medium text-gray-900">Michael Rodriguez</p>
                <p className="text-sm text-gray-500">2 medicines • Dr. Amit Singh</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Dispensed
              </span>
              <button className="p-1 text-gray-500 hover:text-orange-600 rounded-lg transition-colors">
                <Eye size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
          Load More Medicines
        </button>
      </div>
    </div>
  );
} 