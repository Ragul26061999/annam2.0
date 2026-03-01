'use client';

import React from 'react';
import { Users, FlaskConical, Pill, LogOut } from 'lucide-react';
import { QuickStats as QuickStatsType } from '../../lib/dashboardService';
import { LoadingCard, EmptyState } from '../ui/loading';

interface QuickStatsProps {
  quickStats: QuickStatsType | null;
  loading: boolean;
}

interface QuickStatItemProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  loading?: boolean;
}

const QuickStatItem: React.FC<QuickStatItemProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  loading = false 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  if (loading) {
    return <LoadingCard className="h-24" />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export const QuickStats: React.FC<QuickStatsProps> = ({ quickStats, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Statistics</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <QuickStatItem
                key={i}
                title=""
                value={0}
                icon={<div />}
                color="blue"
                loading={true}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!quickStats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Statistics</h3>
        </div>
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No statistics available"
          description="Quick statistics data is not available at the moment."
          className="py-8"
        />
      </div>
    );
  }

  const stats = [
    {
      title: 'Staff on Duty',
      value: quickStats.staffOnDuty,
      icon: <Users className="w-5 h-5" />,
      color: 'blue' as const,
    },
    {
      title: 'Pending Lab Results',
      value: quickStats.pendingLabResults,
      icon: <FlaskConical className="w-5 h-5" />,
      color: 'yellow' as const,
    },
    {
      title: 'Medicine Requests',
      value: quickStats.medicineRequests,
      icon: <Pill className="w-5 h-5" />,
      color: 'green' as const,
    },
    {
      title: 'Discharge Today',
      value: quickStats.dischargeToday,
      icon: <LogOut className="w-5 h-5" />,
      color: 'purple' as const,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Quick Statistics</h3>
        <p className="text-sm text-gray-500 mt-1">Real-time hospital operations overview</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <QuickStatItem
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
