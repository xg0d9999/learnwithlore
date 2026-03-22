import { ReactNode } from 'react';

// Common context header used in Student views like Vocabulary and Lessons
export function TopNavigation({ activeTab, tabs, onTabChange, children }: {
    activeTab?: string,
    tabs?: { label: string, href?: string }[],
    onTabChange?: (tab: string) => void,
    children?: ReactNode,
}) {
    return (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-8 py-4 shrink-0 transition-colors duration-300">
            <div className="max-w-6xl mx-auto flex flex-col gap-6">
                <div className="flex items-center justify-between gap-8">
                    {children}
                    <div className="flex items-center gap-3">
                        <button className="size-11 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all shrink-0">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                    </div>
                </div>

                {tabs && tabs.length > 0 && (
                    <nav className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {tabs.map((tab, idx) => (
                            <button
                                key={idx}
                                onClick={() => onTabChange?.(tab.label)}
                                className={`px-6 py-2 text-sm whitespace-nowrap transition-all ${activeTab === tab.label
                                    ? 'font-bold text-primary border-b-2 border-primary'
                                    : 'font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-b-2 border-transparent hover:border-slate-200'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                )}
            </div>
        </header>
    );
}

