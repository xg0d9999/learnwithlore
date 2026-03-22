import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface ExerciseCategory {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    path: string;
    count?: string;
}

export default function ExerciseHub() {
    const navigate = useNavigate();
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCounts = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('assignments')
                .select('lesson:lessons(category)')
                .eq('student_id', user.id);

            if (data) {
                const categoryCounts: Record<string, number> = {};
                data.forEach((item: any) => {
                    const cat = item.lesson?.category?.toLowerCase();
                    if (cat) {
                        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                    }
                });
                setCounts(categoryCounts);
            }
            setLoading(false);
        };

        fetchCounts();
    }, []);

    const categories: ExerciseCategory[] = [
        {
            id: 'grammar',
            title: 'Grammar Lab',
            description: 'Master English structures with interactive grammar lessons and drills.',
            icon: 'science',
            color: 'bg-blue-500',
            path: '/student/lessons?category=grammar',
            count: loading ? '...' : `${counts['grammar'] || 0} Asignaciones`
        },
        {
            id: 'vocabulary',
            title: 'Vocab Explorer',
            description: 'Expand your word bank with themed lists and contextual examples.',
            icon: 'translate',
            color: 'bg-emerald-500',
            path: '/student/vocabulary',
            count: '1.2k Words'
        },
        {
            id: 'flashcards',
            title: 'Flash Cards',
            description: 'Spaced repetition system to help you memorize vocabulary efficiently.',
            icon: 'style',
            color: 'bg-amber-500',
            path: '/student/flashcards',
            count: 'Premium'
        },
        {
            id: 'writing',
            title: 'Writing Lab',
            description: 'Improve your writing skills with guided prompts and tutor feedback.',
            icon: 'edit_note',
            color: 'bg-rose-500',
            path: '/student/lessons?category=writing',
            count: loading ? '...' : `${counts['writing'] || 0} Assignments`
        },
        {
            id: 'listening',
            title: 'Listening Practice',
            description: 'Sharpen your ears with authentic audio content and comprehension tasks.',
            icon: 'headphones',
            color: 'bg-purple-500',
            path: '/student/lessons?category=listening',
            count: loading ? '...' : `${counts['listening'] || 0} Audios`
        },
        {
            id: 'reading',
            title: 'Reading Realm',
            description: 'Explore interesting articles and stories tailored to your level.',
            icon: 'menu_book',
            color: 'bg-indigo-500',
            path: '/student/lessons?category=reading',
            count: loading ? '...' : `${counts['reading'] || 0} Stories`
        }
    ];

    return (
        <div className="max-w-[1200px] w-full mx-auto p-8 lg:p-12 pb-24 flex flex-col gap-10">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-slate-500">
                <a className="hover:text-primary transition-colors" href="#">Home</a>
                <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">Exercise Hub</span>
            </nav>

            {/* Header Section */}
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight uppercase">
                    Practice & Exercises
                </h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg text-lg font-medium">
                    Choose an area to focus on today. Every exercise helps you get closer to fluency.
                </p>
            </div>

            {/* Hub Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {categories.map((cat, index) => (
                    <div 
                        key={cat.id}
                        onClick={() => cat.path !== '#' && navigate(cat.path)}
                        style={{ 
                            animationDelay: `${index * 150}ms`,
                            animationFillMode: 'backwards' 
                        }}
                        className="group relative bg-white dark:bg-sidebar-dark rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out"
                    >
                        {/* Background Decoration */}
                        <div className={`absolute top-0 right-0 w-32 h-32 ${cat.color} opacity-[0.03] rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700`}></div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-8">
                                <div className={`size-16 rounded-[24px] ${cat.color} shadow-lg shadow-${cat.color.split('-')[1]}-500/20 flex items-center justify-center text-white`}>
                                    <span className="material-symbols-outlined text-3xl">{cat.icon}</span>
                                </div>
                                {cat.count && (
                                    <span className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-100 dark:border-slate-800">
                                        {cat.count}
                                    </span>
                                )}
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight group-hover:text-primary transition-colors italic">
                                {cat.title}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-8 flex-1">
                                {cat.description}
                            </p>

                            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] group-hover:gap-4 transition-all">
                                {cat.id === 'flashcards' && cat.count === 'Coming Soon' ? 'Soon' : 'Start Exploring'}
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Daily Challenge Placeholder */}
            <div className="mt-12 p-10 rounded-[40px] bg-gradient-to-br from-primary to-primary-dark text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-1000"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20">Daily Quest</span>
                            <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Ends in 4h 22m</span>
                        </div>
                        <h2 className="text-3xl font-black mb-3 uppercase tracking-tight italic">The Verb Master Challenge</h2>
                        <p className="text-white/80 font-medium text-lg">
                            Complete 3 grammar exercises today to earn a double XP boost and unlock a special achievement.
                        </p>
                    </div>
                    <button className="bg-white text-primary px-10 h-16 rounded-[24px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform active:scale-95 whitespace-nowrap">
                        Accept Quest
                    </button>
                </div>
            </div>
        </div>
    );
}
