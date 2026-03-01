import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`} />
  );
};

interface LoadingCardProps {
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>
  );
};

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const LoadingTable: React.FC<LoadingTableProps> = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="animate-pulse">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded flex-1"></div>
            ))}
          </div>
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="h-4 bg-gray-200 rounded flex-1"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-4 max-w-sm mx-auto">{description}</p>
      )}
      {action && action}
    </div>
  );
};
