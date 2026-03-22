import { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
    icon?: ReactNode;
}

export function Badge({ children, variant = 'neutral', icon, className = '' }: BadgeProps) {
    const baseStyles = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold';

    const variants = {
        success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
        neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        primary: 'bg-primary/10 text-primary dark:bg-primary/20',
    };

    return (
        <span className={`${baseStyles} ${variants[variant]} ${className}`}>
            {icon && <span className="flex items-center text-[14px]">{icon}</span>}
            {children}
        </span>
    );
}
