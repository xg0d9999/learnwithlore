import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';


interface ActivityLog {
    id: string;
    action_type: string;
    action_details: string;
    ip_address: string;
    location: string;
    device: string;
    browser: string;
    created_at: string;
}

interface StudentLogsModalProps {
    studentId: string;
    studentName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function StudentLogsModal({ studentId, studentName, isOpen, onClose }: StudentLogsModalProps) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [isClosing, setIsClosing] = useState(false);
    const [renderBg, setRenderBg] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
            setTimeout(() => setRenderBg(true), 10);
        } else if (shouldRender) {
            setRenderBg(false);
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!shouldRender || isClosing) return;

        const fetchLogs = async () => {
            setLoading(true);
            try {
                let query = supabase
                    .from('user_activity_logs')
                    .select('*')
                    .eq('user_id', studentId)
                    .order('created_at', { ascending: false });

                if (filter !== 'all') {
                    query = query.eq('action_type', filter);
                }

                const { data, error } = await query;
                if (error) throw error;
                setLogs(data || []);
            } catch (err) {
                console.error('Failed to fetch activity logs:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [studentId, isOpen, filter]);

    const handleClose = () => {
        onClose();
    };

    if (!shouldRender) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex justify-end transition-all duration-300 ease-in-out ${renderBg ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'}`}>
            <div className="absolute inset-0" onClick={handleClose}></div>
            <div className={`relative bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${renderBg ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">manage_search</span>
                            Activity Logs
                        </h2>
                        <span className="text-sm font-bold text-slate-400">Monitoring {studentName}</span>
                    </div>
                    <button 
                        onClick={handleClose} 
                        className="size-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2 overflow-x-auto hide-scrollbar">
                    {['all', 'auth', 'assignment', 'profile', 'system'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                filter === type 
                                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                                    : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20 flex flex-col items-center gap-3">
                            <span className="material-symbols-outlined text-5xl text-slate-300">visibility_off</span>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No logs found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div key={log.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-10 rounded-xl flex items-center justify-center ${
                                                log.action_type === 'auth' ? 'bg-blue-50 text-blue-500' :
                                                log.action_type === 'assignment' ? 'bg-amber-50 text-amber-500' :
                                                log.action_type === 'profile' ? 'bg-emerald-50 text-emerald-500' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {log.action_type === 'auth' ? 'login' :
                                                     log.action_type === 'assignment' ? 'assignment_turned_in' :
                                                     log.action_type === 'profile' ? 'manage_accounts' :
                                                     'settings'}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-base">{log.action_type.toUpperCase()}</h4>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-slate-700 font-medium mb-4 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        {log.action_details}
                                    </p>

                                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
                                            <span className="truncate">{log.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className="material-symbols-outlined text-[14px] text-slate-400">router</span>
                                            <span className="truncate">{log.ip_address}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className="material-symbols-outlined text-[14px] text-slate-400">devices</span>
                                            <span className="truncate" title={log.device}>{log.device}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className="material-symbols-outlined text-[14px] text-slate-400">language</span>
                                            <span className="truncate" title={log.browser}>{log.browser}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
