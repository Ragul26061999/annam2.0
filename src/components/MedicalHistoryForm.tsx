import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CreateMedicalHistoryInput, createMedicalHistory } from '../lib/medicalHistoryService';

interface MedicalHistoryFormProps {
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MedicalHistoryForm({ patientId, onClose, onSuccess }: MedicalHistoryFormProps) {
  const [formData, setFormData] = useState<CreateMedicalHistoryInput>({
    patientId,
    eventType: '',
    eventName: '',
    eventDate: new Date().toISOString().split('T')[0],
    details: '',
    doctorName: '',
    facilityName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createMedicalHistory(formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating medical history:', err);
      setError('Failed to create medical history entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add Medical Event</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                id="eventType"
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Select Event Type</option>
                <option value="Diagnosis">Diagnosis</option>
                <option value="Surgery">Surgery</option>
                <option value="Vaccination">Vaccination</option>
                <option value="Medication">Medication</option>
                <option value="Test">Test/Lab Result</option>
                <option value="Procedure">Procedure</option>
                <option value="Visit">Visit</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
                Event Name
              </label>
              <input
                type="text"
                id="eventName"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Appendectomy, Flu Shot, etc."
                required
              />
            </div>
            
            <div>
              <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                id="eventDate"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">
                Details
              </label>
              <textarea
                id="details"
                name="details"
                value={formData.details || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Enter any relevant details about this medical event"
              />
            </div>
            
            <div>
              <label htmlFor="doctorName" className="block text-sm font-medium text-gray-700 mb-1">
                Doctor Name
              </label>
              <input
                type="text"
                id="doctorName"
                name="doctorName"
                value={formData.doctorName || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Dr. Name (optional)"
              />
            </div>
            
            <div>
              <label htmlFor="facilityName" className="block text-sm font-medium text-gray-700 mb-1">
                Facility Name
              </label>
              <input
                type="text"
                id="facilityName"
                name="facilityName"
                value={formData.facilityName || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Hospital or clinic name (optional)"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-orange-300"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Medical Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
