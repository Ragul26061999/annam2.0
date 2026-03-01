'use client';

import React from 'react';
import { Building2, MapPin, Bed, TrendingUp } from 'lucide-react';
import { DepartmentStatus as DepartmentStatusType } from '../../lib/dashboardService';
import { LoadingCard, EmptyState } from '../ui/loading';

interface DepartmentStatusProps {
  departments: DepartmentStatusType[];
  loading: boolean;
}

interface DepartmentCardProps {
  department: DepartmentStatusType;
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({ department }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{department.name}</h4>
            {department.location && (
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <MapPin className="w-3 h-3 mr-1" />
                {department.location}
              </div>
            )}
          </div>
        </div>
        
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(department.status)}`}>
          {department.status.charAt(0).toUpperCase() + department.status.slice(1)}
        </span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bed className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Bed Occupancy</span>
          </div>
          <span className={`text-sm font-medium ${getOccupancyColor(department.occupancyRate)}`}>
            {department.occupancyRate}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              department.occupancyRate >= 90 ? 'bg-red-500' :
              department.occupancyRate >= 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${department.occupancyRate}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm text-gray-500">
          <span>Occupied: {department.occupiedBeds}</span>
          <span>Total: {department.bedCount}</span>
        </div>
        
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Available Beds</span>
            <span className="font-medium text-gray-900">
              {department.bedCount - department.occupiedBeds}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DepartmentStatus: React.FC<DepartmentStatusProps> = ({ 
  departments, 
  loading 
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Department Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!departments || departments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Department Status</h3>
        </div>
        <EmptyState
          icon={<Building2 className="w-12 h-12" />}
          title="No departments found"
          description="Department information is not available at the moment."
          className="py-8"
        />
      </div>
    );
  }

  const activeDepartments = departments.filter(dept => dept.status === 'active').length;
  const totalBeds = departments.reduce((sum, dept) => sum + dept.bedCount, 0);
  const totalOccupied = departments.reduce((sum, dept) => sum + dept.occupiedBeds, 0);
  const averageOccupancy = departments.length > 0 
    ? Math.round(departments.reduce((sum, dept) => sum + dept.occupancyRate, 0) / departments.length)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Department Status</h3>
            <p className="text-sm text-gray-500 mt-1">
              {activeDepartments} active departments • Average occupancy: {averageOccupancy}%
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span>{totalOccupied}/{totalBeds} beds occupied</span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((department) => (
            <DepartmentCard key={department.id} department={department} />
          ))}
        </div>
      </div>
    </div>
  );
};
