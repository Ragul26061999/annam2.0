
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Loader2, Search, Check, FolderRoot, X } from 'lucide-react';
import { getMedicineCategories, addMedicineCategory, MedicineCategory, seedMedicineCategories } from '@/src/lib/categoryService';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

const DEFAULT_CATEGORIES = [
  'Antibiotic', 'Analgesic', 'Antipyretic', 'Antihistamine', 'Antacid', 
  'Vitamin', 'Supplement', 'Antidiabetic', 'Hypertension', 'Other'
];

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  error,
  className = '',
  disabled = false,
  required = false
}) => {
  const [categories, setCategories] = useState<MedicineCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<(HTMLDivElement | null)[]>([]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      let data = await getMedicineCategories();
      
      if (data.length === 0) {
        // Seed and reload if empty
        await seedMedicineCategories(DEFAULT_CATEGORIES);
        data = await getMedicineCategories();
      }
      
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = categories.filter(cat => 
    cat.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(filteredCategories.length > 0 ? 0 : -1);
  }, [searchTerm, categories]);

  useEffect(() => {
    if (activeIndex >= 0 && optionsRef.current[activeIndex]) {
      optionsRef.current[activeIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    
    setSubmitting(true);
    try {
      const added = await addMedicineCategory(newName.trim());
      if (added) {
        await loadCategories();
        onChange(added.code);
        setNewName('');
        setIsAdding(false);
      }
    } catch (err) {
      console.error('Failed to add category:', err);
      alert('Failed to add category. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isAdding) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < filteredCategories.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredCategories.length) {
          onChange(filteredCategories[activeIndex].code);
          setIsOpen(false);
          setSearchTerm('');
        } else if (filteredCategories.length === 0 && searchTerm) {
          setNewName(searchTerm);
          setIsAdding(true);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
        Category {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="flex gap-2">
        <div className="flex-1 relative" ref={dropdownRef}>
          {isAdding ? (
            <div className="relative animate-in fade-in slide-in-from-left-2 duration-200">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New category..."
                className="w-full pl-4 pr-32 py-2 border border-blue-400 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-md font-medium"
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
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={submitting || !newName.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 shadow-sm transition-all text-xs font-bold"
                >
                  {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-all text-xs font-bold bg-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full px-4 py-2 border rounded-xl flex items-center justify-between cursor-pointer transition-all bg-white min-h-[42px] ${
                  isOpen ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-200'
                } ${error ? 'border-red-500 bg-red-50' : ''} ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'hover:border-gray-300'}`}
                tabIndex={0}
                onKeyDown={handleKeyDown}
              >
                <div className="flex items-center gap-2 truncate">
                  <FolderRoot className="w-4 h-4 text-gray-400" />
                  <span className={value ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}>
                    {value || 'Select Category'}
                  </span>
                </div>
                <svg className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-inner font-semibold"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={handleKeyDown}
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto p-1 scroll-smooth">
                    {loading ? (
                      <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span>Loading...</span>
                      </div>
                    ) : filteredCategories.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-sm text-gray-500 font-medium">No category found</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewName(searchTerm);
                            setIsAdding(true);
                            setIsOpen(false);
                          }}
                          className="mt-2 text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-lg"
                        >
                          + Add "{searchTerm}"
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {filteredCategories.map((cat, idx) => (
                          <div
                            key={cat.id}
                            ref={el => { optionsRef.current[idx] = el; }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onChange(cat.code);
                              setIsOpen(false);
                              setSearchTerm('');
                            }}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`px-4 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-200 ${
                              activeIndex === idx 
                                ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]' 
                                : value === cat.code 
                                  ? 'bg-blue-50 text-blue-700 font-bold' 
                                  : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span className="font-semibold">{cat.code}</span>
                            {value === cat.code && <Check className={`w-4 h-4 ${activeIndex === idx ? 'text-white' : 'text-blue-600'}`} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            disabled={disabled || loading}
            className="p-2 border border-gray-300 rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center min-w-[42px] shadow-sm bg-white"
            title="Create new category"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen && <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />}
    </div>
  );
};
