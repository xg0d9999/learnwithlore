import { ImgHTMLAttributes } from 'react';

interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    fallbackInitials?: string;
}

export function Avatar({
    src,
    alt = 'User avatar',
    size = 'md',
    fallbackInitials,
    className = '',
    ...props
}: AvatarProps) {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    const baseStyles = 'rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0';

    if (!src && fallbackInitials) {
        return (
            <div
                className={`${baseStyles} ${sizes[size]} bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold ${className}`}
            >
                {fallbackInitials}
            </div>
        );
    }

    return (
        <img
            src={src || 'https://ui-avatars.com/api/?name=User&background=random'}
            alt={alt}
            className={`${baseStyles} ${sizes[size]} ${className}`}
            {...props}
        />
    );
}
