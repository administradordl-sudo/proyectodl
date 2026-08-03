'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onChange?: (e: any) => void;
  options: SelectOption[];
  name?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  required?: boolean;
  icon?: React.ReactNode;
  onActionClick?: () => void;
  actionLabel?: string;
  onOptionDelete?: (optionValue: string) => void;
}

export default function Select({
  value,
  onChange,
  options,
  name,
  placeholder = 'Seleccionar...',
  className = '',
  triggerClassName = 'px-3 py-2 border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-1 focus:ring-blue-500 text-sm',
  dropdownClassName = '',
  required,
  icon,
  onActionClick,
  actionLabel,
  onOptionDelete
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { name, value: optionValue } });
    }
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        className={`flex items-center justify-between w-full border cursor-pointer transition-all outline-none ${triggerClassName}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          {icon && <div className="shrink-0">{icon}</div>}
          <span className={`truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {name && (
        <select 
          name={name} 
          value={value} 
          onChange={() => {}} 
          className="opacity-0 absolute inset-0 w-full h-full z-[-1]"
          required={required}
          tabIndex={-1}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden py-1 max-h-60 overflow-y-auto ${dropdownClassName}`}
            style={{ minWidth: '100%' }}
          >
            <div
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                !value || value === ''
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              onClick={() => handleSelect('')}
            >
              {placeholder}
            </div>
            
            {options.map((option) => (
              <div
                key={option.value}
                className={`group flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                  value === option.value 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => handleSelect(option.value)}
              >
                <span className="truncate flex-1 pr-2">{option.label}</span>
                {onOptionDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOptionDelete(option.value);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
                    title="Eliminar opción"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                )}
              </div>
            ))}
            
            {onActionClick && actionLabel && (
              <div
                className="px-3 py-2 text-sm cursor-pointer transition-colors border-t border-gray-100 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-medium flex items-center justify-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onActionClick();
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                {actionLabel}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
