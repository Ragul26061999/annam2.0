import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
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

export interface SearchableSelectRef {
  focus: () => void;
  open: () => void;
}

export const SearchableSelect = forwardRef<SearchableSelectRef, SearchableSelectProps>(({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  keepOpenAfterSelect = false
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const lastOpenedRef = useRef<number>(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      wrapperRef.current?.focus();
    },
    open: () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }));

  // Get selected option details
  const selectedOption = React.useMemo(() => 
    options.find(opt => opt.value === value),
  [options, value]);

  // Update filtered options when search term or options change
  const filteredOptions = React.useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return searchTerm
      ? options.filter(opt =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        opt.subLabel?.toLowerCase().includes(lowerSearch) ||
        opt.group?.toLowerCase().includes(lowerSearch)
      )
      : options;
  }, [searchTerm, options]);

  // Update active index when filtered options change
  useEffect(() => {
    if (filteredOptions.length > 0) {
      setActiveIndex(0);
    } else {
      setActiveIndex(-1);
    }
  }, [filteredOptions]);

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
        setIsKeyboardNavigating(true);
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsKeyboardNavigating(true);
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
        wrapperRef.current?.focus();
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

          const padding = 8; // Increased padding for better visibility

          if (elementTop < containerTop + padding) {
            // Scroll up to show item at top
            container.scrollTo({ 
              top: elementTop - padding, 
              behavior: isKeyboardNavigating ? 'auto' : 'smooth' 
            });
          } else if (elementTop + elementHeight > containerTop + containerHeight - padding) {
            // Scroll down to show item at bottom
            container.scrollTo({ 
              top: elementTop + elementHeight - containerHeight + padding, 
              behavior: isKeyboardNavigating ? 'auto' : 'smooth' 
            });
          }
        }
      }
    }
  }, [activeIndex, isOpen, isKeyboardNavigating]);

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  // Toggle dropdown
  const toggleOpen = (e?: React.MouseEvent) => {
    if (disabled) return;
    if (e) e.stopPropagation();
    
    // If it was opened by focus in the last 200ms, don't toggle it off
    const now = Date.now();
    if (isOpen && (now - lastOpenedRef.current < 300)) {
      return;
    }

    if (!isOpen) {
      setIsOpen(true);
      lastOpenedRef.current = now;
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setIsOpen(false);
    }
  };

  const handleGlobalFocus = (e: React.FocusEvent) => {
    if (disabled) return;
    
    // Check if focus is already inside
    if (wrapperRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }

    if (!isOpen) {
      setIsOpen(true);
      lastOpenedRef.current = Date.now();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <div
      className={`relative ${className}`}
      ref={wrapperRef}
      onKeyDown={handleKeyDown}
      onFocus={handleGlobalFocus}
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
            <span className="text-slate-900 font-bold">{selectedOption.label}</span>
          ) : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
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
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
              <div className="p-8 text-center text-slate-400 text-sm font-medium">
                No results found for "{searchTerm}"
              </div>
            ) : (
                  <div className="py-1 options-wrapper" onMouseMove={() => setIsKeyboardNavigating(false)}>
                    {filteredOptions.map((option, index) => (
                      <div
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        onMouseEnter={() => {
                          if (!isKeyboardNavigating) {
                            setActiveIndex(index);
                          }
                        }}
                        className={`
                          px-4 py-3 cursor-pointer flex items-center justify-between mx-1 rounded-lg transition-all duration-200
                          ${activeIndex === index ? 'bg-teal-600 text-white shadow-md' : value === option.value ? 'bg-teal-50 text-teal-900 border border-teal-100' : 'text-slate-700 hover:bg-slate-50'}
                        `}
                      >
                    <div>
                      <div className="font-bold">{option.label}</div>
                      <div className={`text-xs mt-0.5 flex gap-2 font-medium ${activeIndex === index ? 'text-teal-100' : 'text-slate-500'}`}>
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
});

SearchableSelect.displayName = 'SearchableSelect';
