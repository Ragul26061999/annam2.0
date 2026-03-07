
import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { getDosageForms, addDosageForm, DosageForm } from '@/src/lib/dosageFormService';

interface DosageFormSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection',
  'Ointment', 'Cream', 'Drops', 'Inhaler', 'Powder'
];

export const DosageFormSelect: React.FC<DosageFormSelectProps> = ({
  value,
  onChange,
  error,
  className = '',
  disabled = false,
}) => {
  const [options, setOptions] = useState<DosageForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const data = await getDosageForms();
      
      if (data.length === 0) {
        // If nothing in DB, use defaults as mapped objects
        const initial = DEFAULT_DOSAGE_FORMS.map(name => ({
          id: name,
          code: name
        }));
        setOptions(initial);
      } else {
        setOptions(data);
      }
    } catch (err) {
      console.error('Failed to load dosage forms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const handleAdd = async () => {
    if (!newFormName.trim()) return;
    
    setSubmitting(true);
    try {
      const added = await addDosageForm(newFormName.trim());
      if (added) {
        // Refresh options
        await loadOptions();
        // Select the new one
        onChange(added.code);
        // Reset state
        setNewFormName('');
        setIsAdding(false);
      }
    } catch (err: any) {
      console.error('Failed to add dosage form:', err?.message || err);
      alert('Failed to add dosage form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Dosage Form
      </label>
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          {isAdding ? (
            <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
              <input
                type="text"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                placeholder="New form name..."
                className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  } else if (e.key === 'Escape') {
                    setIsAdding(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={submitting || !newFormName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled || loading}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition appearance-none bg-white ${
                error ? 'border-red-500 bg-red-50' : 'border-gray-300'
              } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <option value="">Select dosage form</option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.code}>
                  {opt.code}
                </option>
              ))}
            </select>
          )}
          
          {loading && !isAdding && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
          
          {!isAdding && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            disabled={disabled || loading}
            className="p-2 border border-gray-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center min-w-[42px] shadow-sm"
            title="Add new dosage form"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
