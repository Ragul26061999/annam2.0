import React from 'react';
import { 
  Users, 
  Calendar, 
  Pill, 
  Bed, 
  ArrowUpRight, 
  TrendingUp, 
  Heart, 
  Activity,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, Dr. Selvan</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-900">Today</p>
            <p className="text-xs text-gray-500">January 15, 2025</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">1,284</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+8.2%</span>
                <span className="text-xs text-gray-500 ml-1">from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Users className="text-white" size={20} />
            </div>
          </div>
        </div>

        {/* Appointments Today */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Appointments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">42</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">12 pending</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <Calendar className="text-white" size={20} />
            </div>
          </div>
        </div>

        {/* Bed Occupancy */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Bed Occupancy</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">87%</p>
              <div className="flex items-center mt-2">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: '87%' }}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">104/120 beds</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
              <Bed className="text-white" size={20} />
            </div>
          </div>
        </div>

        {/* Critical Patients */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Critical Cases</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">7</p>
              <div className="flex items-center mt-2">
                <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-sm font-medium text-red-600">Requires attention</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
              <Heart className="text-white" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-900">Today's Appointments</h2>
            <button className="flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-all duration-200">
              View all <ArrowUpRight size={14} className="ml-1" />
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Appointment Item */}
            <div className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                SJ
              </div>
              <div className="ml-3 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">Sarah Johnson</h3>
                <p className="text-xs text-gray-500">Cardiology Follow-up</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900 text-sm">10:00 AM</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle2 size={10} className="mr-1" />
                  Confirmed
                </span>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                MR
              </div>
              <div className="ml-3 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">Michael Rodriguez</h3>
                <p className="text-xs text-gray-500">General Consultation</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900 text-sm">11:30 AM</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  <Clock size={10} className="mr-1" />
                  Waiting
                </span>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                EW
              </div>
              <div className="ml-3 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">Emma Watson</h3>
                <p className="text-xs text-gray-500">Pediatric Check-up</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900 text-sm">2:15 PM</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <UserCheck size={10} className="mr-1" />
                  Scheduled
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hospital Status */}
        <div className="space-y-5">
          {/* Department Status */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Department Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-700">Emergency</span>
                </div>
                <span className="text-sm font-semibold text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-700">ICU</span>
                </div>
                <span className="text-sm font-semibold text-blue-600">85% Full</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-700">Surgery</span>
                </div>
                <span className="text-sm font-semibold text-orange-600">3 Ongoing</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-700">Radiology</span>
                </div>
                <span className="text-sm font-semibold text-purple-600">Available</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Staff on Duty</span>
                <span className="font-semibold text-gray-900">127</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending Lab Results</span>
                <span className="font-semibold text-gray-900">23</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Medicine Requests</span>
                <span className="font-semibold text-gray-900">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Discharge Today</span>
                <span className="font-semibold text-gray-900">15</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 