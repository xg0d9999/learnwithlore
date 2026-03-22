import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectProps {
    label?: string;
    error?: string;
    placeholder?: string;
    options: { value: string | number; label: string }[];
    value?: any;
    defaultValue?: any;
    onChange?: (e: { target: { value: any, name?: string } }) => void;
    className?: string;
    name?: string;
    disabled?: boolean;
    required?: boolean;
}

/**
 * Premium Custom Select Component
 * Replaces native <select> with a highly-styled, animated dropdown.
 */
export const Select: React.FC<SelectProps> = ({ 
    label, 
    error, 
    placeholder, 
    options, 
    value, 
    defaultValue,
    onChange, 
    className = '',
    name,
    disabled
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentValue = value !== undefined ? value : defaultValue;
    const selectedOption = options.find(opt => opt.value === currentValue);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (val: string | number) => {
        if (onChange) {
            // Mock native event for compatibility with existing form handlers
            onChange({
                target: {
                    value: val,
                    name: name
                }
            });
        }
        setIsOpen(false);
    };

    return (
        <div className={`w-full relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
                    {label}
                </label>
            )}
            
            <div className="relative">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full flex items-center justify-between gap-2 px-5 h-12
                        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                        rounded-2xl text-sm font-bold transition-all duration-300
                        hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5
                        ${isOpen ? 'ring-4 ring-primary/10 border-primary shadow-lg shadow-primary/5 translate-y-[-1px]' : ''}
                        ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}
                        ${error ? 'border-red-500 ring-4 ring-red-500/10' : ''}
                    `}
                >
                    <span className={`truncate ${!selectedOption && !currentValue ? 'text-slate-400 font-medium' : 'text-slate-900 dark:text-white'}`}>
                        {selectedOption ? selectedOption.label : (currentValue ? String(currentValue) : (placeholder || 'Select option...'))}
                    </span>
                    <ChevronDown 
                        size={18} 
                        className={`text-slate-400 transition-transform duration-500 ${isOpen ? 'rotate-180 text-primary' : ''}`} 
                    />
                </button>

                {isOpen && (
                    <div className="absolute z-[110] w-full mt-2 py-2 bg-white/95 dark:bg-slate-800/98 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar scroll-smooth">
                            {options.length === 0 ? (
                                <div className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">
                                    No options available
                                </div>
                            ) : (
                                options.map((option) => {
                                    const isSelected = option.value === currentValue;
                                    return (
                                        <button
                                            key={`${option.value}-${option.label}`}
                                            type="button"
                                            onClick={() => handleSelect(option.value)}
                                            className={`
                                                w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold transition-all
                                                ${isSelected 
                                                    ? 'bg-primary/10 text-primary' 
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary hover:pl-6'}
                                            `}
                                        >
                                            <span className="truncate">{option.label}</span>
                                            {isSelected && (
                                                <div className="bg-primary rounded-full p-0.5 animate-in zoom-in duration-300">
                                                    <Check size={12} className="text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-2 text-[10px] font-black text-red-500 uppercase tracking-widest px-1 animate-shake">
                    {error}
                </p>
            )}
        </div>
    );
};
