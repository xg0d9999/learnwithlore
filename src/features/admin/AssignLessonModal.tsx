import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { toast } from 'sonner';

interface Student {
    id: string;
    full_name: string;
    avatar_url: string;
    level: string;
    language: string;
}

interface AssignLessonModalProps {
    lessonId: string;
    lessonTitle: string;
    onClose: () => void;
}

export default function AssignLessonModal({ lessonId, lessonTitle, onClose }: AssignLessonModalProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [availableAt, setAvailableAt] = useState(new Date().toISOString().split('T')[0]);
    const [dueAt, setDueAt] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState('All');
    const [languageFilter, setLanguageFilter] = useState('All');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, level, language')
            .eq('role', 'student')
            .order('full_name');

        if (error) console.error('Error fetching students:', error);
        else setStudents(data || []);
        setLoading(false);
    };

    const handleAssign = async () => {
        if (selectedStudents.length === 0) {
            toast.error('Por favor, selecciona al menos un estudiante');
            return;
        }

        setSaving(true);
        try {
            const assignments = selectedStudents.map(studentId => ({
                student_id: studentId,
                lesson_id: lessonId,
                status: 'pending',
                available_at: new Date(availableAt),
                due_at: dueAt ? new Date(dueAt) : null,
                assigned_at: new Date()
            }));

            const { error } = await supabase
                .from('assignments')
                .insert(assignments);

            if (error) throw error;
            toast.success(`"${lessonTitle}" asignado correctamente a ${selectedStudents.length} estudiantes.`);
            onClose();
        } catch (error) {
            console.error('Error assigning lesson:', error);
            toast.error('Error al asignar la lección. Por favor, inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLevel = levelFilter === 'All' || student.level === levelFilter;
        const matchesLanguage = languageFilter === 'All' || student.language === languageFilter;
        return matchesSearch && matchesLevel && matchesLanguage;
    });

    const toggleStudent = (id: string) => {
        setSelectedStudents(prev => 
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-sidebar-dark w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Asignar Pack</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <span className="material-symbols-outlined text-slate-400">close</span>
                        </button>
                    </div>
                    <p className="text-slate-500 font-medium">Asignando: <span className="text-primary font-black italic">{lessonTitle}</span></p>
                </div>

                {/* Filters & Dates */}
                <div className="p-8 pb-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available From</label>
                            <input 
                                type="date" 
                                value={availableAt}
                                onChange={(e) => setAvailableAt(e.target.value)}
                                className="h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-sidebar-dark text-sm outline-none focus:ring-4 focus:ring-primary/10"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date (Optional)</label>
                            <input 
                                type="date" 
                                value={dueAt}
                                onChange={(e) => setDueAt(e.target.value)}
                                className="h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-sidebar-dark text-sm outline-none focus:ring-4 focus:ring-primary/10"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                            <input 
                                type="text"
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-sidebar-dark text-sm outline-none focus:ring-4 focus:ring-primary/10"
                            />
                        </div>
                        <Select 
                            className="!w-40"
                            value={languageFilter}
                            onChange={(e) => setLanguageFilter(e.target.value)}
                            options={[
                                { value: 'All', label: 'All Languages' },
                                { value: 'English', label: 'English' },
                                { value: 'Spanish', label: 'Spanish' },
                                { value: 'French', label: 'French' }
                            ]}
                        />
                        <Select 
                            className="!w-32"
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            options={[
                                { value: 'All', label: 'All Levels' },
                                { value: 'A1', label: 'A1' },
                                { value: 'A2', label: 'A2' },
                                { value: 'B1', label: 'B1' },
                                { value: 'B2', label: 'B2' },
                                { value: 'C1', label: 'C1' },
                                { value: 'C2', label: 'C2' }
                            ]}
                        />
                    </div>
                </div>

                {/* Student List */}
                <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-2">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-xs font-bold uppercase tracking-widest">Loading students...</p>
                        </div>
                    ) : filteredStudents.length > 0 ? (
                        filteredStudents.map(student => (
                            <div 
                                key={student.id} 
                                onClick={() => toggleStudent(student.id)}
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                    selectedStudents.includes(student.id) 
                                    ? 'bg-primary/5 border-primary shadow-sm' 
                                    : 'bg-white dark:bg-sidebar-dark border-slate-100 dark:border-slate-800 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                        {student.avatar_url ? (
                                            <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-400">person</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{student.full_name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.language}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <Badge variant="neutral" className="px-1.5 py-0 text-[9px]">{student.level}</Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    selectedStudents.includes(student.id)
                                    ? 'bg-primary border-primary text-white scale-110'
                                    : 'border-slate-200 dark:border-slate-800'
                                }`}>
                                    {selectedStudents.includes(student.id) && (
                                        <span className="material-symbols-outlined text-[18px] font-black">check</span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-slate-400">
                            <p className="text-sm font-bold opacity-60">No students match your search</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {selectedStudents.length} Students Selected
                    </p>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={onClose} className="rounded-xl px-6 h-12 font-bold">
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            className="rounded-xl px-10 h-12 font-black shadow-xl shadow-primary/20"
                            loading={saving}
                            onClick={handleAssign}
                        >
                            Asignar Materiales
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
