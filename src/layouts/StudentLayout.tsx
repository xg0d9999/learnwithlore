import { Outlet } from 'react-router-dom';
import StudentSidebar from '../components/layout/StudentSidebar';

export default function StudentLayout() {
    return (
        <div className="flex h-screen overflow-hidden bg-background-light font-display text-slate-900 dark:text-slate-100 antialiased">
            <StudentSidebar />

            <main className="flex-1 flex flex-col h-full overflow-y-auto bg-background-light">
                <Outlet />
            </main>
        </div>
    );
}
