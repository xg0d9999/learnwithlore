import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, iconPosition = 'left', className = '', id, ...props }, ref) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
        const hasIcon = !!icon;

        return (
            <div className={`w-full ${className}`}>
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        {label}
                    </label>
                )}

                <div className="relative">
                    {hasIcon && iconPosition === 'left' && (
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            {icon}
                        </div>
                    )}

                    <input
                        id={inputId}
                        ref={ref}
                        className={`w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 py-3 ${hasIcon && iconPosition === 'left' ? 'pl-11 pr-4' : ''
                            } ${hasIcon && iconPosition === 'right' ? 'pr-11 pl-4' : ''} ${!hasIcon ? 'px-4' : ''} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''
                            }`}
                        {...props}
                    />

                    {hasIcon && iconPosition === 'right' && (
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                            {icon}
                        </div>
                    )}
                </div>

                {error && <p className="mt-1.5 text-sm text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
