'use client';
import React, { useState } from 'react';
import { Calendar, Clock, Users, Activity, Plus, Filter } from 'lucide-react';
import AppointmentBookingForm from '../../src/components/AppointmentBookingForm';
import AppointmentManagement from '../../src/components/AppointmentManagement';

const AppointmentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'book' | 'manage'>('overview');
  const [showBookingForm, setShowBookingForm] = useState(false);

  const stats = [
    {
      title: 'Today\'s Appointments',
      value: '24',
      icon: Calendar,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Pending Confirmations',
      value: '8',
      icon: Clock,
      color: 'bg-yellow-500',
      change: '+5%'
    },
    {
      title: 'Active Doctors',
      value: '15',
      icon: Users,
      color: 'bg-green-500',
      change: '+2%'
    },
    {
      title: 'Completed Today',
      value: '18',
      icon: Activity,
      color: 'bg-purple-500',
      change: '+8%'
    }
  ];

  const TabButton: React.FC<{ 
    label: string; 
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
  }> = ({ label, icon: Icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
              <p className="text-gray-600 mt-1">Manage patient appointments and doctor schedules</p>
            </div>
            <button
              onClick={() => setShowBookingForm(true)}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Appointment
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-2 pb-4">
            <TabButton
              label="Overview"
              icon={Activity}
              isActive={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            />
            <TabButton
              label="Book Appointment"
              icon={Plus}
              isActive={activeTab === 'book'}
              onClick={() => setActiveTab('book')}
            />
            <TabButton
              label="Manage Appointments"
              icon={Filter}
              isActive={activeTab === 'manage'}
              onClick={() => setActiveTab('manage')}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                        <p className="text-sm text-green-600 mt-1">{stat.change} from yesterday</p>
                      </div>
                      <div className={`${stat.color} p-3 rounded-xl`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('book')}
                  className="flex items-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Book New Appointment</div>
                    <div className="text-sm opacity-90">Schedule patient visit</div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  className="flex items-center p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Calendar className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">View All Appointments</div>
                    <div className="text-sm opacity-90">Manage existing bookings</div>
                  </div>
                </button>
                <button className="flex items-center p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg">
                  <Users className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Doctor Schedules</div>
                    <div className="text-sm opacity-90">Manage availability</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { action: 'New appointment booked', patient: 'John Doe', time: '2 minutes ago', status: 'success' },
                  { action: 'Appointment confirmed', patient: 'Jane Smith', time: '15 minutes ago', status: 'info' },
                  { action: 'Appointment completed', patient: 'Mike Johnson', time: '1 hour ago', status: 'success' },
                  { action: 'Appointment cancelled', patient: 'Sarah Wilson', time: '2 hours ago', status: 'warning' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        activity.status === 'success' ? 'bg-green-500' :
                        activity.status === 'info' ? 'bg-blue-500' :
                        activity.status === 'warning' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-600">Patient: {activity.patient}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'book' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
            <AppointmentBookingForm 
              isOpen={true}
              onClose={() => setActiveTab('overview')}
              onSuccess={() => setActiveTab('manage')} 
            />
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden">
            <AppointmentManagement />
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Book New Appointment</h2>
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <AppointmentBookingForm 
                isOpen={showBookingForm}
                onClose={() => setShowBookingForm(false)}
                onSuccess={() => {
                  setShowBookingForm(false);
                  setActiveTab('manage');
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentDashboard;