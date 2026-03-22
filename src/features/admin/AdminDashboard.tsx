import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { MetricCard } from '../../components/shared/MetricCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Appointment } from '../../types/database';
import { Select } from '../../components/ui/Select';
import { toast } from 'sonner';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalLessons: 0,
        pendingAppointments: 0,
        activeNow: 0
    });
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [performanceData, setPerformanceData] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            console.log('[AdminDashboard] Fetching dashboard data...');
            setLoading(true);
            try {
                // Fetch segments with error isolation and individual timeouts would be better, 
                // but let's at least add logging for each step.

                // 1. Fetch Students count
                console.log('[AdminDashboard] Querying students count...');
                const { count: studentCount, error: studentError } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'student');
                if (studentError) console.error('[AdminDashboard] studentCount error:', studentError);

                // 2. Fetch Lessons count
                console.log('[AdminDashboard] Querying lessons count...');
                const { count: lessonCount, error: lessonError } = await supabase
                    .from('lessons')
                    .select('*', { count: 'exact', head: true });
                if (lessonError) console.error('[AdminDashboard] lessonCount error:', lessonError);

                // 3. Fetch Appointments (upcoming)
                console.log('[AdminDashboard] Querying upcoming appointments...');
                const { data: appointData, error: apptError } = await supabase
                    .from('calendar_events')
                    .select('*, profiles!student_id(full_name, avatar_url)')
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true });
                if (apptError) console.error('[AdminDashboard] calendar_events error:', apptError);

                // 4. Fetch Active Students (last 5 mins)
                console.log('[AdminDashboard] Querying active students...');
                const activeThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                const { count: activeCount, error: activeError } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'student')
                    .gt('updated_at', activeThreshold);
                if (activeError) console.error('[AdminDashboard] activeCount error:', activeError);

                // 5. Fetch Recent Activities (from messages as a proxy for activity)
                console.log('[AdminDashboard] Querying recent activity...');
                const { data: recentMsgs, error: msgError } = await supabase
                    .from('messages')
                    .select('*, profiles!sender_id(full_name)')
                    .order('created_at', { ascending: false })
                    .limit(5);
                if (msgError) console.error('[AdminDashboard] recentMsgs error:', msgError);

                const activities = (recentMsgs || []).map(m => ({
                    user: (m.profiles as any)?.full_name || 'User',
                    action: 'sent a new message',
                    time: new Date(m.created_at).toLocaleTimeString(),
                    color: 'bg-amber-500',
                    icon: 'chat_bubble'
                }));

                // 6. Performance Data (Top 10 students by XP)
                console.log('[AdminDashboard] Querying performance data...');
                const { data: performance, error: perfError } = await supabase
                    .from('user_progress')
                    .select('total_xp')
                    .order('total_xp', { ascending: false })
                    .limit(10);
                if (perfError) console.error('[AdminDashboard] performance error:', perfError);

                console.log('[AdminDashboard] All queries completed. Updating state.');
                setStats({
                    totalStudents: studentCount || 0,
                    totalLessons: lessonCount || 0,
                    pendingAppointments: appointData?.length || 0,
                    activeNow: activeCount || 0
                });
                setAppointments(appointData as unknown as Appointment[] || []);
                setRecentActivity(activities.length > 0 ? activities : [
                    { user: 'System', action: 'Ready to track activity', time: 'Just now', color: 'bg-primary', icon: 'info' }
                ]);
                setPerformanceData((performance || []).map(p => p.total_xp));
            } catch (err: any) {
                console.error('[AdminDashboard] Critical fetch error:', err);
                toast.error('Error al cargar los datos del panel');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="p-8 animate-pulse">
                <div className="h-10 w-64 bg-slate-200 rounded-lg mb-2"></div>
                <div className="h-4 w-96 bg-slate-100 rounded mb-8"></div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-slate-50 border border-slate-100 rounded-xl"></div>
                    ))}
                </div>

                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        <div className="h-80 bg-slate-50 border border-slate-100 rounded-xl"></div>
                        <div className="h-64 bg-slate-50 border border-slate-100 rounded-xl"></div>
                    </div>
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="h-48 bg-slate-50 border border-slate-100 rounded-xl"></div>
                        <div className="h-80 bg-slate-50 border border-slate-100 rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Panel de Administración</h2>
                    <p className="text-slate-500 mt-1">Bienvenido de nuevo, {user?.user_metadata?.full_name || 'Admin'}. Tienes {stats.pendingAppointments} sesiones programadas.</p>
                </div>
            </header>

            {/* Quick Stats */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard
                    title="Alumnos Totales"
                    value={stats.totalStudents.toString()}
                    icon="group"
                    trend={{ value: 0, isPositive: true, label: 'En vivo' }}
                    iconBgClass="bg-blue-100"
                    iconTextClass="text-blue-600"
                />
                <MetricCard
                    title="Asignaciones Creadas"
                    value={stats.totalLessons.toString()}
                    icon="menu_book"
                    trend={{ value: 0, isPositive: true, label: 'Current' }}
                    iconBgClass="bg-emerald-100"
                    iconTextClass="text-emerald-600"
                />
                <MetricCard
                    title="Sesiones Pendientes"
                    value={stats.pendingAppointments.toString()}
                    icon="assignment_late"
                    trend={{ value: 0, isPositive: false, label: 'Próximas' }}
                    iconBgClass="bg-red-100"
                    iconTextClass="text-red-600"
                />
            </section>


            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Rendimiento de Alumnos</h3>
                            <Select 
                                className="!w-48"
                                options={[
                                    { value: '30days', label: 'Últimos 30 días' },
                                    { value: '6months', label: 'Últimos 6 meses' }
                                ]}
                                defaultValue="30days"
                            />
                        </div>
                        <div className="h-64 flex items-end gap-2 relative">
                            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                <span className="material-symbols-outlined text-9xl">show_chart</span>
                            </div>
                            {performanceData.length > 0 ? performanceData.map((xp, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 rounded-t bg-primary/20 hover:bg-primary transition-all group/bar relative`}
                                    style={{ height: `${Math.min((xp / 1000) * 100, 100)}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                        {xp} XP
                                    </div>
                                </div>
                            )) : (
                                [40, 60, 85, 55, 70, 95, 50, 65, 80, 90].map((h, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 rounded-t bg-slate-100"
                                        style={{ height: `${h}%` }}
                                    />
                                ))
                            )}
                        </div>
                        <div className="flex justify-between mt-4 text-xs text-slate-400 font-medium px-2">
                            <span>Week 1</span>
                            <span>Week 2</span>
                            <span>Week 3</span>
                            <span>Week 4</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Próximas Sesiones</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {appointments.length > 0 ? (
                                appointments.map((appointment) => (
                                    <div key={appointment.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                                                <span className="material-symbols-outlined">videocam</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{(appointment.profiles as any)?.full_name || 'Individual Session'}</p>
                                                <p className="text-sm text-slate-500">
                                                    {new Date(appointment.start_time).toLocaleString()} • Scheduled Session
                                                </p>
                                            </div>

                                        </div>
                                        <Button variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-primary hover:text-white">Join Room</Button>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 italic text-sm">
                                    No upcoming sessions scheduled.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold mb-4 text-slate-900">Accesos Directos</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                className="flex items-center gap-3 w-full p-3 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all group"
                                onClick={() => navigate('/admin/builder/manual/new')}
                            >
                                <span className="material-symbols-outlined">add_circle</span>
                                <span className="text-sm font-bold">Crear Nueva Asignación</span>
                            </button>
                            <button className="flex items-center gap-3 w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-primary transition-all">
                                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                                <span className="text-sm font-bold">Generar Tarjetas IA</span>
                            </button>
                            <button className="flex items-center gap-3 w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-primary transition-all">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                                <span className="text-sm font-bold">Análisis Detallado</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold mb-4 text-slate-900">Actividad Reciente</h3>
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
                            {recentActivity.map((activity, idx) => (
                                <div key={idx} className="relative flex items-start gap-4">
                                    <div className={`absolute left-0 mt-1 size-8 rounded-full ${activity.color} flex items-center justify-center text-white ring-4 ring-white shadow-sm`}>
                                        <span className="material-symbols-outlined text-sm">
                                            {activity.icon}
                                        </span>
                                    </div>
                                    <div className="ml-10">
                                        <p className="text-sm text-slate-900 font-medium"><span className="font-bold">{activity.user}</span> {activity.action}</p>
                                        <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-2 text-slate-500 text-sm font-bold hover:text-primary transition-colors">See all activity</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
