import { Outlet } from 'react-router-dom';

export default function FocusLayout() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased flex flex-col overflow-hidden">
            <Outlet />
        </div>
    );
}
