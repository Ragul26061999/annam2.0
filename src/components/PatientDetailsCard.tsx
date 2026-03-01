import React from 'react';
import { CalendarDays, Phone, Mail } from 'lucide-react';

interface PatientDetailsCardProps {
  image: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  email: string;
  bloodGroup: string;
}

const PatientDetailsCard: React.FC<PatientDetailsCardProps> = ({ image, name, age, gender, contact, email, bloodGroup }) => {
  return (
    <div className="bg-white rounded-lg shadow-neu-flat p-4 flex items-center space-x-4">
      <img 
        src={image} 
        alt={name} 
        className="h-24 w-24 rounded-lg object-cover" 
      />
      <div className="flex-1">
        <h3 className="text-lg font-medium text-gray-900">{name}</h3>
        <p className="text-sm text-gray-500 mb-2">Age: {age} | Gender: {gender}</p>
        <div className="flex space-x-4 text-gray-500 text-xs">
          <span className="flex items-center"><Phone size={14} className="mr-1" /> {contact}</span>
          <span className="flex items-center"><Mail size={14} className="mr-1" /> {email}</span>
        </div>
      </div>
      <div className="space-y-1 text-xs text-gray-500">
        <div className="flex items-center"><CalendarDays size={14} className="mr-1" /> Blood Group: {bloodGroup}</div>
      </div>
    </div>
  );
};

export default PatientDetailsCard; 
