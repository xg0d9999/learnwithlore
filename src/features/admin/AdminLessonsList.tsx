import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';
import AssignLessonModal from './AssignLessonModal';

interface Lesson {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    duration: string;
    image_url: string;
    created_at: string;
}

export default function AdminLessonsList() {
    const navigate = useNavigate();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLesson, setSelectedLesson] = useState<{ id: string, title: string } | null>(null);

    const fetchLessons = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLessons(data || []);
        } catch (error) {
            console.error('Error fetching asignaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLessons();
    }, []);

    const filteredLessons = lessons.filter(lesson =>
        lesson.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this asignación? This action cannot be undone.')) return;
        
        try {
            const { error } = await supabase
                .from('lessons')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchLessons();
        } catch (error) {
            console.error('Error deleting asignación:', error);
            alert('Error deleting asignación. Please try again.');
        }
    };

    if (loading && lessons.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 gap-4 h-[calc(100vh-80px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-slate-400 text-sm animate-pulse">Loading curriculum library...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1240px] mx-auto p-8 flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Link className="hover:text-primary transition-colors" to="/admin/dashboard">Inicio</Link>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    <span className="text-slate-900 font-medium">Asignaciones</span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Asignaciones</h1>
                    <p className="text-slate-500 mt-1">Revisa, edita o crea nuevos materiales de aprendizaje para tus alumnos.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">search</span>
                        <input
                            className="h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary w-64 md:w-80 transition-all outline-none"
                            placeholder="Filter by title or description..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button 
                        variant="primary" 
                        className="rounded-xl flex items-center gap-2 h-10 px-6 font-bold"
                        onClick={() => navigate('/admin/builder/manual/new')}
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nueva Asignación
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLessons.map((lesson) => (
                    <div key={lesson.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group relative">
                        <div className="h-52 relative overflow-hidden bg-slate-100">
                            <div 
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                style={{ backgroundImage: `url(${lesson.image_url || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800'})` }}
                            />
                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                                <div className="flex gap-2 mb-2">
                                    <Badge variant="primary" className="shadow-lg backdrop-blur-md bg-primary/90 border-0">{lesson.level}</Badge>
                                    <Badge variant="neutral" className="shadow-lg backdrop-blur-md bg-white/20 text-white border-0">{lesson.category}</Badge>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-0.5 line-clamp-1">{lesson.title}</h3>
                            </div>
                        </div>

                        <div className="p-6 flex flex-col flex-1">
                            <p className="text-slate-500 text-sm mb-6 line-clamp-3 leading-relaxed font-medium">
                                {lesson.description}
                            </p>

                            <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-100">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                                    {lesson.duration}
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setSelectedLesson({ id: lesson.id, title: lesson.title })}
                                        className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-all"
                                        title="Assign to Students"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">person_add</span>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(lesson.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        title="Delete Lesson"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                    </button>
                                    <Button 
                                        variant="outline" 
                                        className="rounded-xl font-black px-4 h-9 text-[10px] uppercase tracking-widest"
                                        onClick={() => navigate(`/admin/builder/manual/${lesson.id}`)}
                                    >
                                        Editar Material
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredLessons.length === 0 && !loading && (
                    <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-center">
                        <div className="size-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                            <span className="material-symbols-outlined text-5xl">search_off</span>
                        </div>
                        <div>
                            <p className="text-slate-600 font-black text-xl">Sin asignaciones que coincidan</p>
                            <p className="text-slate-400 text-sm font-medium">Intenta ampliar tu búsqueda o crea un nuevo material.</p>
                        </div>
                        <Button 
                            variant="primary" 
                            className="mt-2 rounded-xl px-8 h-12 font-bold"
                            onClick={() => navigate('/admin/builder/manual/new')}
                        >
                            Crear Primera Asignación
                        </Button>
                    </div>
                )}
            </div>

            {selectedLesson && (
                <AssignLessonModal 
                    lessonId={selectedLesson.id}
                    lessonTitle={selectedLesson.title}
                    onClose={() => setSelectedLesson(null)}
                />
            )}
        </div>
    );
}
