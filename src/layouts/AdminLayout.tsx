import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/layout/AdminSidebar';

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display relative">
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

            <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 lg:ml-72 bg-background-light dark:bg-background-dark min-h-screen">
                <Outlet />
            </main>
        </div>
    );
}
