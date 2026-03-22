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
                    available_at: asgn.available_at
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
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>

            </main>
        </div>
    );
}
