'use client';

import React from 'react';
import { Bed, Users } from 'lucide-react';
import { BedStatus as BedStatusType } from '../../lib/dashboardService';
import { LoadingCard, EmptyState } from '../ui/loading';

interface BedStatusProps {
  bedStatus: BedStatusType[];
  loading: boolean;
}

interface BedTypeCardProps {
  bedType: BedStatusType;
}

const BedTypeCard: React.FC<BedTypeCardProps> = ({ bedType }) => {
  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 bg-red-50';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return 'bg-red-500';
    if (rate >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Bed className="w-5 h-5 text-gray-600" />
          <h4 className="font-medium text-gray-900">{bedType.bedType}</h4>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOccupancyColor(bedType.occupancyRate)}`}>
          {bedType.occupancyRate}%
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Occupied</span>
          <span className="font-medium">{bedType.occupied}/{bedType.total}</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(bedType.occupancyRate)}`}
            style={{ width: `${bedType.occupancyRate}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>Available: {bedType.available}</span>
          <span>Total: {bedType.total}</span>
        </div>
      </div>
    </div>
  );
};

export const BedStatus: React.FC<BedStatusProps> = ({ bedStatus, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Bed Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!bedStatus || bedStatus.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Bed Status</h3>
        </div>
        <EmptyState
          icon={<Bed className="w-12 h-12" />}
          title="No bed data available"
          description="Bed occupancy information is not available at the moment."
          className="py-8"
        />
      </div>
    );
  }

  const totalBeds = bedStatus.reduce((sum, bed) => sum + bed.total, 0);
  const totalOccupied = bedStatus.reduce((sum, bed) => sum + bed.occupied, 0);
  const overallOccupancyRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Bed Status</h3>
            <p className="text-sm text-gray-500 mt-1">
              Overall occupancy: {overallOccupancyRate}% ({totalOccupied}/{totalBeds} beds)
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{bedStatus.length} bed types</span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bedStatus.map((bed, index) => (
            <BedTypeCard key={index} bedType={bed} />
          ))}
        </div>
      </div>
    </div>
  );
};
