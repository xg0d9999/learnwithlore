import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hoverEffect?: boolean;
}

export function Card({
    children,
    padding = 'md',
    hoverEffect = false,
    className = '',
    ...props
}: CardProps) {
    const paddings = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    const baseStyles = 'bg-card-light dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm';
    const hoverStyles = hoverEffect ? 'hover:shadow-md hover:border-primary/30 transition-all duration-200' : '';

    return (
        <div className={`${baseStyles} ${paddings[padding]} ${hoverStyles} ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`mb-4 flex items-center justify-between ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <h3 className={`text-lg font-bold text-slate-900 dark:text-white ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <p className={`text-sm text-slate-500 dark:text-slate-400 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center ${className}`}>{children}</div>;
}
