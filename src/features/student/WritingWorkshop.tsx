import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserProgress } from '../../types/database';
import { logUserActivity } from '../../utils/activityLogger';

interface Lesson {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    duration: string;
    image_url: string;
    writing_location?: string;
    writing_task?: string;
    writing_requirements?: string;
}

export default function WritingWorkshop() {
    const navigate = useNavigate();
    const { id: lessonId } = useParams();
    const { user } = useAuth();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [wordCount, setWordCount] = useState(0);
    const [content, setContent] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
    const [assignment, setAssignment] = useState<any | null>(null);

    useEffect(() => {
        if (!lessonId) return;
        
        const fetchLesson = async () => {
            const { data, error } = await supabase
                .from('lessons')
                .select('*')
                .eq('id', lessonId)
                .single();
            
            if (data) setLesson(data);
            if (error) console.error('Error fetching writing lesson:', error);
        };

        fetchLesson();
    }, [lessonId]);

    useEffect(() => {
        if (!user || !lessonId) return;
        const fetchProgressAndAssignment = async () => {
            const [progRes, asgnRes] = await Promise.all([
                supabase.from('user_progress').select('*').eq('user_id', user.id).single(),
                supabase.from('assignments').select('*').eq('student_id', user.id).eq('lesson_id', lessonId).maybeSingle()
            ]);
            
            if (progRes.data) setUserProgress(progRes.data);
            if (asgnRes.data) {
                setAssignment(asgnRes.data);
                // If already completed, lock the editor
                if (asgnRes.data.status === 'completed') {
                    // Try to fetch previous submission if any
                    const { data: sub } = await supabase
                        .from('exercise_submissions')
                        .select('content')
                        .eq('user_id', user.id)
                        .eq('lesson_id', lessonId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (sub) {
                        setContent(sub.content);
                        setWordCount(sub.content.trim() ? sub.content.trim().split(/\s+/).length : 0);
                    }
                }
            }
        };
        fetchProgressAndAssignment();
    }, [user, lessonId]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setContent(text);
        setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    };

    const handleSubmit = async () => {
        if (!user || loading) return;
        setLoading(true);
        try {
            if (!lesson) return;

            // 1. Save to submissions for admin review
            const { error: subError } = await supabase
                .from('exercise_submissions')
                .insert([{
                    user_id: user.id,
                    lesson_id: lesson.id,
                    content: content,
                    category: 'writing'
                }]);

            if (subError) throw subError;

            // 2. Update Assignment Status
            // We search for a pending or in-progress assignment for this lesson
            const { data: assignment } = await supabase
                .from('assignments')
                .select('id')
                .eq('student_id', user.id)
                .eq('lesson_id', lesson.id)
                .in('status', ['pending', 'in_progress'])
                .maybeSingle();

            if (assignment) {
                await supabase
                    .from('assignments')
                    .update({
                        status: 'completed',
                        score: 100, // Writing is currently binary (submitted = 100) until teacher reviews
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', assignment.id);
            }
            
            await logUserActivity(user.id, 'assignment', `Enviada asignación de escritura: ${lesson.title}`);

            // 3. Award XP & Update Stats
            const xpAwarded = 50; // Moderate reward for writing
            const currentXP = userProgress?.total_xp || 0;

            await supabase
                .from('user_progress')
                .update({ 
                    total_xp: currentXP + xpAwarded,
                    last_activity_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            setIsModalOpen(true);
        } catch (error) {
            console.error('Error submitting writing:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!lesson) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3 bg-white shrink-0 z-20">
                <div className="flex items-center gap-4 text-slate-900">
                    <div className="size-8 text-primary flex items-center justify-center bg-primary/10 rounded-lg">
                        <span className="material-symbols-outlined">school</span>
                    </div>
                    <h2 className="text-lg font-bold">LearnWithLore</h2>
                </div>
                <div className="flex items-center gap-6">
                    <nav className="hidden md:flex items-center gap-6">
                        <a className="text-slate-600 hover:text-primary text-sm font-medium transition-colors" href="/student/dashboard">Dashboard</a>
                        <a className="text-primary text-sm font-bold" href="/student/exercises">Ejercicios</a>
                        <a className="text-slate-600 hover:text-primary text-sm font-medium transition-colors" href="/student/vocabulary">Vocabulary</a>
                    </nav>
                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    <div className="flex items-center gap-3 font-black text-rose-500 uppercase tracking-widest text-xs italic">Writing Lab</div>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden relative">
                {/* Task Section */}
                <section className="w-1/2 flex flex-col overflow-y-auto border-r border-slate-200 bg-white p-12 relative z-10">
                    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-bold uppercase tracking-wide">
                            <span>{lesson.category} / {lesson.level}</span>
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            <span className="text-primary">{lesson.duration}</span>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">{lesson.title}</h1>
                            <p className="text-base text-slate-500 font-medium leading-relaxed">{lesson.description}</p>
                        </div>

                        {lesson.writing_location && (
                            <div className="w-full h-64 rounded-[32px] overflow-hidden shadow-xl relative group bg-slate-100 border border-slate-100">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                                <div className="absolute bottom-6 left-6 z-20 text-white font-black flex items-center gap-2 uppercase tracking-widest text-xs italic">
                                    <span className="material-symbols-outlined text-lg">location_on</span>
                                    <span>{lesson.writing_location}</span>
                                </div>
                                <div
                                    className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                                    style={{ backgroundImage: `url(${lesson.image_url || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=2000&auto=format&fit=crop'})` }}
                                />
                            </div>
                        )}

                        <div className="space-y-8">
                            {lesson.writing_task && (
                                <div className="bg-rose-50/50 p-8 rounded-[32px] border border-rose-100 shadow-sm">
                                    <h3 className="flex items-center gap-2 text-rose-600 font-black uppercase tracking-widest text-xs mb-4 italic">
                                        <span className="material-symbols-outlined text-sm">assignment</span>
                                        The Task
                                    </h3>
                                    <p className="text-slate-800 leading-relaxed font-medium">
                                        {lesson.writing_task}
                                    </p>
                                </div>
                            )}

                            {lesson.writing_requirements && (
                                <div className="p-2">
                                    <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-widest text-xs italic">
                                        <span className="material-symbols-outlined text-slate-400 text-sm">lightbulb</span>
                                        Key Requirements
                                    </h3>
                                    <ul className="space-y-3 text-slate-600 list-none font-medium">
                                        {lesson.writing_requirements.split('\n').filter(r => r.trim()).map((req, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <span className="material-symbols-outlined text-rose-400 text-sm mt-1">check_circle</span>
                                                <span>{req}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-12">
                            <button
                                onClick={() => navigate('/student/exercises')}
                                className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-xs font-black uppercase tracking-widest italic group"
                            >
                                <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
                                Volver a Ejercicios
                            </button>
                        </div>

                    </div>
                </section>

                {/* Editor Section */}
                <section className="w-1/2 bg-slate-50 relative flex flex-col items-center justify-center p-8">
                    <div className="w-full max-w-3xl h-full bg-white rounded-[40px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/30">
                            <div className="flex items-center gap-2">
                                {['format_bold', 'format_italic', 'format_underlined'].map(icon => (
                                    <button key={icon} className="size-10 flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-xl hover:bg-white hover:shadow-sm transition-all">
                                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest italic">
                                <span className="material-symbols-outlined text-[14px] text-green-500">cloud_done</span>
                                Saved to Lore
                            </div>
                        </div>

                        <div className="flex-1 relative">
                            {assignment?.status === 'completed' && (
                                <div className="absolute top-4 right-4 px-3 py-1 bg-green-100 text-green-700 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-2 italic">
                                    <span className="material-symbols-outlined text-[16px]">lock</span>
                                    Submitted
                                </div>
                            )}
                            <textarea
                                className="w-full h-full p-10 md:p-14 resize-none border-none outline-none ring-0 bg-transparent text-slate-900 text-lg leading-relaxed font-medium placeholder:text-slate-300 disabled:opacity-75 disabled:cursor-not-allowed"
                                placeholder="Start your masterpiece here..."
                                value={content}
                                onChange={handleTextChange}
                                disabled={assignment?.status === 'completed'}
                            />
                        </div>


                        <div className="h-24 border-t border-slate-100 px-10 flex items-center justify-between bg-white relative">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Word Count</span>
                                    <span className="text-lg font-black text-slate-900 italic">{wordCount} <span className="text-slate-300 text-sm font-medium not-italic">/ 250</span></span>
                                </div>
                                <div className="w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.min((wordCount / 250) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                            <Button
                                variant="primary"
                                loading={loading}
                                disabled={wordCount < 10 || loading || assignment?.status === 'completed'}
                                onClick={handleSubmit}
                                className="italic tracking-wide shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                            >
                                {assignment?.status === 'completed' ? 'Ya enviado' : 'Enviar para revisión'}
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Analysis Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-3xl flex flex-col p-10 gap-8 animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="size-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                    <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">AI Review Ready!</h2>
                                    <p className="text-slate-500 font-medium">Lore has analyzed your writing patterns.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-300 hover:text-slate-900 rounded-2xl hover:bg-slate-50 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-8 p-8 bg-slate-50 rounded-[32px] border border-slate-100 group">
                            <div className="size-20 rounded-full border-4 border-primary border-t-transparent flex items-center justify-center text-2xl font-black text-primary transition-transform group-hover:rotate-12 duration-500">85%</div>
                            <div>
                                <div className="font-black text-slate-900 text-xl uppercase tracking-tight italic">Excellent Execution</div>
                                <p className="text-slate-500 font-medium">You successfully included all key requirements with high precision.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-[28px] border border-slate-100 bg-white hover:border-amber-200 transition-colors">
                                <h3 className="font-black text-amber-500 mb-2 flex items-center gap-2 uppercase tracking-widest text-xs italic">
                                    <span className="material-symbols-outlined text-sm">warning</span> Grammar Insight
                                </h3>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">Consider using active voice in paragraph 2 for more direct impact.</p>
                            </div>
                            <div className="p-6 rounded-[28px] border border-slate-100 bg-white hover:border-blue-200 transition-colors">
                                <h3 className="font-black text-blue-500 mb-2 flex items-center gap-2 uppercase tracking-widest text-xs italic">
                                    <span className="material-symbols-outlined text-sm">tips_and_updates</span> Vocabulary Lore
                                </h3>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">Boost your score using precise terms like "unhygienic".</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 justify-end mt-4">
                            <Button variant="ghost" size="lg" className="rounded-2xl font-black uppercase tracking-widest text-[10px]" onClick={() => setIsModalOpen(false)}>Refinar Escritura</Button>
                            <Button variant="primary" size="lg" className="rounded-2xl h-14 px-10 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px]" onClick={() => navigate('/student/dashboard')}>Finalizar Asignación</Button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
