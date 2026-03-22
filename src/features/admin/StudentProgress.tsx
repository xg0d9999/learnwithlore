import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../../lib/supabase';
import { Assignment, CalendarEvent, UserProfile, UserProgress } from '../../types';
import { StudentLogsModal } from './StudentLogsModal';
import { MetricCard } from '../../components/shared/MetricCard';

interface StudentData {
    profile: {
        id: string;
        full_name: string;
        avatar_url: string;
        level: string;
        learning_language: string;
        created_at: string;
    };
    progress: {
        total_xp: number;
        words_learned_count: number;
    } | null;
    assignments: any[];
    appointments: any[];
}

export default function StudentProgress() {
    const { id: studentId } = useParams();
    const [data, setData] = useState<StudentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isClosingModal, setIsClosingModal] = useState(false);
    const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!studentId) return;
            setLoading(true);
            try {
                // Fetch Profile & Progress
                const [profileRes, progressRes, assignmentsRes, eventsRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', studentId).single(),
                    supabase.from('user_progress').select('*').eq('user_id', studentId).single(),
                    supabase.from('assignments').select('*, lessons(*)').eq('student_id', studentId).order('assigned_at', { ascending: false }),
                    supabase.from('calendar_events').select('*').eq('student_id', studentId)
                ]);

                if (profileRes.error) throw profileRes.error;

                setData({
                    profile: profileRes.data,
                    progress: progressRes.data || null,
                    assignments: assignmentsRes.data || [],
                    appointments: eventsRes.data || [] // Mapping calendar_events to appointments key for minimal code change
                });
            } catch (err: any) {
                console.error('[StudentProgress] Fetch error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [studentId]);

    const closeDeleteModal = () => {
        setIsClosingModal(true);
        setTimeout(() => {
            setIsDeleteModalOpen(false);
            setIsClosingModal(false);
            setAssignmentToDelete(null);
        }, 200); // Wait for transition
    };

    const handleDeleteAssignment = async () => {
        if (!assignmentToDelete) return;
        try {
            await supabase.from('assignments').delete().eq('id', assignmentToDelete);
            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    assignments: prev.assignments.filter(a => a.id !== assignmentToDelete)
                };
            });
            closeDeleteModal();
        } catch (err) {
            console.error('Failed to delete assignment:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 gap-4 h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-slate-400 text-sm animate-pulse font-medium">Retrieving student academic history...</p>
            </div>
        );
    }

    if (!data || error) {
        return (
            <div className="p-12 text-center flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-red-400 text-5xl">person_off</span>
                <p className="text-slate-500 font-medium">We couldn't load this student's progress data.</p>
                <Link to="/admin/students">
                    <Button variant="secondary">Return to Student List</Button>
                </Link>
            </div>
        );
    }

    const { profile, progress, assignments, appointments } = data;

    // Metrics Calculation
    const completedAssignments = assignments.filter(a => a.status === 'completed');
    const avgScore = completedAssignments.length > 0
        ? Math.round(completedAssignments.reduce((acc, a) => acc + (a.score || 0), 0) / completedAssignments.length)
        : 0;

    const now = new Date();

    const totalTrackedEvents = appointments.length + assignments.filter(a => a.status === 'completed' || (a.due_at && new Date(a.due_at) < now)).length;
    const successfulEvents = appointments.filter(a => a.status === 'attended' || a.status === 'completed').length + assignments.filter(a => a.status === 'completed').length;
    
    const attendanceRate = totalTrackedEvents > 0
        ? Math.round((successfulEvents / totalTrackedEvents) * 100)
        : 100;

    const initials = profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'ST';
    
    // Do not include overdue in current focus
    const currentFocus = assignments.filter(a => 
        (a.status === 'in_progress' || a.status === 'pending') && 
        !(a.due_at && new Date(a.due_at) < now)
    ).slice(0, 2);

    // Dynamic Chart Logic: Activity (tasks completed) per 4-day period over last 32 days
    // Dynamic Chart Logic: Activity (tasks completed) per 4-day period over last 32 days
    const chartPointsCount = 8;
    const daysPerBucket = 4;
    const buckets = Array(chartPointsCount).fill(0);

    completedAssignments.forEach(a => {
        if (!a.completed_at) return;
        const compDate = new Date(a.completed_at);
        const diffMs = now.getTime() - compDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays >= 0 && diffDays < (chartPointsCount * daysPerBucket)) {
            const bucketIndex = (chartPointsCount - 1) - Math.floor(diffDays / daysPerBucket);
            if (bucketIndex >= 0) buckets[bucketIndex]++;
        }
    });

    // Translate buckets to SVG Path (ViewBox: 800 x 300)
    // X goes 0 to 800. Y goes 0 (top) to 250 (bottom line).
    // Max activity height: let's say 5 completions in 4 days = 0 Y.
    const maxVal = Math.max(...buckets, 1);
    const chartData = buckets.map((val, i) => ({
        x: i * (800 / (chartPointsCount - 1)),
        y: 250 - (val / (maxVal * 1.2)) * 225 // Scale to fit, leave room at top
    }));

    const pathD = `M${chartData.map(p => `${p.x},${p.y}`).join(' L')}`;
    const areaD = `${pathD} L800,250 L0,250 Z`;

    return (
        <div className="max-w-[1200px] mx-auto p-8 flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Link className="hover:text-primary transition-colors" to="/admin/dashboard">Home</Link>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <Link className="hover:text-primary transition-colors" to="/admin/students">Students</Link>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <span className="text-slate-900 font-medium">{profile.full_name}</span>
            </div>

            {/* Page Heading & Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    {profile.avatar_url ? (
                        <div
                            className="size-16 rounded-2xl bg-slate-200 bg-center bg-cover border-4 border-white shadow-md"
                            style={{ backgroundImage: `url(${profile.avatar_url})` }}
                        />
                    ) : (
                        <div className="size-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-black shadow-md">
                            {initials}
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{profile.full_name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/5">
                                {profile.level || 'A1'} — {profile.learning_language || 'English'}
                            </span>
                            <span className="text-slate-400 text-sm">•</span>
                            <span className="text-slate-500 text-sm">Enrolled {new Date(profile.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button 
                        variant="secondary" 
                        className="bg-white border-slate-200 shadow-sm text-slate-700" 
                        icon={<span className="material-symbols-outlined text-[18px]">manage_search</span>}
                        onClick={() => setIsLogsModalOpen(true)}
                    >
                        View Logs
                    </Button>
                    <Link to="/admin/students">
                        <Button variant="primary" className="bg-slate-900 hover:bg-black text-white" icon={<span className="material-symbols-outlined text-[18px]">manage_accounts</span>}>
                            Manage Student
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-display">
                <MetricCard
                    title="Total Experience"
                    value={`${progress?.total_xp || 0} XP`}
                    icon="trending_up"
                    trend={{ value: 12, isPositive: true, label: 'Academic wealth' }}
                    className="!bg-white shadow-sm"
                />
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-slate-500 text-sm font-medium">Attendance Rate</p>
                        <span className="material-symbols-outlined text-slate-400">check_circle</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{attendanceRate}%</p>
                    <div className="mt-2 text-xs text-slate-500 font-medium flex items-center gap-1">
                        <span className={`size-1.5 rounded-full ${attendanceRate > 80 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                        {attendanceRate > 80 ? 'Excellent consistency' : 'Attendance needs review'}
                    </div>
                </div>
                <MetricCard
                    title="Avg Quiz Score"
                    value={`${avgScore}/100`}
                    icon="quiz"
                    trend={{ value: 0, isPositive: true, label: 'Core proficiency' }}
                    className="!bg-white shadow-sm"
                />
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-slate-500 text-sm font-medium">Asignaciones Completadas</p>
                        <span className="material-symbols-outlined text-slate-400">school</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{completedAssignments.length}</p>
                    <div className="mt-2 text-xs text-slate-500 font-medium">
                        {assignments.length - completedAssignments.length} more in queue
                    </div>
                </div>
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full font-display bg-gradient-to-b from-white to-slate-50/30">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900">Current Focus</h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest">Active</span>
                        </div>
                        <div className="flex flex-col gap-6">
                            {currentFocus.length > 0 ? (
                                currentFocus.map((assign, i) => (
                                    <div key={i} className="flex flex-col gap-2 p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-primary/20 transition-all">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-900">{assign.lessons?.title}</span>
                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{assign.status.replace('_', ' ')}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: assign.status === 'in_progress' ? '45%' : '5%' }}></div>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-1 italic">{assign.lessons?.description}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 opacity-50">
                                    <span className="material-symbols-outlined text-4xl mb-2">hotel_class</span>
                                    <p className="text-sm font-medium">No urgent tasks assigned.</p>
                                </div>
                            )}

                            <div className="mt-auto pt-6 border-t border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Next Milestone</p>
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-100 border border-slate-200/50">
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <span className="material-symbols-outlined text-slate-400 text-[20px]">flag</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700">Progression Goal</span>
                                        <span className="text-xs text-slate-500">Reach {(progress?.total_xp || 0) + 1000} XP</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Real Activity Chart */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 h-full flex flex-col">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Actividad de Asignación</h2>
                                <p className="text-sm text-slate-500">Completadas en los últimos 30 días</p>
                            </div>
                            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                                <span className="px-4 py-1.5 text-xs font-bold bg-white text-slate-900 rounded-lg shadow-sm transition-all border border-slate-200">Activity Trend</span>
                            </div>
                        </div>
                        <div className="flex-1 min-h-[240px] w-full relative">
                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 300">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#0d59f2" stopOpacity="0.15" />
                                        <stop offset="100%" stopColor="#0d59f2" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <line stroke="#f1f5f9" x1="0" y1="250" x2="800" y2="250" strokeWidth="2" />
                                <line stroke="#f1f5f9" x1="0" y1="175" x2="800" y2="175" strokeWidth="1" strokeDasharray="5,5" />
                                <line stroke="#f1f5f9" x1="0" y1="100" x2="800" y2="100" strokeWidth="1" strokeDasharray="5,5" />

                                <path d={areaD} fill="url(#chartGradient)" className="transition-all duration-1000" />
                                <path d={pathD} fill="none" stroke="#0d59f2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-1000" />

                                {chartData.map((p, i) => (
                                    <g key={i} className="group/dot">
                                        <circle cx={p.x} cy={p.y} r="6" fill="white" stroke="#0d59f2" strokeWidth="3" className="transition-all hover:r-8 cursor-pointer" />
                                        <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] font-black fill-slate-900 opacity-0 group-hover/dot:opacity-100 transition-opacity">
                                            {buckets[i]}
                                        </text>
                                    </g>
                                ))}
                            </svg>
                        </div>
                        <div className="flex justify-between mt-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>-30 Days</span>
                            <span>-15 Days</span>
                            <span>Today</span>
                        </div>
                    </div>
                </div>
            </div>

            <section className="flex flex-col gap-6 pb-12">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 border-l-4 border-primary pl-4">Academic Roadmap</h2>
                </div>

                {assignments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assignments.map((assign) => {
                            const availableAt = assign.available_at ? new Date(assign.available_at) : new Date(assign.assigned_at);
                            const isOverdue = assign.status !== 'completed' && assign.due_at && new Date(assign.due_at) < now;
                            const isActive = assign.status !== 'completed' && now >= availableAt;
                            
                            const statusColor = assign.status === 'completed' ? 'bg-green-500' : isOverdue ? 'bg-red-500' : isActive ? 'bg-amber-500' : 'bg-slate-300';
                            
                            return (
                                <div key={assign.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor}`}></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{assign.lessons?.lesson_type || 'General'}</span>
                                            <p className="font-bold text-slate-900 text-lg leading-tight group-hover:pr-8 transition-all">{assign.lessons?.title}</p>
                                        </div>
                                        <div className={`size-8 rounded-xl flex items-center justify-center transition-all ${assign.status === 'completed' ? 'bg-green-500 text-white shadow-lg shadow-green-200' : isOverdue ? 'bg-red-50 text-red-500 border border-red-200' : isActive ? 'bg-amber-50 text-amber-500 border border-amber-200' : 'bg-slate-50 text-slate-300 border border-slate-200'}`}>
                                            <span className="material-symbols-outlined text-[20px]">{assign.status === 'completed' ? 'verified' : isOverdue ? 'error' : isActive ? 'assignment' : 'hourglass_top'}</span>
                                        </div>
                                        
                                        {/* Hover Trash Button */}
                                        <button 
                                            onClick={() => {
                                                setAssignmentToDelete(assign.id);
                                                setIsDeleteModalOpen(true);
                                            }}
                                            className="absolute top-6 right-6 size-8 rounded-xl bg-red-50 text-red-500 items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 flex shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>

                                    {assign.status === 'completed' ? (
                                        <div className="flex items-center justify-between pt-2">
                                            <div className="text-xs font-black uppercase tracking-tight">Grade: <span className="text-green-600 font-black">{assign.score || 0}%</span></div>
                                            <span className="text-[10px] text-slate-400 font-bold">{new Date(assign.completed_at).toLocaleDateString()}</span>
                                        </div>
                                    ) : isOverdue ? (
                                        <div className="space-y-3">
                                            <div className="w-full bg-red-50 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-red-500 h-1.5 rounded-full w-full"></div>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-red-500">
                                                <span>Overdue</span>
                                                <span>Due {new Date(assign.due_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div className={`${isActive ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'} h-1.5 rounded-full`} style={{ width: isActive ? '60%' : '0%' }}></div>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                <span className={isActive ? 'text-amber-500' : 'text-slate-400'}>{isActive ? 'Activo' : 'Próximamente'}</span>
                                                <span className="text-slate-400">Assigned {new Date(assign.assigned_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center gap-4">
                        <span className="material-symbols-outlined text-slate-300 text-6xl">school</span>
                        <div>
                            <p className="text-slate-500 font-bold text-xl uppercase tracking-widest">Sin Materiales</p>
                            <p className="text-sm text-slate-400 mt-1">No se han asignado materiales a este alumno todavía.</p>
                        </div>
                        <Link to="/admin/students">
                            <Button variant="primary" className="mt-4 bg-slate-900 border-none px-10">Asignar Ahora</Button>
                        </Link>
                    </div>
                )}
            </section>

            {/* Custom Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm duration-200 ${isClosingModal ? 'animate-out fade-out' : 'animate-in fade-in'}`}>
                    <div className={`bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 duration-200 border border-slate-100 ${isClosingModal ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95'}`}>
                        <div className="flex justify-center mb-6">
                            <div className="size-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center shadow-inner border border-red-100">
                                <span className="material-symbols-outlined text-3xl">delete_forever</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-center text-slate-900 mb-2">¿Eliminar Asignación?</h3>
                        <p className="text-center text-slate-500 text-sm mb-8">
                            This will permanently delete the task from the student's roadmap. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button 
                                variant="secondary" 
                                className="flex-1 bg-slate-100 border-none hover:bg-slate-200 text-slate-700 font-bold"
                                onClick={closeDeleteModal}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                className="flex-1 bg-red-500 hover:bg-red-600 border-none shadow-lg shadow-red-500/20 font-bold"
                                onClick={handleDeleteAssignment}
                            >
                                Yes, Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <StudentLogsModal 
                studentId={profile.id}
                studentName={profile.full_name}
                isOpen={isLogsModalOpen}
                onClose={() => setIsLogsModalOpen(false)}
            />
        </div>
    );
}
