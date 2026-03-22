import { ReactNode } from 'react';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    iconBgClass?: string;
    iconTextClass?: string;
    trend?: {
        value: number;
        isPositive: boolean;
        label: string;
    };
    className?: string;
}

export function MetricCard({
    title,
    value,
    icon,
    iconBgClass = 'bg-primary/10',
    iconTextClass = 'text-primary',
    trend,
    className = ''
}: MetricCardProps) {
    return (
        <div className={`p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between ${className}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-xl flex items-center justify-center ${iconBgClass} ${iconTextClass}`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
            </div>

            {trend && (
                <div className="flex items-center gap-2 text-sm mt-4 pt-4 border-t border-slate-100">
                    <div className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-md ${trend.isPositive
                        ? 'text-green-600 bg-green-50'
                        : 'text-red-600 bg-red-50'
                        }`}>
                        <span className="material-symbols-outlined text-[16px]">
                            {trend.isPositive ? 'trending_up' : 'trending_down'}
                        </span>
                        {Math.abs(trend.value)}%
                    </div>
                    <span className="text-slate-400">{trend.label}</span>
                </div>
            )}
        </div>
    );
}
