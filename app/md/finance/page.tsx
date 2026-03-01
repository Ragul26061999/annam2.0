import React from 'react';
import { 
  IndianRupee, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Receipt,
  PieChart,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Download,
  Users,
  Building
} from 'lucide-react';

export default function FinancePage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-500 mt-1">Manage billing, revenue, and financial reports</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            <Download size={16} className="mr-2" />
            Export Report
          </button>
          <button className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            <Plus size={16} className="mr-2" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹12,45,600</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+15% from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <IndianRupee className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹2,34,800</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">42 pending invoices</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Receipt className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹4,56,200</p>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-sm font-medium text-red-600">-8% from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Net Profit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹7,89,400</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+22% from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <PieChart className="text-white" size={20} />
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
              placeholder="Search by invoice number, patient name, or amount..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Types</option>
              <option>Consultation</option>
              <option>Surgery</option>
              <option>Medication</option>
              <option>Lab Tests</option>
              <option>Room Charges</option>
            </select>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Status</option>
              <option>Paid</option>
              <option>Pending</option>
              <option>Overdue</option>
              <option>Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Financial Overview and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          
          {/* Transaction Card 1 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  ₹15K
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Sarah Johnson</h3>
                  <p className="text-sm text-gray-500">INV-2024-001 • Cardiac Surgery</p>
                  <div className="flex items-center mt-1 space-x-4">
                    <div className="flex items-center text-xs text-gray-600">
                      <Calendar size={12} className="mr-1" />
                      Dec 15, 2024
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <CreditCard size={12} className="mr-1" />
                      Credit Card
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">₹15,000</p>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    Paid
                  </span>
                </div>
                <button className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                  <Eye size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Transaction Card 2 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  ₹8K
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Michael Rodriguez</h3>
                  <p className="text-sm text-gray-500">INV-2024-002 • ICU Stay + Medication</p>
                  <div className="flex items-center mt-1 space-x-4">
                    <div className="flex items-center text-xs text-gray-600">
                      <Calendar size={12} className="mr-1" />
                      Dec 14, 2024
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <Clock size={12} className="mr-1" />
                      Due in 2 days
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-600">₹8,500</p>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                    Pending
                  </span>
                </div>
                <button className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                  <Eye size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Transaction Card 3 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  ₹1.2K
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Emma Watson</h3>
                  <p className="text-sm text-gray-500">INV-2024-003 • Pediatric Consultation</p>
                  <div className="flex items-center mt-1 space-x-4">
                    <div className="flex items-center text-xs text-gray-600">
                      <Calendar size={12} className="mr-1" />
                      Dec 13, 2024
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <CreditCard size={12} className="mr-1" />
                      Insurance
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">₹1,200</p>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    Paid
                  </span>
                </div>
                <button className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                  <Eye size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Financial Summary</h2>
          
          {/* Revenue Breakdown */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Consultations</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₹4,56,000</p>
                  <p className="text-xs text-gray-500">37%</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Surgery</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₹3,25,000</p>
                  <p className="text-xs text-gray-500">26%</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Room Charges</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₹2,84,000</p>
                  <p className="text-xs text-gray-500">23%</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Lab Tests</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₹1,80,600</p>
                  <p className="text-xs text-gray-500">14%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 text-blue-500 mr-3" />
                  <span className="text-sm text-gray-700">Credit Card</span>
                </div>
                <span className="text-sm font-medium text-gray-900">45%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm text-gray-700">Insurance</span>
                </div>
                <span className="text-sm font-medium text-gray-900">35%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <IndianRupee className="h-4 w-4 text-orange-500 mr-3" />
                  <span className="text-sm text-gray-700">Cash</span>
                </div>
                <span className="text-sm font-medium text-gray-900">20%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Generate Monthly Report
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Send Payment Reminders
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Export Tax Records
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                View Expense Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
          Load More Transactions
        </button>
      </div>
    </div>
  );
}