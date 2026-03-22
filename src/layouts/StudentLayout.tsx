import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from '../components/layout/StudentSidebar';

export default function StudentLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-background-light font-display text-slate-900 dark:text-slate-100 antialiased relative">
            {/* Mobile Sidebar Toggle */}
            <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden fixed top-6 left-6 z-30 p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary transition-all active:scale-95"
            >
                <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 flex flex-col h-full overflow-y-auto bg-background-light">
                <Outlet />
            </main>
        </div>
    );
}
