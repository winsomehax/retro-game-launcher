import React from 'react';
import { ChevronDownIcon } from './Icons';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  options: { value: string; label: string }[];
  placeholder?: string; // Added placeholder to the interface
}

export const Select: React.FC<SelectProps> = ({
  label,
  id,
  error,
  options,
  containerClassName = '',
  className = '',
  placeholder, // Destructure placeholder
  labelClassName,
  selectClassName,
  ...restProps // Gather remaining props (valid HTMLSelectElementAttributes)
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && <label htmlFor={selectId} className="block text-sm font-medium text-neutral-300 mb-1">{label}</label>}
      <div className="relative">
        <select
          id={selectId}
          className={`appearance-none w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 text-neutral-100 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition duration-150 ease-in-out ${error ? 'border-red-500' : ''} ${className}`}
          {...restProps} // Spread the rest of the HTMLSelectAttributes
        >
          {/*
            If placeholder is provided, render it as a disabled option with an empty value.
            This option will be selected if restProps.value (or restProps.defaultValue) is "".
            The 'required' attribute on the <select> tag (if present in restProps) will work correctly with this.
          */}
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {(options || []).map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400">
          <ChevronDownIcon className="w-5 h-5" />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};