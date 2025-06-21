
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, id, error, containerClassName = '', className = '', ...props }) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && <label htmlFor={textareaId} className="block text-sm font-medium text-neutral-300 mb-1">{label}</label>}
      <textarea
        id={textareaId}
        rows={3}
        className={`w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 text-neutral-100 rounded-lg shadow-sm placeholder-neutral-500 focus:ring-2 focus:ring-primary focus:border-primary transition duration-150 ease-in-out ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};
    