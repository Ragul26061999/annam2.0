import React from 'react';
import { MoreVertical } from 'lucide-react';

interface PatientRowProps {
  name: string;
  age?: number;
  gender?: string;
  status?: string;
  condition: string;
  image: string;
}

const PatientRow: React.FC<PatientRowProps> = ({ name, age, gender, condition, image }) => {
  return (
    <tr className="bg-white hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap flex items-center">
        <img className="h-10 w-10 rounded-full object-cover" src={image} alt={name} />
        <span className="ml-2 font-medium text-gray-900">{name}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{age ?? '-'}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{gender ?? '-'}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{condition}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button className="p-1 text-gray-400 hover:text-gray-600">
          <MoreVertical size={16} />
        </button>
      </td>
    </tr>
  );
};

export default PatientRow; 
