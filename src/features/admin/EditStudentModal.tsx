import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { toast } from 'sonner';

interface EditStudentModalProps {
    student: any;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function EditStudentModal({ student, isOpen, onClose, onSave }: EditStudentModalProps) {
    const [formData, setFormData] = useState({
        full_name: '',
        level: '',
        avatar_url: '',
        payment_plan_id: '',
        learning_language: 'English',
        total_xp: 0,
        is_premium: false
    });
    const [paymentPlans, setPaymentPlans] = useState<any[]>([]);
    const [lessons, setLessons] = useState<any[]>([]);
    const [selectedLesson, setSelectedLesson] = useState('');
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [xpToAdd, setXpToAdd] = useState(0);

    useEffect(() => {
        if (student) {
            setFormData({
                full_name: student.full_name || '',
                level: student.level || '',
                avatar_url: student.avatar_url || '',
                payment_plan_id: student.payment_plan_id || '',
                learning_language: student.learning_language || 'English',
                total_xp: student.user_progress?.total_xp || 0,
                is_premium: student.is_premium || false
            });
        }
    }, [student]);

    useEffect(() => {
        const fetchResources = async () => {
            const [plansRes, lessonsRes] = await Promise.all([
                supabase.from('payment_plans').select('*'),
                supabase.from('lessons').select('id, title')
            ]);
            if (plansRes.data) setPaymentPlans(plansRes.data);
            if (lessonsRes.data) setLessons(lessonsRes.data);
        };
        if (isOpen) fetchResources();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const updateFields: any = {
                full_name: formData.full_name,
                level: formData.level,
                avatar_url: formData.avatar_url,
                payment_plan_id: formData.payment_plan_id || null,
                is_premium: formData.is_premium,
            };

            // Only add learning_language if student object had it OR it's a new field we want to try
            // But to be safe, we'll try to update it and catch the error
            updateFields.learning_language = formData.learning_language;

            const { error: profileError } = await supabase
                .from('profiles')
                .update(updateFields)
                .eq('id', student.id);

            // FALLBACK if learning_language doesn't exist
            if (profileError && profileError.message?.includes('column "learning_language" does not exist')) {
                console.warn('Falling back: learning_language column missing. Updating without it.');
                delete updateFields.learning_language;
                const { error: retryError } = await supabase
                    .from('profiles')
                    .update(updateFields)
                    .eq('id', student.id);
                if (retryError) throw retryError;
            } else if (profileError) {
                throw profileError;
            }

            const { error: progressError } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: student.id,
                    total_xp: formData.total_xp,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (progressError) throw progressError;

            onSave();
            onClose();
            toast.success('Perfil actualizado correctamente');
        } catch (err: any) {
            console.error('Update error:', err);
            toast.error(`Error al actualizar el perfil: ${err.message || err.toString()}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddXp = () => {
        setFormData({ ...formData, total_xp: formData.total_xp + xpToAdd });
        setXpToAdd(0);
    };

    const handleAssignLesson = async () => {
        if (!selectedLesson) return;
        setAssigning(true);
        try {
            const { error } = await supabase
                .from('assignments')
                .insert({
                    student_id: student.id,
                    lesson_id: selectedLesson,
                    status: 'pending'
                });
            if (error) throw error;
            toast.success('Lección asignada correctamente');
            setSelectedLesson('');
        } catch (err) {
            console.error('Assignment error:', err);
            toast.error('No se pudo asignar la lección');
        } finally {
            setAssigning(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${student.full_name}?`)) return;
        setDeleting(true);
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', student.id);
            if (error) throw error;
            onSave();
            onClose();
            toast.success('Estudiante eliminado');
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Error al eliminar el usuario');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-3xl">manage_accounts</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Student Control Center</h3>
                            <p className="text-xs text-slate-500 font-medium">Modifying: <span className="text-primary font-bold">{student?.full_name}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-xl transition-all">
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* General Profile */}
                    <section className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Profile Information</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Full Name</label>
                                <input
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Select
                                    label="English Level"
                                    value={formData.level}
                                    onChange={e => setFormData({ ...formData, level: e.target.value })}
                                    options={[
                                        { value: 'A1', label: 'A1 - Beginner' },
                                        { value: 'A2', label: 'A2 - Elementary' },
                                        { value: 'B1', label: 'B1 - Intermediate' },
                                        { value: 'B2', label: 'B2 - Upper Intermediate' },
                                        { value: 'C1', label: 'C1 - Advanced' },
                                        { value: 'C2', label: 'C2 - Mastery' }
                                    ]}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Select
                                    label="Learning Language"
                                    value={formData.learning_language}
                                    onChange={e => setFormData({ ...formData, learning_language: e.target.value })}
                                    options={[
                                        { value: 'English', label: 'English' },
                                        { value: 'Spanish', label: 'Spanish' },
                                        { value: 'French', label: 'French' },
                                        { value: 'German', label: 'German' },
                                        { value: 'Italian', label: 'Italian' }
                                    ]}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Avatar URL</label>
                                <div className="flex gap-3">
                                    <input
                                        className="flex-1 h-11 px-4 rounded-xl border border-slate-200 focus:border-primary outline-none text-sm"
                                        placeholder="https://images.com/user.jpg"
                                        value={formData.avatar_url}
                                        onChange={e => setFormData({ ...formData, avatar_url: e.target.value })}
                                    />
                                    {formData.avatar_url && (
                                        <div className="size-11 rounded-xl bg-slate-100 border border-slate-200 bg-center bg-cover flex-shrink-0" style={{ backgroundImage: `url(${formData.avatar_url})` }} />
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Premium Toggle */}
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-amber-500">workspace_premium</span>
                                    Premium Access
                                </h4>
                                <p className="text-xs text-amber-700/80 mt-1">Grants access to ElevenLabs Speaking AI and premium flashcards</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={formData.is_premium}
                                    onChange={e => setFormData({ ...formData, is_premium: e.target.checked })}
                                />
                                <div className="w-14 h-7 bg-amber-200/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-200 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 shadow-sm border border-amber-200 peer-checked:border-amber-500"></div>
                            </label>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Gamification */}
                        <section className="space-y-4 p-6 bg-amber-50/40 rounded-3xl border border-amber-100">
                            <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">workspace_premium</span>
                                Gamification State
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current TOTAL XP</label>
                                    <input
                                        type="number"
                                        className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-xl font-black text-amber-600 focus:border-amber-400 outline-none"
                                        value={formData.total_xp}
                                        onChange={e => setFormData({ ...formData, total_xp: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Add Extra XP Points</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="flex-1 h-11 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:border-primary outline-none"
                                            placeholder="Example: 500"
                                            value={xpToAdd || ''}
                                            onChange={e => setXpToAdd(parseInt(e.target.value) || 0)}
                                        />
                                        <Button
                                            variant="primary"
                                            className="bg-amber-500 hover:bg-amber-600 h-11 rounded-xl px-5"
                                            onClick={handleAddXp}
                                            disabled={!xpToAdd}
                                        >
                                            Add XP
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic">This will update the total XP displayed above.</p>
                                </div>
                            </div>
                        </section>

                        {/* Assignments */}
                        <section className="space-y-4 p-6 bg-blue-50/30 rounded-3xl border border-blue-100">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">assignment_add</span>
                                Quick Assignment
                            </h4>
                            <div className="space-y-3">
                                <Select
                                    value={selectedLesson}
                                    onChange={e => setSelectedLesson(e.target.value)}
                                    options={[
                                        { value: '', label: 'Select a Lesson...' },
                                        ...lessons.map(l => ({ value: l.id, label: l.title }))
                                    ]}
                                />
                                <Button
                                    variant="primary"
                                    className="w-full bg-blue-600 hover:bg-blue-700 h-11 rounded-xl shadow-lg shadow-blue-200"
                                    onClick={handleAssignLesson}
                                    disabled={!selectedLesson || assigning}
                                    loading={assigning}
                                >
                                    Assign to Student
                                </Button>
                            </div>
                        </section>
                    </div>

                    {/* Subscription */}
                    <section className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">credit_card</span>
                            Subscription & Billing
                        </h4>
                        <div className="space-y-2">
                            <Select
                                label="Payment Plan"
                                value={formData.payment_plan_id}
                                onChange={e => setFormData({ ...formData, payment_plan_id: e.target.value })}
                                options={[
                                    { value: '', label: 'No Active Plan (Manual Access)' },
                                    ...paymentPlans.map(plan => ({ value: plan.id, label: `${plan.name} — $${plan.price}/mo` }))
                                ]}
                            />
                        </div>
                    </section>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <button
                            disabled={deleting}
                            onClick={handleDelete}
                            className="group flex items-center gap-2 px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
                        >
                            <span className="material-symbols-outlined text-lg">person_remove</span>
                            Terminate Account
                        </button>
                    </div>
                </div>

                <footer className="px-8 py-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
                    <Button variant="secondary" onClick={onClose} disabled={loading} className="px-6 rounded-2xl h-11">Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handleUpdate}
                        loading={loading}
                        className="px-8 rounded-2xl shadow-lg shadow-primary/20 h-11"
                    >
                        Apply Changes
                    </Button>
                </footer>
            </div>
        </div>
    );
}
