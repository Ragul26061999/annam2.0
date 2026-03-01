import React from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Clock, 
  Phone, 
  MapPin,
  UserCheck,
  TrendingUp,
  Shield,
  Award,
  Calendar,
  Star,
  MoreVertical,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function StaffPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 mt-1">Manage hospital staff and their schedules</p>
        </div>
        <button className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
          <Plus size={16} className="mr-2" />
          Add Staff
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">156</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">5 new this month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">On Duty</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">127</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">81% present</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <UserCheck className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Night Shift</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">42</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">8 PM - 8 AM</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Clock className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">On Leave</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
              <div className="flex items-center mt-2">
                <AlertCircle className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">Medical & Annual</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Calendar className="text-white" size={20} />
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
              placeholder="Search staff by name, ID, department..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Departments</option>
              <option>ICU</option>
              <option>Emergency</option>
              <option>Pharmacy</option>
              <option>Laboratory</option>
              <option>Administration</option>
            </select>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Shifts</option>
              <option>Morning</option>
              <option>Afternoon</option>
              <option>Night</option>
              <option>Rotating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Staff Card 1 - Nurse */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                MJ
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Nurse Meera Joshi</h3>
                <p className="text-sm text-gray-500">NUR001</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                On Duty
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Shield size={14} className="mr-2" />
              Senior Nurse • ICU
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Award size={14} className="mr-2" />
              BSc Nursing, CPR Certified
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone size={14} className="mr-2" />
              +91-9876543226
            </div>
          </div>

          <div className="bg-pink-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-pink-700">Current Shift</p>
              <span className="text-xs text-pink-600">Night Shift</span>
            </div>
            <p className="text-sm text-pink-900">8:00 PM - 8:00 AM</p>
            <p className="text-xs text-pink-600">Assigned: ICU Ward</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm font-medium text-gray-900">4.9</span>
              <span className="text-xs text-gray-500 ml-1">Performance</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">₹45,000</p>
              <p className="text-xs text-gray-500">Monthly</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Calendar size={14} className="mr-1" />
              Schedule
            </button>
          </div>
        </div>

        {/* Staff Card 2 - Pharmacist */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                SN
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Pharmacist Suresh Nair</h3>
                <p className="text-sm text-gray-500">PHM001</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                On Duty
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Shield size={14} className="mr-2" />
              Senior Pharmacist • Pharmacy
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Award size={14} className="mr-2" />
              B.Pharm, Drug Inspector License
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone size={14} className="mr-2" />
              +91-9876543228
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-green-700">Current Shift</p>
              <span className="text-xs text-green-600">Morning Shift</span>
            </div>
            <p className="text-sm text-green-900">8:00 AM - 4:00 PM</p>
            <p className="text-xs text-green-600">Assigned: Main Pharmacy</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm font-medium text-gray-900">4.7</span>
              <span className="text-xs text-gray-500 ml-1">Performance</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">₹55,000</p>
              <p className="text-xs text-gray-500">Monthly</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Calendar size={14} className="mr-1" />
              Schedule
            </button>
          </div>
        </div>

        {/* Staff Card 3 - Technician */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                AR
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Technician Anita Roy</h3>
                <p className="text-sm text-gray-500">TEC001</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                On Duty
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Shield size={14} className="mr-2" />
              Lab Technician • Laboratory
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Award size={14} className="mr-2" />
              MLT Certificate, Lab Safety Training
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone size={14} className="mr-2" />
              +91-9876543229
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-blue-700">Current Shift</p>
              <span className="text-xs text-blue-600">Morning Shift</span>
            </div>
            <p className="text-sm text-blue-900">7:00 AM - 3:00 PM</p>
            <p className="text-xs text-blue-600">Assigned: Blood Bank</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm font-medium text-gray-900">4.6</span>
              <span className="text-xs text-gray-500 ml-1">Performance</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">₹35,000</p>
              <p className="text-xs text-gray-500">Monthly</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Calendar size={14} className="mr-1" />
              Schedule
            </button>
          </div>
        </div>

        {/* Staff Card 4 - Receptionist */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                PV
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Receptionist Pooja Verma</h3>
                <p className="text-sm text-gray-500">REC001</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                On Duty
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Shield size={14} className="mr-2" />
              Front Desk • OPD
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Award size={14} className="mr-2" />
              Hospital Management Certificate
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone size={14} className="mr-2" />
              +91-9876543230
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-purple-700">Current Shift</p>
              <span className="text-xs text-purple-600">Morning Shift</span>
            </div>
            <p className="text-sm text-purple-900">8:00 AM - 5:00 PM</p>
            <p className="text-xs text-purple-600">Assigned: Front Desk</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm font-medium text-gray-900">4.8</span>
              <span className="text-xs text-gray-500 ml-1">Performance</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">₹25,000</p>
              <p className="text-xs text-gray-500">Monthly</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Calendar size={14} className="mr-1" />
              Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
          Load More Staff
        </button>
      </div>
    </div>
  );
} 