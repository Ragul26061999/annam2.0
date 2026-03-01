import React, { useState } from 'react';
import { addDummyMedicalHistory } from '../lib/medicalHistoryService';

interface AddDummyMedicalHistoryProps {
  patientId: string;
  onSuccess: () => void;
}

export default function AddDummyMedicalHistory({ patientId, onSuccess }: AddDummyMedicalHistoryProps) {
  const [loading, setLoading] = useState(false);

  const handleAddDummyData = async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      await addDummyMedicalHistory(patientId);
      onSuccess();
    } catch (error) {
      console.error('Error adding dummy data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAddDummyData}
      disabled={loading}
      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:bg-blue-300"
    >
      {loading ? 'Adding...' : 'Add Dummy Data'}
    </button>
  );
}
