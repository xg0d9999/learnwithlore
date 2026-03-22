import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/layout/AdminSidebar';

export default function AdminLayout() {
    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <AdminSidebar />

            <main className="flex-1 ml-72 bg-background-light dark:bg-background-dark">
                <Outlet />
            </main>
        </div>
    );
}
