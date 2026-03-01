import React from 'react';
import { 
  Bed, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  UserPlus, 
  UserMinus, 
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Users,
  Building,
  MoreVertical,
  Calendar,
  Activity,
  Heart
} from 'lucide-react';

export default function BedsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bed Management</h1>
          <p className="text-gray-500 mt-1">Monitor bed occupancy and patient assignments</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            <UserPlus size={16} className="mr-2" />
            Assign Patient
          </button>
          <button className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            <Plus size={16} className="mr-2" />
            Add Bed
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Beds</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">120</p>
              <div className="flex items-center mt-2">
                <Building className="h-3 w-3 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">20 ICU, 100 General</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Bed className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Occupied</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">104</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">87% occupancy</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Users className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Available</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">16</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-3 w-3 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">Ready for admission</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
              <div className="flex items-center mt-2">
                <Activity className="h-3 w-3 text-gray-500 mr-1" />
                <span className="text-sm font-medium text-gray-600">All operational</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
              <Activity className="text-white" size={20} />
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
              placeholder="Search beds by number, ward, or patient..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Wards</option>
              <option>ICU</option>
              <option>General Ward</option>
              <option>Emergency</option>
              <option>Maternity</option>
              <option>Pediatrics</option>
            </select>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Status</option>
              <option>Occupied</option>
              <option>Available</option>
              <option>Maintenance</option>
              <option>Cleaning</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* ICU Bed Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                ICU
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">ICU Bed 001</h3>
                <p className="text-sm text-gray-500">Intensive Care Unit</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                Occupied
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  MR
                </div>
                <div className="ml-2">
                  <p className="font-medium text-gray-900 text-sm">Michael Rodriguez</p>
                  <p className="text-xs text-gray-500">PAT002</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">Critical</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Admitted:</span>
              <span className="font-medium text-gray-900">3 days ago</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Attending:</span>
              <span className="font-medium text-gray-900">Dr. Amit Singh</span>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-red-700">Patient Status</p>
              <span className="text-xs text-red-600">Under Monitoring</span>
            </div>
            <p className="text-sm text-red-900">Vital signs stable, recovery in progress</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <UserMinus size={14} className="mr-1" />
              Discharge
            </button>
          </div>
        </div>

        {/* General Ward Bed Card - Occupied */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                G01
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">General Bed 001</h3>
                <p className="text-sm text-gray-500">General Ward</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Occupied
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  SJ
                </div>
                <div className="ml-2">
                  <p className="font-medium text-gray-900 text-sm">Sarah Johnson</p>
                  <p className="text-xs text-gray-500">PAT001</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Stable</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Admitted:</span>
              <span className="font-medium text-gray-900">2 days ago</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Attending:</span>
              <span className="font-medium text-gray-900">Dr. Priya Sharma</span>
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-green-700">Patient Status</p>
              <span className="text-xs text-green-600">Recovering</span>
            </div>
            <p className="text-sm text-green-900">Post-operative recovery, discharge tomorrow</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <UserMinus size={14} className="mr-1" />
              Discharge
            </button>
          </div>
        </div>

        {/* Available Bed Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                G02
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">General Bed 002</h3>
                <p className="text-sm text-gray-500">General Ward</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Available
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Ready for Admission</p>
                <p className="text-xs text-gray-500">Cleaned and sanitized</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Last Occupied:</span>
              <span className="font-medium text-gray-900">Yesterday</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Maintenance:</span>
              <span className="font-medium text-green-600">Up to date</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-blue-700">Bed Status</p>
              <span className="text-xs text-blue-600">Ready</span>
            </div>
            <p className="text-sm text-blue-900">Available for immediate assignment</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-blue-50 text-blue-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
              <UserPlus size={14} className="mr-1" />
              Assign
            </button>
          </div>
        </div>

        {/* Pediatric Bed Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                P01
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Pediatric Bed 001</h3>
                <p className="text-sm text-gray-500">Pediatrics Ward</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                Occupied
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  EW
                </div>
                <div className="ml-2">
                  <p className="font-medium text-gray-900 text-sm">Emma Watson</p>
                  <p className="text-xs text-gray-500">PAT003 • Age 14</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Stable</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Admitted:</span>
              <span className="font-medium text-gray-900">Today</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Attending:</span>
              <span className="font-medium text-gray-900">Dr. Rajesh Kumar</span>
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-purple-700">Patient Status</p>
              <span className="text-xs text-purple-600">Observation</span>
            </div>
            <p className="text-sm text-purple-900">Routine check-up, awaiting test results</p>
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
          Load More Beds
        </button>
      </div>
    </div>
  );
} 