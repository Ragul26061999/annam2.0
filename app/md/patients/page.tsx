'use client';
import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit3, 
  MoreVertical,
  UserPlus,
  Calendar,
  Phone,
  MapPin,
  Heart,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Clock
} from 'lucide-react';

export default function PatientsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 mt-1">Manage patient records and information</p>
        </div>
        <Link href="/patients/register">
          <button className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            <UserPlus size={16} className="mr-2" />
            Register New Patient
          </button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">1,284</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+12 this week</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Users className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">8</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">3 pending</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <UserPlus className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Critical</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">7</p>
              <div className="flex items-center mt-2">
                <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-sm font-medium text-red-600">Requires attention</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <Heart className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Admitted</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">104</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">87% occupancy</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
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
              placeholder="Search patients by name, ID, phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Status</option>
              <option>Active</option>
              <option>Admitted</option>
              <option>Critical</option>
              <option>Discharged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Patient Card 1 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                SJ
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Sarah Johnson</h3>
                <p className="text-sm text-gray-500">PAT001</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Active
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar size={14} className="mr-2" />
              Age: 38 • Female • A+
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone size={14} className="mr-2" />
              +91-9876543231
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={14} className="mr-2" />
              123 Main St, Chennai
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-xs font-medium text-gray-700 mb-1">Last Visit</p>
            <p className="text-sm text-gray-900">Cardiology Follow-up - Dr. Priya Sharma</p>
            <p className="text-xs text-gray-500">2 days ago</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Edit3 size={14} className="mr-1" />
              Edit
            </button>
          </div>
        </div>

        {/* Patient Card 2 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                MR
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Michael Rodriguez</h3>
                <p className="text-sm text-gray-500">PAT002</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                Critical
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar size={14} className="mr-2" />
              Age: 32 • Male • B+
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone size={14} className="mr-2" />
              +91-9876543233
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={14} className="mr-2" />
              456 Oak Ave, Chennai
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
            <p className="text-xs font-medium text-red-700 mb-1">Current Status</p>
            <p className="text-sm text-red-900">ICU - Bed ICU001</p>
            <p className="text-xs text-red-600">Admitted 3 days ago</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Edit3 size={14} className="mr-1" />
              Edit
            </button>
          </div>
        </div>

        {/* Patient Card 3 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                EW
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Emma Watson</h3>
                <p className="text-sm text-gray-500">PAT003</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Scheduled
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar size={14} className="mr-2" />
              Age: 14 • Female • O+
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone size={14} className="mr-2" />
              +91-9876543235
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={14} className="mr-2" />
              789 Pine St, Chennai
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 mb-4">
            <p className="text-xs font-medium text-blue-700 mb-1">Next Appointment</p>
            <p className="text-sm text-blue-900">Pediatric Check-up - Dr. Rajesh Kumar</p>
            <p className="text-xs text-blue-600">Today, 2:15 PM</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Edit3 size={14} className="mr-1" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
          Load More Patients
        </button>
      </div>
    </div>
  );
} 