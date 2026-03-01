'use client';

import React from 'react';
import { Clock, User, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { RecentAppointment } from '../../lib/dashboardService';
import { LoadingTable, EmptyState } from '../ui/loading';

interface RecentAppointmentsProps {
  appointments: RecentAppointment[];
  loading: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'in_progress':
      return <AlertCircle className="w-4 h-4 text-blue-500" />;
    default:
      return <Clock className="w-4 h-4 text-yellow-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};

const formatTime = (time: string) => {
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
};

export const RecentAppointments: React.FC<RecentAppointmentsProps> = ({ 
  appointments, 
  loading 
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Today's Appointments</h3>
        </div>
        <LoadingTable rows={5} columns={4} className="border-0 shadow-none" />
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Today's Appointments</h3>
        </div>
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="No appointments today"
          description="There are no appointments scheduled for today."
          className="py-8"
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Today's Appointments</h3>
        <p className="text-sm text-gray-500 mt-1">{appointments.length} appointments scheduled</p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {appointment.patientInitials || appointment.patientName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {appointment.patientName}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {getStatusIcon(appointment.status)}
                      <span className="ml-1 capitalize">{appointment.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(appointment.appointmentTime)}
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <User className="w-3 h-3 mr-1" />
                      {appointment.doctorName || 'Unassigned'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0 text-right">
                <p className="text-sm text-gray-900 font-medium">{appointment.type}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {appointments.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all appointments →
          </button>
        </div>
      )}
    </div>
  );
};
