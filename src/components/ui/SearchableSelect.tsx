import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  subLabel?: string;
  group?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  keepOpenAfterSelect?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  keepOpenAfterSelect = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  // Get selected option details
  const selectedOption = options.find(opt => opt.value === value);

  // Update filtered options when search term or options change
  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = searchTerm
      ? options.filter(opt =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        opt.subLabel?.toLowerCase().includes(lowerSearch) ||
        opt.group?.toLowerCase().includes(lowerSearch)
      )
      : options;

    setFilteredOptions(filtered);
    setActiveIndex(filtered.length > 0 ? 0 : -1);
  }, [searchTerm, options]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle option selection
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    if (!keepOpenAfterSelect) {
      setIsOpen(false);
    }
    setSearchTerm('');
    if (keepOpenAfterSelect) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If focus is in the input, don't let the event bubble to the wrapper
    // which also has a keydown listener, causing double-triggers.
    if ((e.target as HTMLElement).tagName === 'INPUT') {
      e.stopPropagation();
    }

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelect(filteredOptions[activeIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && optionsListRef.current) {
      const container = optionsListRef.current;
      const optionsWrapper = container.querySelector('.options-wrapper') as HTMLElement;

      if (optionsWrapper) {
        const activeElement = optionsWrapper.children[activeIndex] as HTMLElement;
        if (activeElement) {
          const containerHeight = container.offsetHeight;
          const containerTop = container.scrollTop;
          const elementTop = activeElement.offsetTop;
          const elementHeight = activeElement.offsetHeight;

          const padding = 2; // Safety margin

          if (elementTop < containerTop + padding) {
            // Scroll up to show item at top
            container.scrollTo({ top: elementTop - padding, behavior: 'auto' });
          } else if (elementTop + elementHeight > containerTop + containerHeight - padding) {
            // Scroll down to show item at bottom
            container.scrollTo({ top: elementTop + elementHeight - containerHeight + padding, behavior: 'auto' });
          }
        }
      }
    }
  }, [activeIndex, isOpen]);

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  // Toggle dropdown
  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      setIsOpen(true);
      // Focus input on open
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div
      className={`relative ${className}`}
      ref={wrapperRef}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
    >
      {/* Trigger Button */}
      <div
        onClick={toggleOpen}
        className={`
          flex items-center justify-between w-full px-4 py-3 bg-white border rounded-xl text-sm font-semibold transition-all cursor-pointer outline-none
          ${isOpen ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'}
          ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-75' : 'hover:border-teal-300 focus:border-teal-500'}
        `}
      >
        <div className="flex-1 truncate">
          {selectedOption ? (
            <span className="text-slate-900">{selectedOption.label}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedOption && !disabled && (
            <div
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* Options List */}
          <div
            ref={optionsListRef}
            className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200"
          >
            {filteredOptions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No results found for "{searchTerm}"
              </div>
            ) : (
              <div className="py-1 options-wrapper">
                {filteredOptions.map((option, index) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`
                      px-4 py-3 cursor-pointer flex items-center justify-between mx-1 rounded-lg
                      ${activeIndex === index ? 'bg-teal-600 text-white shadow-md' : value === option.value ? 'bg-teal-50 text-teal-900' : 'text-slate-700 hover:bg-slate-50'}
                    `}
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className={`text-xs mt-0.5 flex gap-2 ${activeIndex === index ? 'text-teal-100' : 'text-slate-500'}`}>
                        {option.group && (
                          <span className={`px-1.5 py-0.5 rounded ${activeIndex === index ? 'bg-white/20' : 'bg-slate-100'}`}>
                            {option.group}
                          </span>
                        )}
                        {option.subLabel}
                      </div>
                    </div>
                    {value === option.value && <Check size={16} className="text-teal-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
