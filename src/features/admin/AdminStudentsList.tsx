import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import EditStudentModal from './EditStudentModal';

interface StudentProfile {
    id: string;
    full_name: string;
    email?: string;
    role: string;
    created_at: string;
    updated_at: string;
    avatar_url?: string;
    level?: string;
    learning_language?: string;
    payment_plan_id?: string;
    user_progress?: {
        total_xp: number;
        words_learned_count: number;
    } | null;
}

export default function AdminStudentsList() {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchStudents = async () => {
        console.log('[AdminStudentsList] Fetching students start...');
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*, user_progress(total_xp, words_learned_count)')
                .eq('role', 'student')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[AdminStudentsList] Query error:', error);
                throw error;
            }

            console.log(`[AdminStudentsList] Fetched ${data?.length || 0} students successfully.`);
            setStudents(data || []);
        } catch (error) {
            console.error('[AdminStudentsList] Critical exception:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleEditClick = (student: StudentProfile) => {
        setSelectedStudent(student);
        setIsEditModalOpen(true);
    };

    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const newEnrollThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeCount = students.filter(s => new Date(s.updated_at) > activeThreshold).length;
    const newEnrollsCount = students.filter(s => new Date(s.created_at) > newEnrollThreshold).length;

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && students.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-slate-400 text-sm animate-pulse">Fetching student registry...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto p-8 flex flex-col gap-8">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Link className="hover:text-primary transition-colors" to="/admin/dashboard">Home</Link>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <span className="text-slate-900 font-medium">Students</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Student Registry</h1>
                    <p className="text-slate-500 mt-1">Manage profiles, academic levels, and progression stats.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">search</span>
                        <input
                            className="h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary w-64 md:w-80 transition-all outline-none"
                            placeholder="Search by name..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest text-[10px]">Total Students</p>
                        <span className="material-symbols-outlined text-slate-300">group</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{students.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest text-[10px]">Active Now</p>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Live</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{activeCount}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest text-[10px]">Weekly Growth</p>
                        <span className="material-symbols-outlined text-primary">trending_up</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">+{newEnrollsCount}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest text-[10px]">Avg. XP</p>
                        <span className="material-symbols-outlined text-amber-400">workspace_premium</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                        {students.length > 0
                            ? Math.round(students.reduce((acc, s) => acc + (s.user_progress?.total_xp || 0), 0) / students.length)
                            : 0
                        }
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-8 py-4 border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <div className="col-span-4">Student Name</div>
                    <div className="col-span-2">Level & Language</div>
                    <div className="col-span-2 text-center">Enrollment</div>
                    <div className="col-span-3">Progression</div>
                    <div className="col-span-1 text-right">Actions</div>
                </div>

                <div className="flex flex-col divide-y divide-slate-100 relative">
                    {loading && students.length > 0 && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1.5px] z-10 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    )}

                    {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => {
                            const initials = student.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'ST';
                            const xp = student.user_progress?.total_xp || 0;

                            return (
                                <div key={student.id} className="md:grid md:grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-slate-50/80 transition-all group">
                                    <div className="col-span-4 flex items-center gap-3">
                                        {student.avatar_url ? (
                                            <div
                                                className="size-11 rounded-xl bg-slate-200 bg-center bg-cover flex-shrink-0 border border-slate-100 shadow-sm"
                                                style={{ backgroundImage: `url(${student.avatar_url})` }}
                                            ></div>
                                        ) : (
                                            <div className="size-11 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 bg-primary/10 text-primary border border-primary/5">
                                                {initials}
                                            </div>
                                        )}
                                        <div>
                                            <Link to={`/admin/students/${student.id}`} className="text-sm font-bold text-slate-900 hover:text-primary transition-colors">
                                                {student.full_name}
                                            </Link>
                                            <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{student.id.slice(0, 8)}</p>
                                        </div>
                                    </div>

                                    <div className="col-span-2 mt-2 md:mt-0">
                                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                            {student.level || 'A1'} — {student.learning_language || 'English'}
                                        </span>
                                    </div>

                                    <div className="col-span-2 mt-1 md:mt-0 text-xs font-bold text-slate-500 text-center">
                                        {new Date(student.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                    </div>

                                    <div className="col-span-3 mt-3 md:mt-0 px-4">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">XP Points</span>
                                            <span className="text-xs font-black text-amber-500">{xp.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50 p-[1px]">
                                            <div
                                                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(xp / 10, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="col-span-1 mt-3 md:mt-0 flex justify-end gap-1.5">
                                        <button
                                            onClick={() => handleEditClick(student)}
                                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                            title="Edit Records"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                        </button>
                                        <Link
                                            to={`/admin/students/${student.id}`}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            title="Insights"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">insights</span>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-20 text-center flex flex-col items-center gap-4">
                            <span className="material-symbols-outlined text-slate-200 text-6xl">person_search</span>
                            <div>
                                <p className="text-slate-500 font-bold text-lg">No matches found</p>
                                <p className="text-sm text-slate-400">Try adjusting your search criteria.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <EditStudentModal
                student={selectedStudent}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedStudent(null);
                }}
                onSave={fetchStudents}
            />
        </div>
    );
}
