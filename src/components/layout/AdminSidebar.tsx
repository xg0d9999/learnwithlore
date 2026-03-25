import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface AdminSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
    const { user, signOut } = useAuth();
    
    // Get initials for avatar fallback
    const fullName = user?.user_metadata?.full_name || 'Admin User';
    const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    const handleSignOut = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
            ? 'bg-primary/10 text-primary dark:bg-primary/20'
            : 'text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
        }`;

    return (
        <aside 
            className={`fixed inset-y-0 left-0 z-50 w-72 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-sidebar-light dark:bg-sidebar-dark transition-all duration-300 transform lg:translate-x-0 ${
                isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
            }`}
        >
            <div className="h-20 flex items-center justify-between px-6 border-b border-transparent dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-[24px]">shield_person</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">LearnWithLore</span>
                </div>
                {/* Close button for mobile */}
                <button 
                    onClick={onClose}
                    className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-2 custom-scrollbar">
                <NavLink to="/admin/dashboard" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined filled">dashboard</span>
                    <span className="text-sm font-medium">Panel Control</span>
                </NavLink>

                <NavLink to="/admin/corrections" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">assignment_turned_in</span>
                    <span className="text-sm font-medium">Correcciones</span>
                </NavLink>

                <NavLink to="/admin/asignaciones" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">library_books</span>
                    <span className="text-sm font-medium">Asignaciones</span>
                </NavLink>

                <NavLink to="/admin/students" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">group</span>
                    <span className="text-sm font-medium">Alumnos</span>
                </NavLink>
                
                <NavLink to="/admin/files" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">folder_open</span>
                    <span className="text-sm font-medium">Archivos</span>
                </NavLink>

                <NavLink to="/admin/builder/manual/new" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">edit_note</span>
                    <span className="text-sm font-medium">Constructor Manual</span>
                </NavLink>

                <NavLink to="/admin/builder/magic" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    <span className="text-sm font-medium">AI Flashcard Builder</span>
                </NavLink>

                <NavLink to="/admin/messages" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">forum</span>
                    <span className="text-sm font-medium">Mensajes</span>
                </NavLink>

                <NavLink to="/admin/calendar" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">calendar_month</span>
                    <span className="text-sm font-medium">Calendario</span>
                </NavLink>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800/50 flex flex-col gap-1">
                <a className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-200/50 dark:text-slate-500 dark:hover:bg-slate-800/50 dark:hover:text-slate-300 transition-all duration-200" href="#">
                    <span className="material-symbols-outlined text-[22px]">settings</span>
                    <span className="text-sm font-medium">Configuración</span>
                </a>
                <a 
                    className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-500 dark:hover:bg-red-900/10 dark:hover:text-red-400 transition-all duration-200" 
                    href="#"
                    onClick={handleSignOut}
                >
                    <span className="material-symbols-outlined text-[22px]">logout</span>
                    <span className="text-sm font-medium">Cerrar Sesión</span>
                </a>

                <div className="mt-4 flex items-center gap-3 px-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-light font-bold text-sm">
                        {initials}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                            {fullName}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Administrador</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
