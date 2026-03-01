import React from 'react';
import { Mail, Phone, Clock, CalendarDays } from 'lucide-react';

interface DoctorDetailsCardProps {
  image: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  appointments: number;
  patients: number;
}

const DoctorDetailsCard: React.FC<DoctorDetailsCardProps> = ({ image, name, specialty, email, phone, appointments, patients }) => {
  return (
    <div className="bg-white rounded-lg shadow-neu-flat p-4 flex items-center space-x-4">
      <img 
        src={image} 
        alt={name} 
        className="h-24 w-24 rounded-lg object-cover" 
      />
      <div className="flex-1">
        <h3 className="text-lg font-medium text-gray-900">{name}</h3>
        <p className="text-sm text-gray-500 mb-2">{specialty}</p>
        <div className="flex space-x-4 text-gray-500 text-xs">
          <span className="flex items-center"><Mail size={14} className="mr-1" /> {email}</span>
          <span className="flex items-center"><Phone size={14} className="mr-1" /> {phone}</span>
        </div>
      </div>
      <div className="space-y-1 text-xs text-gray-500">
        <div className="flex items-center"><Clock size={14} className="mr-1" /> Appointments: {appointments}</div>
        <div className="flex items-center"><CalendarDays size={14} className="mr-1" /> Patients: {patients}</div>
      </div>
    </div>
  );
};

export default DoctorDetailsCard; 
