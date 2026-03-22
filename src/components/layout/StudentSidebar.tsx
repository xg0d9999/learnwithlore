import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface StudentSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function StudentSidebar({ isOpen, onClose }: StudentSidebarProps) {
    const { user, signOut } = useAuth();
    const [isPremium, setIsPremium] = useState<boolean>(false);

    useEffect(() => {
        if (!user) return;
        const fetchPremiumStatus = async () => {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', user.id)
                    .single();
                if (data) setIsPremium(data.is_premium);
            } catch (error) {
                console.error('Error fetching premium status for sidebar:', error);
            }
        };
        fetchPremiumStatus();
    }, [user]);

    const handleSignOut = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const fullName = user?.user_metadata?.full_name || 'Estudiante';
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
            ? 'bg-primary/10 text-primary dark:bg-primary/20'
            : 'text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
        }`;

    return (
        <aside 
            className={`fixed inset-y-0 left-0 z-50 w-72 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-sidebar-light dark:bg-sidebar-dark transition-all duration-300 transform lg:static lg:translate-x-0 ${
                isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
            }`}
        >
            <div className="h-20 flex items-center justify-between px-6 border-b border-transparent dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-[24px]">translate</span>
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
                <NavLink to="/student/dashboard" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined filled">dashboard</span>
                    <span className="text-sm font-medium">Inicio</span>
                </NavLink>

                <NavLink to="/student/asignaciones" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">menu_book</span>
                    <span className="text-sm font-medium">Mis Asignaciones</span>
                </NavLink>

                <NavLink to="/student/writing" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">edit_note</span>
                    <span className="text-sm font-medium">Escritura</span>
                </NavLink>

                <NavLink to="/student/vocabulary" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">menu_book</span>
                    <span className="text-sm font-medium">Vocabulario</span>
                </NavLink>

                <NavLink to="/student/exercises" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">school</span>
                    <span className="text-sm font-medium">Ejercicios</span>
                </NavLink>

                <NavLink to="/student/flashcards" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined filled">style</span>
                    <span className="text-sm font-medium">Flashcards</span>
                </NavLink>

                <NavLink
                    to="/student/speaking"
                    onClick={() => window.innerWidth < 1024 && onClose?.()}
                    className={({ isActive }) =>
                        `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border border-transparent ${isActive
                            ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 border-amber-500/20'
                            : 'text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
                        }`
                    }
                >
                    <span className="material-symbols-outlined shrink-0 text-amber-500">record_voice_over</span>
                    <span className="text-sm font-medium flex-1">Speaking AI</span>
                    <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter shadow-sm shrink-0">PRO</span>
                </NavLink>

                <NavLink to="/student/messages" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span className="text-sm font-medium">Mensajes</span>
                </NavLink>

                <NavLink to="/student/calendar" className={navLinkClass} onClick={() => window.innerWidth < 1024 && onClose?.()}>
                    <span className="material-symbols-outlined">calendar_month</span>
                    <span className="text-sm font-medium">Calendario</span>
                </NavLink>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800/50 flex flex-col gap-1">
                <a className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-200/50 dark:text-slate-500 dark:hover:bg-slate-800/50 dark:hover:text-slate-300 transition-all duration-200" href="#">
                    <span className="material-symbols-outlined text-[22px]">settings</span>
                    <span className="text-sm font-medium">Ajustes</span>
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
                    <img 
                        alt="User Avatar" 
                        className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm" 
                        src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`} 
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                            {fullName}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md w-fit ${isPremium ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {isPremium ? 'Plan Premium' : 'Plan Gratuito'}
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
