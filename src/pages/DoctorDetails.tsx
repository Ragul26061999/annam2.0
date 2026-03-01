import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import DoctorDetailsCard from '../components/DoctorDetailsCard';

// Mock doctor data (in a real app, this would come from an API)
const doctor = {
  id: '1',
  name: 'Dr. Robert Chen',
  specialty: 'Cardiology',
  department: 'Internal Medicine',
  status: 'Available',
  contact: '+1 (555) 123-4567',
  email: 'robert.chen@hospital.com',
  image: 'https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
};

const DoctorDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isEditing, setIsEditing] = React.useState(false);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/doctors" className="flex items-center text-gray-500 hover:text-primary-500 mr-4">
            <ArrowLeft size={20} className="mr-1" />
            <span>Back to Doctors</span>
          </Link>
          <h1 className="text-gray-900">Doctor Profile</h1>
        </div>
        
        <button 
          className="btn-primary flex items-center"
          onClick={() => setIsEditing(true)}
        >
          <Edit size={18} className="mr-2" />
          Edit Profile
        </button>
      </div>
      
      {/* Doctor Details Card */}
      <DoctorDetailsCard
        image={doctor.image}
        name={doctor.name}
        specialty={doctor.specialty}
        email={doctor.email}
        phone={doctor.contact}
        appointments={0}
        patients={0}
      />
    </div>
  );
};

export default DoctorDetails;