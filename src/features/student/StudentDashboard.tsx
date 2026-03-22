import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '../../components/shared/MetricCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ProgressData {
    total_xp: number;
    day_streak: number;
    words_learned_count: number;
}

interface UserProfile {
    full_name: string;
}

interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    level: string;
    meeting_link?: string;
    is_video_call: boolean;
    status: string;
}

interface Assignment {
    id: string;
    status: string;
    assigned_at: string;
    available_at: string;
    due_at: string | null;
    lesson_id: string;
    lesson: {
        id: string;
        title: string;
        level: string;
        category: string;
        lesson_type: string;
    };
}


const LEVEL_COLORS: Record<string, string> = {
    'A1': 'bg-blue-500',
    'A2': 'bg-emerald-500',
    'B1': 'bg-amber-500',
    'B2': 'bg-purple-500',
    'C1': 'bg-rose-500',
    'C2': 'bg-slate-700',
    'Other': 'bg-slate-400'
};

export default function StudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [nextCall, setNextCall] = useState<CalendarEvent | null>(null);
    const [nextTask, setNextTask] = useState<Assignment | null>(null);
    const [upcomingClasses, setUpcomingClasses] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [user]);




    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();

            if (profileData) setProfile(profileData);

            // Fetch progress
            const { data: progressData } = await supabase
                .from('user_progress')
                .select('total_xp, day_streak, words_learned_count')
                .eq('user_id', user.id)
                .single();

            if (progressData) setProgress(progressData);

            // Fetch next live call (including those already started but not finished)
            const dashboardNow = new Date();
            const dashboardBufferStart = new Date(dashboardNow.getTime() + (30 * 60 * 1000)).toISOString();

            const { data: callData } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('student_id', user.id)
                .eq('is_video_call', true)
                .lte('start_time', dashboardBufferStart)
                .gte('end_time', dashboardNow.toISOString())
                .order('start_time', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (callData) setNextCall(callData);

            // Fetch upcoming non-video classes (the "schedule")
            const { data: scheduleData } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('student_id', user.id)
                .eq('is_video_call', false)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(3);

            if (scheduleData) setUpcomingClasses(scheduleData);

            // Fetch next pending assignment
            const { data: taskData } = await supabase
                .from('assignments')
                .select('id, assigned_at, due_at, lesson:lessons(title, level)')
                .eq('student_id', user.id)
                .eq('status', 'pending')
                .order('assigned_at', { ascending: false });

            const now = new Date();
            // Filter out overdue assignments from next task
            const validTask = taskData?.find(t => !t.due_at || new Date(t.due_at) > now);

            if (validTask) setNextTask(validTask as any);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-[1200px] w-full mx-auto p-8 lg:p-12 animate-pulse">
                <div className="h-4 w-32 bg-slate-200 rounded mb-10"></div>
                <div className="flex justify-between items-end mb-10">
                    <div className="space-y-4">
                        <div className="h-10 w-80 bg-slate-200 rounded-lg"></div>
                        <div className="h-4 w-64 bg-slate-100 rounded"></div>
                    </div>
                    <div className="h-14 w-48 bg-slate-200 rounded-2xl"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-slate-50 border border-slate-100 rounded-xl"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="h-80 bg-slate-50 border border-slate-100 rounded-[32px]"></div>
                    <div className="h-80 bg-slate-50 border border-slate-100 rounded-[32px]"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] w-full mx-auto p-8 lg:p-12 pb-24 flex flex-col gap-10">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-slate-500">
                <a className="hover:text-primary transition-colors" href="#">Inicio</a>
                <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">Panel</span>
            </nav>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2 leading-tight">
                        Bienvenido de nuevo, {profile?.full_name || 'Estudiante'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-lg text-lg font-medium">Has completado el 8% de tu objetivo semanal. ¡Sigue así!</p>
                </div>

                <Button
                    variant="primary"
                    size="lg"
                    icon={<span className="material-symbols-outlined">play_circle</span>}
                    className="rounded-2xl shadow-xl shadow-primary/20 h-14 px-8"
                    onClick={() => navigate('/student/asignaciones')}
                >
                    Continuar Asignación
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total XP"
                    value={progress?.total_xp.toLocaleString() || "0"}
                    icon="bolt"
                    iconBgClass="bg-yellow-100 dark:bg-yellow-900/20"
                    iconTextClass="text-yellow-600 dark:text-yellow-400"
                />
                <MetricCard
                    title="Racha de días"
                    value={progress?.day_streak.toString() || "0"}
                    icon="local_fire_department"
                    iconBgClass="bg-orange-100 dark:bg-orange-900/20"
                    iconTextClass="text-orange-600 dark:text-orange-400"
                />
                <MetricCard
                    title="Palabras aprendidas"
                    value={progress?.words_learned_count.toString() || "0"}
                    icon="auto_stories"
                    iconBgClass="bg-green-100 dark:bg-green-900/20"
                    iconTextClass="text-green-600 dark:text-green-400"
                />
            </div>


            {/* Live Sessions Split Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
                {/* Left Half: Next Call with Tutor */}
                <div className="flex flex-col gap-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
                            <span className="material-symbols-outlined text-primary text-[24px]">videocam</span>
                        </div>
                        Próxima videollamada
                    </h2>

                    {nextCall ? (
                        <div className="flex-1 bg-white dark:bg-sidebar-dark rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col justify-between group overflow-hidden relative min-h-[300px]">
                            {/* Blue expanding circle on hover */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 transition-all duration-700 group-hover:scale-[3] group-hover:bg-primary/10"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border border-primary/10">
                                        Sesión de Zoom
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        {new Date(nextCall.start_time).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(nextCall.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 leading-tight uppercase tracking-tight">
                                    {nextCall.title}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium italic border-l-4 border-primary/20 pl-4 py-1 line-clamp-2">
                                    {nextCall.description || 'Te espera una sesión productiva con tu tutor.'}
                                </p>
                            </div>

                            <div className="flex items-center gap-4 relative z-10">
                                <Button
                                    variant="primary"
                                    icon={<span className="material-symbols-outlined text-[20px]">video_camera_front</span>}
                                    className="flex-1 rounded-2xl h-14 font-black shadow-lg shadow-primary/20"
                                    onClick={() => {
                                        if (nextCall.meeting_link) {
                                            window.open(nextCall.meeting_link, '_blank');
                                        } else {
                                            // Handle automatic ID join
                                            // We can't easily trigger the sibling FloatingCallManager state here, 
                                            // but we can provide the same deterministic link logic.
                                            // Or better: just alert the user to use the floating button.
                                            // Since the floating button is sticky and always there when a call is active.
                                            const hash = (uuid: string) => {
                                                let h = 0;
                                                for (let i = 0; i < uuid.length; i++) h = ((h << 5) - h) + uuid.charCodeAt(i);
                                                return (Math.abs(h & h) % 9000000000 + 1000000000).toString();
                                            };
                                            const autoId = hash(user?.id || '');
                                            window.open(`https://zoom.us/wc/join/${autoId}?prefer=1&un=${encodeURIComponent(profile?.full_name || 'Student')}`, '_blank');
                                        }
                                    }}
                                >
                                    Unirse a la reunión
                                </Button>
                                <button
                                    className="size-14 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-sidebar-dark text-slate-400 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all group/copy shadow-sm"
                                    title="Copy meeting link"
                                    onClick={() => nextCall.meeting_link && navigator.clipboard.writeText(nextCall.meeting_link)}
                                >
                                    <span className="material-symbols-outlined group-hover/copy:scale-110 transition-transform">content_copy</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 bg-white dark:bg-sidebar-dark rounded-[32px] p-12 text-center border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center gap-4 min-h-[300px]">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-slate-200 dark:text-slate-700 text-4xl">videocam_off</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">Sin videollamadas próximas</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-[240px] leading-relaxed">
                                    Tu tutor programará una videollamada pronto.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Half: Coming Up Next (Schedule & Tasks) */}
                <div className="flex flex-col gap-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                        <div className="size-12 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/10">
                            <span className="material-symbols-outlined text-orange-500 text-[24px]">task</span>
                        </div>
                        Próximas tareas
                    </h2>

                    <div className="flex-1 bg-white dark:bg-sidebar-dark rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col gap-6 group overflow-hidden relative min-h-[300px]">
                        {/* Orange expanding circle on hover */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full -mr-16 -mt-16 transition-all duration-700 group-hover:scale-[3] group-hover:bg-orange-500/10"></div>

                        <div className="relative z-10 flex flex-col gap-6 h-full">
                            {/* Next Task Highlight */}
                            {nextTask && (
                                <div className="bg-orange-500/5 dark:bg-orange-500/10 p-5 rounded-[24px] border border-orange-500/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="bg-orange-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Siguiente Tarea</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                            {new Date(nextTask.assigned_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">
                                        {nextTask.lesson.title}
                                    </h4>
                                    <Button
                                        variant="secondary"
                                        className="w-full bg-white dark:bg-sidebar-dark border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-xs h-10"
                                        onClick={() => navigate(`/student/exercises/${nextTask.id}`)}
                                    >
                                        Continuar Tarea
                                    </Button>
                                </div>
                            )}

                            {/* Schedule List (Upcoming appointments) */}
                            <div className="flex flex-col gap-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 mb-1">Próximas Clases</p>
                                {upcomingClasses.length > 0 ? (
                                    upcomingClasses.map(event => (
                                        <div key={event.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800 bg-white/50 dark:bg-sidebar-dark/50 backdrop-blur-sm">
                                            <div className={`w-1.5 h-8 rounded-full ${LEVEL_COLORS[event.level] || 'bg-slate-200'}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{event.title}</h5>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                    {new Date(event.start_time).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-300 text-[18px]">chevron_right</span>
                                        </div>
                                    ))
                                ) : !nextTask && (
                                    <div className="py-8 flex flex-col items-center justify-center text-center gap-3 opacity-60">
                                        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-slate-200 dark:text-slate-700 text-3xl">event_available</span>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay clases programadas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
