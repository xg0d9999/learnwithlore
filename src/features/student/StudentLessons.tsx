import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TopNavigation } from '../../components/layout/TopNavigation';
import { supabase } from '../../lib/supabase';

interface Lesson {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    duration: string;
    image_url: string;
}

export default function StudentLessons() {
    const navigate = useNavigate();
    const location = useLocation();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState(() => {
        const params = new URLSearchParams(location.search);
        const cat = params.get('category');
        return cat || 'Todas';
    });
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
    const [isGradesModalOpen, setIsGradesModalOpen] = useState(false);
    const [fetchingGrades, setFetchingGrades] = useState(false);

    useEffect(() => {
        const fetchLessons = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('assignments')
                    .select('*, lesson:lessons(*)')
                    .eq('student_id', user.id)
                    .order('assigned_at', { ascending: false });

                if (error) throw error;
                
                // Extract unique lessons from assignments
                const assignedLessons = data?.map(asgn => ({
                    ...asgn.lesson,
                    assignmentId: asgn.id,
                    status: asgn.status,
                    due_at: asgn.due_at,
                    available_at: asgn.available_at,
                    score: asgn.score
                })) || [];
                
                setLessons(assignedLessons);
            } catch (error) {
                console.error('Error fetching lessons:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLessons();
    }, []);

    const handleSeeGrades = async (lessonId: string) => {
        setFetchingGrades(true);
        setIsGradesModalOpen(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('exercise_submissions')
                .select('*')
                .eq('user_id', user.id)
                .eq('lesson_id', lessonId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            setSelectedSubmission(data);
        } catch (error) {
            console.error('Error fetching submission:', error);
        } finally {
            setFetchingGrades(false);
        }
    };

    const filteredLessons = lessons.filter(lesson =>
        activeCategory === 'Todas' || lesson.category?.toLowerCase() === activeCategory.toLowerCase()
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full">
            <TopNavigation
                activeTab={activeCategory}
                onTabChange={setActiveCategory}
                tabs={[
                    { label: 'Todas' },
                    { label: 'Grammar' },
                    { label: 'Vocabulary' },
                    { label: 'Writing' },
                    { label: 'Listening' },
                    { label: 'Reading' },
                ]}
            >

                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                        <span className="material-symbols-outlined text-2xl">
                            {activeCategory === 'Grammar' ? 'science' : 
                             activeCategory === 'Vocabulary' ? 'translate' :
                             activeCategory === 'Writing' ? 'edit_note' :
                             activeCategory === 'Listening' ? 'headphones' :
                             activeCategory === 'Reading' ? 'menu_book' : 'school'}
                        </span>
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-900">{activeCategory === 'Todas' ? 'Mi Plan' : `${activeCategory} Lab`}</h1>
                </div>
            </TopNavigation>

            <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-8">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-6 text-sm">
                    <a className="font-medium text-slate-500 hover:text-primary transition-colors" href="#">Courses</a>
                    <span className="text-slate-300">/</span>
                    <span className="font-bold text-primary">Level B1</span>
                </div>

                {/* Page Heading */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div className="max-w-2xl">
                        <h1 className="text-3xl font-black text-slate-900">Mis Asignaciones</h1>
                        <p className="text-slate-500 font-medium mt-1">Accede a tus ejercicios y materiales de estudio</p>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
                            <span>Progress</span>
                            <span>12%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full w-[12%] rounded-full bg-primary"></div>
                        </div>
                    </div>
                </div>

                {/* Lesson Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLessons.map((lesson) => {
                        const now = new Date();
                        const availableAt = (lesson as any).available_at ? new Date((lesson as any).available_at) : null;
                        const dueAt = (lesson as any).due_at ? new Date((lesson as any).due_at) : null;
                        const isCompleted = (lesson as any).status === 'completed';
                        const isOverdue = !!(!isCompleted && dueAt && now > dueAt);
                        const isFuture = !!(!isCompleted && availableAt && now < availableAt);
                        
                        let badgeConfig = { variant: 'warning', text: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-200' };
                        if (isCompleted) badgeConfig = { variant: 'success', text: 'Done', className: 'bg-green-500/10 text-green-600 border-green-200' };
                        else if (isOverdue) badgeConfig = { variant: 'danger', text: 'Overdue', className: 'bg-red-500/10 text-red-600 border-red-200' };
                        else if (isFuture) badgeConfig = { variant: 'neutral', text: 'Locked', className: 'bg-slate-500/10 text-slate-600 border-slate-200' };
                        
                        return (
                        <div
                            key={lesson.id}
                            className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                                    style={{ backgroundImage: `url(${lesson.image_url})` }}
                                />
                                <div className="absolute top-3 right-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 hover:text-primary transition-colors cursor-pointer shadow-sm backdrop-blur-sm">
                                        <span className="material-symbols-outlined text-xl">bookmark_border</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-1 flex-col p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="primary">{lesson.category}</Badge>
                                    <Badge variant="neutral">{lesson.level}</Badge>
                                    <Badge variant={badgeConfig.variant as any} className={badgeConfig.className}>{badgeConfig.text}</Badge>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">
                                    {lesson.title}
                                </h3>

                                <p className="text-sm text-slate-500 line-clamp-2 mb-6">
                                    {lesson.description}
                                </p>

                                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                            <span className="material-symbols-outlined text-lg">schedule</span>
                                            {lesson.duration}
                                        </div>
                                        {(lesson as any).due_at && (
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                                <span className="material-symbols-outlined text-[14px]">event_busy</span>
                                                Due {new Date((lesson as any).due_at).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <Button 
                                            variant={isFuture || isOverdue ? "ghost" : "primary"} 
                                            className={`font-bold ${isFuture || isOverdue ? 'text-slate-400 cursor-not-allowed opacity-70' : isCompleted ? 'bg-green-100 text-green-700 hover:bg-green-200 border-none' : 'text-primary hover:bg-primary/10'}`}
                                            disabled={isFuture || isOverdue}
                                            onClick={() => {
                                                if (isFuture || isOverdue) return;
                                                
                                                const basePath = lesson.category?.toLowerCase() === 'writing' ? '/student/writing' : '/student/exercises';
                                                navigate(`${basePath}/${lesson.id}${isCompleted ? '?review=true' : ''}`);
                                            }}
                                        >
                                            {isCompleted ? 'Repasar' : isFuture ? 'Bloqueado' : isOverdue ? 'Vencido' : 'Comenzar'}
                                        </Button>
                                        {isCompleted && (
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                className="text-[10px] font-black uppercase tracking-widest h-8"
                                                onClick={() => handleSeeGrades(lesson.id)}
                                            >
                                                Ver Calificación
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>

            </main>

            {/* Grades Modal */}
            {isGradesModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[85vh]">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Tu Calificación</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Desglose Detallado</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsGradesModalOpen(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1">
                            {fetchingGrades ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Obteniendo resultados...</p>
                                </div>
                            ) : selectedSubmission ? (
                                <div className="space-y-8">
                                    {/* Overall Score Card */}
                                    <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                                        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary rounded-full blur-[80px] opacity-30" />
                                        <div className="relative z-10 flex flex-col items-center">
                                            <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-2">Puntuación Total</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-6xl font-black">{selectedSubmission.grade || 0}</span>
                                                <span className="text-2xl font-bold opacity-40">/100</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed breakdown */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Ejercicios Realizados</h3>
                                        {(() => {
                                            try {
                                                const feedback = JSON.parse(selectedSubmission.feedback || '{}');
                                                const grades = feedback.exerciseGrades || {};
                                                
                                                if (Object.keys(grades).length === 0) {
                                                    return (
                                                        <div className="p-8 rounded-3xl border-2 border-dashed border-slate-100 text-center">
                                                            <p className="text-slate-400 font-medium italic">"{selectedSubmission.feedback || 'Tu tutor aún no ha dejado comentarios detallados.'}"</p>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-4">
                                                        {Object.entries(grades).map(([id, data]: [string, any], idx) => (
                                                            <div key={id} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3 hover:border-primary/20 transition-colors">
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">
                                                                            {idx + 1}
                                                                        </div>
                                                                        <span className="font-bold text-slate-700">Ejercicio {idx + 1}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={`text-xl font-black ${data.grade >= 8 ? 'text-green-500' : data.grade >= 5 ? 'text-amber-500' : 'text-red-500'}`}>{data.grade}</span>
                                                                        <span className="text-[10px] font-bold text-slate-300">/ 10</span>
                                                                    </div>
                                                                </div>
                                                                {data.comment && (
                                                                    <div className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                                                        <span className="material-symbols-outlined text-primary text-[18px]">chat_bubble</span>
                                                                        <p className="text-sm text-primary/80 font-medium leading-relaxed italic">"{data.comment}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {feedback.overallComment && (
                                                            <div className="mt-8 pt-8 border-t border-slate-100">
                                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Comentario del Tutor</h3>
                                                                <div className="p-8 rounded-3xl bg-amber-50 border border-amber-100 text-amber-900 font-medium italic text-center relative">
                                                                    <span className="material-symbols-outlined absolute top-[-10px] left-1/2 -translate-x-1/2 bg-white px-3 text-amber-400">format_quote</span>
                                                                    "{feedback.overallComment}"
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            } catch (e) {
                                                return <p className="text-slate-400 italic">Comentario: {selectedSubmission.feedback}</p>;
                                            }
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 opacity-40">
                                    <span className="material-symbols-outlined text-6xl mb-4">error</span>
                                    <p className="font-bold uppercase tracking-widest text-[10px]">No se encontraron detalles de esta asignación.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-slate-100 shrink-0">
                            <Button variant="primary" className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black border-none font-bold" onClick={() => setIsGradesModalOpen(false)}>
                                Entendido
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
