import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { logUserActivity } from '../../utils/activityLogger';

interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    level: string;
    is_video_call?: boolean;
}

interface Assignment {
    id: string;
    status: string;
    assigned_at: string;
    available_at: string;
    due_at: string | null;
    completed_at: string | null;
    lesson_id: string;
    lesson: {
        id: string;
        title: string;
        language_level: string;
        category: string;
        lesson_type: string;
    };
}

interface RoadmapItem {
    id: string;
    type: 'exercise' | 'class';
    title: string;
    date: Date;
    startDate?: Date;
    endDate?: Date;
    status: 'green' | 'yellow' | 'red' | 'gray';
    category?: string;
    metadata?: any;
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

const STATUS_CHRONO_COLORS: Record<string, string> = {
    'green': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
    'yellow': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50',
    'red': 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200/50',
    'gray': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/50'
};

export default function StudentCalendar() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
    const [loading, setLoading] = useState(true);

    const handleStartTask = async (item: RoadmapItem) => {
        if (!item.metadata) return;
        
        if (user) {
            await logUserActivity(user.id, 'assignment', `Started assignment: ${item.title}`);
        }

        const assignment = item.metadata as Assignment;
        const lesson = assignment.lesson;

        if (lesson.lesson_type === 'writing' || lesson.category?.toLowerCase() === 'writing') {
            navigate(`/student/writing/${lesson.id}`);
        } else {
            navigate(`/student/exercises/${lesson.id}`);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user, currentDate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            // Fetch group classes for the student's group
            const { data: profile } = await supabase
                .from('profiles')
                .select('group_id')
                .eq('id', user?.id)
                .single();

            let groupEvents: CalendarEvent[] = [];
            if (profile?.group_id) {
                const { data } = await supabase
                    .from('events')
                    .select('*')
                    .eq('group_id', profile.group_id)
                    .gte('start_time', startOfMonth.toISOString())
                    .lte('start_time', endOfMonth.toISOString());
                
                if (data) groupEvents = data;
            }

            // Fetch private classes for the student
            const { data: privateEvents } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('student_id', user?.id)
                .gte('start_time', startOfMonth.toISOString())
                .lte('start_time', endOfMonth.toISOString());

            setEvents([...groupEvents, ...(privateEvents || [])]);

            // Fetch assignments for the roadmap
            const { data: assignments } = await supabase
                .from('assignments')
                .select('*, lesson:lessons(*)')
                .eq('student_id', user?.id)
                .order('assigned_at', { ascending: false });

            const now = new Date();
            const combined: RoadmapItem[] = (assignments || []).map(asgn => {
                const avail = new Date(asgn.available_at);
                const due = asgn.due_at ? new Date(asgn.due_at) : null;
                const completed = asgn.completed_at ? new Date(asgn.completed_at) : null;

                let status: RoadmapItem['status'] = 'yellow';
                if (completed) status = 'green';
                else if (due && now > due) status = 'red';
                else if (now < avail) status = 'gray';

                return {
                    id: asgn.id,
                    type: 'exercise',
                    title: asgn.lesson.title,
                    date: avail,
                    startDate: avail,
                    endDate: due || avail,
                    status,
                    category: asgn.lesson.category,
                    metadata: asgn
                };
            });

            // Sort logic: Vencidos -> Disponibles -> Pronto -> Completados
            const statusOrder = { 'red': 0, 'yellow': 1, 'gray': 2, 'green': 3 };
            
            setRoadmapItems(combined.sort((a, b) => {
                if (statusOrder[a.status] !== statusOrder[b.status]) {
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                return a.date.getTime() - b.date.getTime();
            }));

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calendar helper functions
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const days = [];
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`pad-${i}`} className="h-28 border-b border-r border-slate-100 dark:border-slate-800/50 bg-slate-50/30"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
        const isToday = date.toDateString() === new Date().toDateString();
        const dayEvents = events.filter(e => new Date(e.start_time).toDateString() === date.toDateString());
        const hasVideoCall = dayEvents.some(e => e.is_video_call);
        
        // Find active roadmap ranges for this day
        const activeRanges = roadmapItems.filter(item => {
            if (!item.startDate || !item.endDate) return false;
            const start = new Date(item.startDate); start.setHours(0,0,0,0);
            const end = new Date(item.endDate); end.setHours(23,59,59,999);
            return date >= start && date <= end;
        }).slice(0, 2);

        days.push(
            <div 
                key={d} 
                className={`h-28 border-b border-r border-slate-100 dark:border-slate-800/50 p-1 md:p-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/30 bg-white dark:bg-sidebar-dark`}
            >
                <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-bold ${isToday ? 'w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center' : 'text-slate-400'}`}>
                        {d}
                    </span>
                    {dayEvents.length > 0 && (
                        <div className="flex gap-1">
                            {dayEvents.slice(0, 3).map((e, idx) => (
                                <div key={idx} className={`w-2.5 h-2.5 rounded-full ${LEVEL_COLORS[e.level] || 'bg-slate-400'} shadow-sm`}></div>
                            ))}
                        </div>
                    )}
                </div>

                {hasVideoCall && (
                    <div className="mb-2 px-1">
                        <div className="bg-red-500 text-white text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse shadow-sm">
                            <span className="material-symbols-outlined text-[10px]">videocam</span>
                            <span>Call with Tutor</span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-1.5 mb-2 -mx-1 md:-mx-2">
                    {activeRanges.map((range) => {
                        const isStart = new Date(range.startDate!).toDateString() === date.toDateString();
                        const isEnd = new Date(range.endDate!).toDateString() === date.toDateString();
                        const colorClass = STATUS_CHRONO_COLORS[range.status] || STATUS_CHRONO_COLORS.gray;
                        
                        return (
                            <div 
                                key={range.id}
                                className={`h-6 text-[10px] md:text-[11px] font-black uppercase px-3 flex items-center truncate border-y border-x-0 ${colorClass} ${isStart ? 'rounded-l-full border-l ml-1 md:ml-2' : ''} ${isEnd ? 'rounded-r-full border-r mr-1 md:mr-2' : ''} leading-none transition-all duration-300 hover:z-10 hover:scale-[1.02] shadow-sm`}
                                title={range.title}
                            >
                                {isStart && range.title}
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-1 overflow-hidden mt-1 px-1">
                    {dayEvents.slice(0, 1).map(e => (
                        <div key={e.id} className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate leading-tight">
                            {new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    ))}
                    {dayEvents.length > 1 && (
                        <div className="text-[8px] text-primary font-black uppercase tracking-tighter">
                            + {dayEvents.length - 1} more
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto p-6 md:p-10 lg:p-[50px] flex flex-col gap-10 min-h-screen">
            {/* Calendar Section Box */}
            <div className="w-full bg-slate-50/20 dark:bg-slate-900/40 backdrop-blur-xl rounded-[48px] border border-slate-200 dark:border-slate-800 p-8 md:p-10 shadow-[0_0_50px_0_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-primary/5">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Your Schedule</h1>
                            <p className="text-slate-500 mt-1">View and track your upcoming learning sessions.</p>
                        </div>
                        
                        <div className="flex items-center bg-white dark:bg-sidebar-dark rounded-2xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <div className="px-6 text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest min-w-[160px] text-center">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </div>
                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-sidebar-dark rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-[0_0_30px_0_rgba(0,0,0,0.04)] overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {days}
                        </div>
                    </div>
                </div>
            </div>

            {/* Learning Path Section Box */}
            <div className="w-full bg-slate-50/20 dark:bg-slate-900/40 backdrop-blur-xl rounded-[48px] border border-slate-200 dark:border-slate-800 p-8 md:p-10 md:pb-8 pb-6 shadow-[0_0_50px_0_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-primary/5">
                <div className="flex items-center justify-between mb-12">
                    <div className="flex flex-col gap-1.5">
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase italic">Your Learning Path</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest pl-1 border-l-4 border-primary/20">Cronología personalizada de tus objetivos y logros</p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-xs font-black uppercase tracking-widest animate-pulse">Cargando...</p>
                    </div>
                ) : roadmapItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 items-start">
                        {['yellow', 'gray', 'green', 'red'].map((statusFilter) => {
                            const allItems = roadmapItems.filter(i => i.status === statusFilter);
                            const items = allItems.slice(0, 3);
                            
                            const sectionTitle = 
                                statusFilter === 'yellow' ? 'Activo' :
                                statusFilter === 'gray' ? 'Futuro' :
                                statusFilter === 'green' ? 'Completado' : 'Vencido';
                            
                            const sectionColor = 
                                statusFilter === 'yellow' ? 'border-amber-400 text-amber-500 bg-amber-500/5' :
                                statusFilter === 'gray' ? 'border-slate-300 text-slate-500 bg-slate-500/5' :
                                statusFilter === 'green' ? 'border-green-500 text-green-600 bg-green-500/5' : 'border-red-500 text-red-500 bg-red-500/5';

                            return (
                                <div key={statusFilter} className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700 relative group/col">
                                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] px-4 py-2 border-l-4 rounded-r-xl ${sectionColor} flex items-center justify-between shadow-sm`}>
                                        {sectionTitle}
                                        <span className="text-[10px] bg-white dark:bg-slate-800 text-slate-500 size-5 flex items-center justify-center rounded-full shadow-inner">{allItems.length}</span>
                                    </h3>
                                                                    <div className="flex flex-col gap-5 relative pb-14">
                                    {items.length === 0 ? (
                                        <div className="text-center p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700 italic">
                                            Vacío
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-5">
                                            {items.map((item) => (
                                                <div 
                                                    key={item.id} 
                                                    className={`bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 group/card flex flex-col gap-3 relative`}
                                                >
                                                    
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className={`size-8 rounded-full flex items-center justify-center shrink-0 shadow-inner ${
                                                            item.status === 'green' ? 'bg-green-100 text-green-600' :
                                                            item.status === 'yellow' ? 'bg-amber-100 text-amber-500' :
                                                            item.status === 'red' ? 'bg-red-100 text-red-500' :
                                                            'bg-slate-100 text-slate-400'
                                                        }`}>
                                                            <span className="material-symbols-outlined text-[16px] font-black">
                                                                {item.status === 'green' ? 'check' : 
                                                                 item.status === 'red' ? 'error' : 'assignment'}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider tabular-nums">
                                                            {item.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest w-fit px-2 py-0.5 rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900/20`}>
                                                            {item.category || 'Assignment'}
                                                        </span>
                                                        <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight line-clamp-2 uppercase tracking-tight">
                                                            {item.title}
                                                        </h3>
                                                    </div>

                                                    <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                        {item.status === 'yellow' && (
                                                            <Button 
                                                                variant="primary" 
                                                                size="sm" 
                                                                className="w-full rounded-xl text-[10px] font-black uppercase tracking-[0.1em] h-10 shadow-lg shadow-primary/20 group-hover/card:scale-[1.02] transition-transform"
                                                                onClick={() => handleStartTask(item)}
                                                            >
                                                                Realizar ahora
                                                            </Button>
                                                        )}
                                                        {item.status === 'red' && (
                                                            <Button 
                                                                variant="primary" 
                                                                size="sm" 
                                                                className="w-full rounded-xl text-[10px] font-black uppercase tracking-[0.1em] h-10 shadow-lg shadow-primary/20 group-hover/card:scale-[1.02] transition-transform"
                                                                onClick={() => handleStartTask(item)}
                                                            >
                                                                Realizar atrasado
                                                            </Button>
                                                        )}
                                                        {item.status === 'green' && (
                                                            <Button 
                                                                variant="secondary" 
                                                                size="sm" 
                                                                className="w-full rounded-xl text-[10px] font-black uppercase tracking-[0.1em] h-10 bg-green-50 text-green-600 border-green-200 group-hover/card:bg-green-100 transition-colors"
                                                                onClick={() => {
                                                                    const assignment = item.metadata as Assignment;
                                                                    const path = assignment.lesson.lesson_type === 'writing' || assignment.lesson.category?.toLowerCase() === 'writing' 
                                                                        ? `/student/writing/${assignment.lesson.id}?review=true`
                                                                        : `/student/exercises/${assignment.lesson.id}?review=true`;
                                                                    navigate(path);
                                                                }}
                                                            >
                                                                Ver Resultados
                                                            </Button>
                                                        )}
                                                        {item.status === 'gray' && (
                                                            <div className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 py-3 rounded-xl border border-slate-100 shadow-inner">
                                                                Disponible pronto
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Column Bottom Fade - Much smoother and taller */}
                                    {allItems.length > 3 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-sidebar-dark via-white/80 dark:via-sidebar-dark/80 to-transparent pointer-events-none z-10" />
                                    )}
                                </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="w-full rounded-[40px] border-4 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 min-h-[340px] flex flex-col items-center justify-center p-12 text-center group transition-all hover:bg-white hover:shadow-2xl hover:border-transparent dark:hover:bg-sidebar-dark">
                        <div className="w-24 h-24 bg-white dark:bg-sidebar-dark rounded-[32px] flex items-center justify-center shadow-xl mb-6 group-hover:scale-110 transition-transform duration-500 border border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800">timeline</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 leading-tight uppercase tracking-tight">Your customized path is being prepared</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8 font-medium">
                            Our AI is currently analyzing your level and goals to generate the perfect learning sequence for you.
                        </p>
                        <Button variant="secondary" className="bg-white dark:bg-sidebar-dark border-2 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl px-10 h-14 font-black shadow-lg">
                            Browse Modules
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
