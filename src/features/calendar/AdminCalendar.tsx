import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';

interface Student {
    id: string;
    full_name: string;
    level?: string;
}

interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    student_id: string;
    level: string;
    meeting_link?: string;
    is_video_call: boolean;
    student?: {
        full_name: string;
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

const LEVEL_BG_COLORS: Record<string, string> = {
    'A1': 'bg-blue-50 dark:bg-blue-900/20',
    'A2': 'bg-emerald-50 dark:bg-emerald-900/20',
    'B1': 'bg-amber-50 dark:bg-amber-900/20',
    'B2': 'bg-purple-50 dark:bg-purple-900/20',
    'C1': 'bg-rose-50 dark:bg-rose-900/20',
    'C2': 'bg-slate-50 dark:bg-slate-900/20',
    'Other': 'bg-slate-50 dark:bg-slate-900/10'
};

const TIME_OPTIONS = (() => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            opts.push({ value: time, label: time });
        }
    }
    return opts;
})();

export default function AdminCalendar() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Form states
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formStartTime, setFormStartTime] = useState('10:00');
    const [formEndTime, setFormEndTime] = useState('11:00');
    const [formStudentId, setFormStudentId] = useState('');
    const [formLevel, setFormLevel] = useState('A1');

    useEffect(() => {
        fetchEvents();
        fetchStudents();
    }, []);

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('calendar_events')
                .select('*, student:profiles!student_id(full_name)')
                .order('start_time', { ascending: true });
            
            if (error) throw error;
            setEvents(data || []);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, level')
            .eq('role', 'student');
        if (data) setStudents(data);
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !user) return;

        const start = new Date(selectedDate);
        const [startH, startM] = formStartTime.split(':').map(Number);
        start.setHours(startH, startM, 0, 0);

        const end = new Date(selectedDate);
        const [endH, endM] = formEndTime.split(':').map(Number);
        end.setHours(endH, endM, 0, 0);

        const eventData = {
            title: formTitle,
            description: formDesc,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            student_id: formStudentId || null,
            level: formLevel,
            admin_id: user.id,
            meeting_link: editingEvent?.meeting_link || '',
            is_video_call: true
        };

        try {
            setErrorMsg(null);
            if (editingEvent) {
                const { error } = await supabase
                    .from('calendar_events')
                    .update(eventData)
                    .eq('id', editingEvent.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('calendar_events')
                    .insert([eventData]);
                if (error) throw error;
            }
            fetchEvents();
            closeModal();
        } catch (error: any) {
            console.error('Error saving event:', error);
            setErrorMsg(error.message || 'Error saving the appointment. Make sure the database table exists.');
            alert('Error: ' + (error.message || 'Could not save appointment.'));
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this appointment?')) return;
        try {
            const { error } = await supabase
                .from('calendar_events')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    const openModal = (event?: CalendarEvent) => {
        if (event) {
            setEditingEvent(event);
            setFormTitle(event.title);
            setFormDesc(event.description || '');
            const start = new Date(event.start_time);
            setFormStartTime(`${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`);
            const end = new Date(event.end_time);
            setFormEndTime(`${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`);
            setFormStudentId(event.student_id || '');
            setFormLevel(event?.level || 'A1');
        } else {
            setEditingEvent(null);
            setFormTitle('');
            setFormDesc('');
            setFormStartTime('10:00');
            setFormEndTime('11:00');
            setFormStudentId('');
            setFormLevel('A1');
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEvent(null);
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

    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`pad-${i}`} className="h-32 border-b border-r border-slate-100 dark:border-slate-800/50 bg-slate-50/30"></div>);
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
        const isToday = date.toDateString() === new Date().toDateString();
        const isSelected = selectedDate?.toDateString() === date.toDateString();
        const dayEvents = events.filter(e => new Date(e.start_time).toDateString() === date.toDateString());

        days.push(
            <div 
                key={d} 
                onClick={() => setSelectedDate(date)}
                className={`h-32 border-b border-r border-slate-100 dark:border-slate-800/50 p-2 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/30 ${isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : 'bg-white dark:bg-sidebar-dark'}`}
            >
                <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-bold ${isToday ? 'w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center' : 'text-slate-400'}`}>
                        {d}
                    </span>
                    {dayEvents.length > 0 && (
                        <span className="text-[10px] font-black text-primary uppercase tracking-tighter bg-primary/10 px-1 rounded">
                            {dayEvents.length} {dayEvents.length === 1 ? 'Class' : 'Classes'}
                        </span>
                    )}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map(e => (
                        <div 
                            key={e.id} 
                            className={`h-4 rounded px-1.5 flex items-center ${LEVEL_COLORS[e.level] || 'bg-slate-400'} shadow-sm border border-black/5 overflow-hidden`}
                        >
                            <span className="text-[7px] text-white font-black truncate leading-none uppercase">
                                {e.student?.full_name?.split(' ')[0] || 'Class'}
                            </span>
                        </div>
                    ))}
                    {dayEvents.length > 3 && (
                        <div className="text-[8px] text-slate-400 font-bold px-1 tracking-tighter uppercase">+ {dayEvents.length - 3} more</div>
                    )}
                </div>
            </div>
        );
    }

    const selectedDayEvents = events.filter(e => selectedDate && new Date(e.start_time).toDateString() === selectedDate.toDateString());

    return (
        <div className="w-full mx-auto p-6 md:p-10 lg:p-[50px] flex flex-col lg:flex-row gap-8 bg-background-light dark:bg-background-dark min-h-screen">
            {/* Left Column: Calendar Grid */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Academic Calendar</h1>
                        <p className="text-slate-500 mt-1">Manage your student appointments and class schedules.</p>
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

                <div className="bg-white dark:bg-sidebar-dark rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
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

                {/* Legend */}
                <div className="flex flex-wrap gap-4 px-2">
                    {Object.entries(LEVEL_COLORS).map(([level, color]) => (
                        <div key={level} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${color}`}></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{level}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column: Day Details */}
            <aside className="w-full lg:w-[400px] flex flex-col gap-6 pt-4 lg:pt-0">
                <div className="bg-white dark:bg-sidebar-dark rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-xl flex flex-col gap-6 sticky top-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Schedule for</p>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                {selectedDate?.toLocaleDateString('default', { day: 'numeric', month: 'long' })}
                            </h2>
                        </div>
                        <button 
                            onClick={() => openModal()}
                            className="size-12 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-all"
                        >
                            <span className="material-symbols-outlined font-bold">add</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <p className="text-xs font-bold uppercase tracking-widest">Loading agenda...</p>
                            </div>
                        ) : selectedDayEvents.length === 0 ? (
                            <div className="py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                <span className="material-symbols-outlined text-slate-200 dark:text-slate-800 text-5xl">event_busy</span>
                                <p className="text-slate-400 text-sm font-medium">No appointments scheduled for this day.</p>
                            </div>
                        ) : (
                            selectedDayEvents.map(event => (
                                <div 
                                    key={event.id}
                                    className={`group relative p-5 rounded-2xl border ${LEVEL_BG_COLORS[event.level]} border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer`}
                                    onClick={() => openModal(event)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${LEVEL_COLORS[event.level]} text-white uppercase tracking-widest shadow-sm`}>
                                                {event.level}
                                            </span>
                                            <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                                {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteEvent(event.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 transition-all rounded-lg hover:bg-white"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                    <h4 className="font-black text-slate-900 dark:text-white mb-1 leading-tight">{event.title}</h4>
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-[16px]">person</span>
                                        <span className="text-xs font-bold">{event.student?.full_name || 'Guest Student'}</span>
                                    </div>
                                    {event.description && (
                                        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">{event.description}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Upcoming Sessions Section */}
                <div className="bg-white dark:bg-sidebar-dark rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-xl flex flex-col gap-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Coming Up Next</p>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Upcoming Sessions</h2>
                    </div>

                    <div className="flex flex-col gap-3">
                        {events.filter(e => new Date(e.start_time) > new Date()).slice(0, 5).length === 0 ? (
                            <p className="text-slate-400 text-xs text-center py-4 italic">No upcoming sessions found.</p>
                        ) : (
                            events.filter(e => new Date(e.start_time) > new Date()).slice(0, 5).map(event => (
                                <div 
                                    key={event.id}
                                    onClick={() => {
                                        setSelectedDate(new Date(event.start_time));
                                        setCurrentDate(new Date(event.start_time));
                                    }}
                                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                                >
                                    <div className={`w-1 h-8 rounded-full ${LEVEL_COLORS[event.level]}`}></div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">{event.title}</h5>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            {new Date(event.start_time).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </aside>

            {/* Modal for Add/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closeModal} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-sidebar-dark rounded-[40px] shadow-2xl overflow-hidden animate-ios-pop">
                        <div className="p-10">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                                {editingEvent ? 'Edit Appointment' : 'Schedule Appointment'}
                            </h2>
                            <p className="text-slate-500 text-sm mb-4 font-medium">Plan the learning session for your students.</p>

                            {errorMsg && (
                                <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold animate-shake">
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleSaveEvent} className="flex flex-col gap-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Start Time</label>
                                        <Select 
                                            value={formStartTime} 
                                            onChange={(e) => setFormStartTime(e.target.value)}
                                            options={TIME_OPTIONS}
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">End Time</label>
                                        <Select 
                                            value={formEndTime} 
                                            onChange={(e) => setFormEndTime(e.target.value)}
                                            options={TIME_OPTIONS}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Level</label>
                                    <Select
                                        value={formLevel}
                                        onChange={(e) => {
                                            setFormLevel(e.target.value);
                                            // Reset student when level changes to avoid mismatch
                                            setFormStudentId('');
                                        }}
                                        options={[
                                            { value: 'A1', label: 'A1 - Beginner' },
                                            { value: 'A2', label: 'A2 - Elementary' },
                                            { value: 'B1', label: 'B1 - Intermediate' },
                                            { value: 'B2', label: 'B2 - Upper Intermediate' },
                                            { value: 'C1', label: 'C1 - Advanced' },
                                            { value: 'C2', label: 'C2 - Mastery' },
                                        ]}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Select Student ({formLevel})</label>
                                    <Select 
                                        value={formStudentId}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const student = students.find(s => s.id === val);
                                            setFormStudentId(val);
                                            if (student?.level) setFormLevel(student.level);
                                        }}
                                        options={students
                                            .filter(s => s.level === formLevel)
                                            .map(s => ({ value: s.id, label: s.full_name }))
                                        }
                                        placeholder={students.filter(s => s.level === formLevel).length > 0 ? "Choose a student..." : "No students in this level"}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Class Type / Level</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(LEVEL_COLORS).map(level => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setFormLevel(level)}
                                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${formLevel === level ? `${LEVEL_COLORS[level]} text-white border-transparent shadow-lg shadow-${level.toLowerCase()}-500/30` : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Session Goal</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Speaking Practice: Travel Vocabulary"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        className="h-12 px-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none" 
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Session Details</label>
                                    <textarea 
                                        placeholder="Additional notes for this class..."
                                        value={formDesc}
                                        onChange={(e) => setFormDesc(e.target.value)}
                                        className="h-24 p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 mt-4">
                                    <Button type="button" variant="ghost" onClick={closeModal} className="flex-1 rounded-2xl h-14 font-black">Cancel</Button>
                                    <Button type="submit" className="flex-1 rounded-2xl h-14 font-black shadow-xl shadow-primary/20">
                                        {editingEvent ? 'Save Changes' : 'Confirm Class'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
