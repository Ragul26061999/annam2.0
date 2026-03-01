import React from 'react';
import { Clock, Calendar as CalendarIcon, Edit, MoreVertical } from 'lucide-react';

interface AppointmentItemProps {
  name: string;
  time: string;
  date: string;
  type: string;
  image: string;
}

const AppointmentItem: React.FC<AppointmentItemProps> = ({ name, time, date, type, image }) => {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center">
        <img 
          src={image} 
          alt={name} 
          className="h-10 w-10 rounded-full object-cover" 
        />
        <div className="ml-4">
          <h3 className="font-medium text-gray-900">{name}</h3>
          <div className="flex space-x-4 mt-1">
            <span className="flex items-center text-xs text-gray-500">
              <Clock size={12} className="mr-1" /> {time}
            </span>
            <span className="flex items-center text-xs text-gray-500">
              <CalendarIcon size={12} className="mr-1" /> {date}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <span className={`badge ${type === 'Follow-up' ? 'badge-primary' : type === 'Surgery Prep' ? 'badge-warning' : 'badge-success'}`}>
          {type}
        </span>
        
        <div className="flex ml-4">
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <Edit size={16} />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentItem; 
