'use client';

import React from 'react';
import { 
  Users, 
  Calendar, 
  Bed, 
  UserCheck, 
  AlertTriangle, 
  Activity,
  UserPlus,
  FileText
} from 'lucide-react';
import { DashboardStats as StatsType } from '../../lib/dashboardService';
import { LoadingCard } from '../ui/loading';

interface DashboardStatsProps {
  stats: StatsType | null;
  loading: boolean;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  color, 
  loading = false 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  };

  if (loading) {
    return <LoadingCard />;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className={`inline-flex items-center ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, loading }) => {
  const statCards = [
    {
      title: 'Total Patients',
      value: stats?.totalPatients || 0,
      icon: <Users className="w-6 h-6" />,
      color: 'blue' as const,
    },
    {
      title: 'Today\'s Appointments',
      value: stats?.todayAppointments || 0,
      icon: <Calendar className="w-6 h-6" />,
      color: 'green' as const,
    },
    {
      title: 'Bed Occupancy',
      value: stats?.bedOccupancyRate || 0,
      icon: <Bed className="w-6 h-6" />,
      color: 'yellow' as const,
    },
    {
      title: 'Available Doctors',
      value: stats?.availableDoctors || 0,
      icon: <UserCheck className="w-6 h-6" />,
      color: 'purple' as const,
    },
    {
      title: 'Critical Patients',
      value: stats?.criticalPatients || 0,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'red' as const,
    },
    {
      title: 'Emergency Admissions',
      value: stats?.emergencyAdmissions || 0,
      icon: <Activity className="w-6 h-6" />,
      color: 'red' as const,
    },
    {
      title: 'Total Staff',
      value: stats?.totalStaff || 0,
      icon: <UserPlus className="w-6 h-6" />,
      color: 'indigo' as const,
    },
    {
      title: 'Pending Bills',
      value: stats?.pendingBills || 0,
      icon: <FileText className="w-6 h-6" />,
      color: 'yellow' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => (
        <StatCard
          key={index}
          title={card.title}
          value={card.value}
          icon={card.icon}
          color={card.color}
          loading={loading}
        />
      ))}
    </div>
  );
};
