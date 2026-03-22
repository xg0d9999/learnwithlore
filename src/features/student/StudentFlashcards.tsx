import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Flashcard {
    es: string;
    en: string;
    image_url?: string;
}

interface FlashcardDeck {
    id: string;
    title: string;
    category: string;
    cards: Flashcard[];
    level: string;
}

export default function StudentFlashcards() {
    const { user } = useAuth();
    const [decks, setDecks] = useState<FlashcardDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
    const [currentCardIdx, setCurrentCardIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [animDirection, setAnimDirection] = useState<'left' | 'right' | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [studentLevel, setStudentLevel] = useState<string | null>(null);

    useEffect(() => {
        if (user) fetchDecks();
    }, [user]);

    const fetchDecks = async () => {
        setLoading(true);
        try {
            // 1. Get student level
            const { data: profile } = await supabase
                .from('profiles')
                .select('level')
                .eq('id', user?.id)
                .single();
            
            const level = profile?.level || 'A1';
            setStudentLevel(level);

            // 2. Fetch all flashcard blocks from lessons of that level
            const { data, error } = await supabase
                .from('exercises')
                .select(`
                    id,
                    content,
                    lesson:lessons (
                        title,
                        level,
                        category
                    )
                `)
                .eq('exercise_type', 'flashcards')
                .eq('lessons.level', level);

            if (error) throw error;

            const formattedDecks = (data || [])
                .filter(d => d.lesson) // Ensure lesson join worked
                .map((d: any) => {
                    const lesson = Array.isArray(d.lesson) ? d.lesson[0] : d.lesson;
                    return {
                        id: d.id,
                        title: d.content.title || lesson?.title || "Mazo sin título",
                        category: d.content.category || lesson?.category || "General",
                        cards: d.content.cards || [],
                        level: lesson?.level || level
                    };
                });

            setDecks(formattedDecks);
        } catch (err) {
            console.error('Error fetching flashcards:', err);
        } finally {
            setLoading(false);
        }
    };

    const speak = (text: string, lang: string) => {
        const msg = new SpeechSynthesisUtterance(text);
        
        // Find a better voice (Natural/Premium sounding)
        const voices = window.speechSynthesis.getVoices();
        const preferredVoices = lang === 'es' 
            ? ['Google español', 'Mónica', 'Paulina', 'Diego'] 
            : ['Google US English', 'Samantha', 'Alex', 'Daniel'];
        
        const voice = voices.find(v => preferredVoices.some(pv => v.name.includes(pv))) || 
                      voices.find(v => v.lang.startsWith(lang));
        
        if (voice) msg.voice = voice;
        msg.rate = 0.95; // Slightly slower for clarity
        msg.pitch = 1.05; // Slightly higher for "aliveness"
        msg.lang = lang === 'es' ? 'es-ES' : 'en-US';
        
        window.speechSynthesis.cancel(); // Stop any previous
        window.speechSynthesis.speak(msg);
    };

    if (loading) return <div className="p-20 text-center animate-pulse">Cargando tus Flashcards...</div>;

    if (selectedDeck) {
        const card = selectedDeck.cards[currentCardIdx];
        return (
            <div className="flex-1 flex flex-col h-full bg-slate-50">
                <header className="px-8 py-6 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedDeck(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                            <span className="material-symbols-outlined text-slate-400">arrow_back</span>
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedDeck.title}</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedDeck.category} • NIVEL {selectedDeck.level}</p>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-8 flex flex-col items-center justify-center gap-8">
                    {!card ? (
                        <div className="text-slate-400 font-bold">No hay cartas en este mazo</div>
                    ) : (
                        <div className="w-full max-w-sm space-y-12">
                            {/* Flashcard Area */}
                            <div className="relative w-full max-w-sm aspect-[3/4] mx-auto">
                                <div 
                                    key={currentCardIdx}
                                    className={`w-full h-full perspective-2000 cursor-pointer group transition-all duration-500 ${
                                        isAnimating 
                                            ? animDirection === 'right' ? 'animate-slide-out-left' : 'animate-slide-out-right'
                                            : animDirection === 'right' ? 'animate-slide-in-right' : animDirection === 'left' ? 'animate-slide-in-left' : ''
                                    }`}
                                    onClick={() => setIsFlipped(!isFlipped)}
                                >
                                    <div className={`relative w-full h-full preserve-3d transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isFlipped ? 'rotate-y-180' : ''}`}>
                                        {/* Front */}
                                        <div className="absolute inset-0 backface-hidden bg-white rounded-[32px] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.12),0_18px_36px_-18px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col border border-slate-100/50 group-hover:shadow-[0_40px_80px_-12px_rgba(0,0,0,0.18)] transition-shadow duration-500">
                                            {/* Image Container - Premium Polaroid feel */}
                                            <div className="p-4 flex-1">
                                                <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-50 relative group">
                                                    {selectedDeck.cards[currentCardIdx].image_url ? (
                                                        <>
                                                            <div className="absolute inset-0 bg-black/5 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                            <img 
                                                                src={selectedDeck.cards[currentCardIdx].image_url} 
                                                                alt="" 
                                                                className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110" 
                                                            />
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 gap-3">
                                                            <span className="material-symbols-outlined text-6xl">photo_library</span>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Imagen No Disponible</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Floating Speaker Button */}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); speak(selectedDeck.cards[currentCardIdx].es, 'es'); }}
                                                        className="absolute bottom-4 right-4 size-12 rounded-xl bg-white/90 backdrop-blur shadow-xl border border-white flex items-center justify-center text-primary hover:scale-110 hover:bg-white transition-all active:scale-95 z-20"
                                                    >
                                                        <span className="material-symbols-outlined text-2xl">volume_up</span>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Content Area */}
                                            <div className="px-8 pt-2 pb-10 text-center flex flex-col items-center">
                                                <div className="w-8 h-1 bg-slate-100 rounded-full mb-6"></div>
                                                <span className="text-[10px] font-black tracking-[0.25em] text-primary/40 uppercase mb-3 px-3 py-1 bg-primary/5 rounded-full">ESPAÑOL</span>
                                                <h3 className="text-[32px] font-black text-slate-900 leading-tight tracking-tight drop-shadow-sm">{selectedDeck.cards[currentCardIdx].es}</h3>
                                            </div>
                                        </div>

                                        {/* Back */}
                                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-[32px] border border-primary/5 shadow-[0_30px_60px_-12px_rgba(13,89,242,0.1),0_18px_36px_-18px_rgba(13,89,242,0.1)] overflow-hidden flex flex-col">
                                            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center relative bg-gradient-to-b from-primary/[0.02] to-transparent">
                                                <div className="size-20 rounded-[28px] bg-primary/5 text-primary flex items-center justify-center mb-8 shadow-inner border border-primary/10">
                                                    <span className="material-symbols-outlined text-4xl">translate</span>
                                                </div>
                                                <span className="text-[10px] font-black tracking-[0.25em] text-primary/40 uppercase mb-3 px-3 py-1 bg-primary/5 rounded-full">TRADUCCIÓN</span>
                                                <h3 className="text-[44px] font-black text-slate-900 italic tracking-tight leading-none mb-2">{selectedDeck.cards[currentCardIdx].en}</h3>
                                                <div className="w-12 h-1.5 bg-primary/10 rounded-full mt-6"></div>
                                                
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); speak(selectedDeck.cards[currentCardIdx].en, 'en'); }}
                                                    className="mt-10 size-14 rounded-2xl bg-white shadow-xl border border-primary/10 flex items-center justify-center text-primary hover:scale-110 transition-all active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-3xl">volume_up</span>
                                                </button>
                                            </div>
                                            <div className="p-6 text-center border-t border-slate-50 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                                                Clica para voltear
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-between">
                                <button 
                                    disabled={currentCardIdx === 0 || isAnimating}
                                    onClick={async () => { 
                                        if (isAnimating) return;
                                        if (isFlipped) {
                                            setIsFlipped(false);
                                            await new Promise(r => setTimeout(r, 400));
                                        }
                                        setAnimDirection('left');
                                        setIsAnimating(true);
                                        await new Promise(r => setTimeout(r, 400));
                                        setCurrentCardIdx(v => v - 1); 
                                        setIsAnimating(false);
                                    }}
                                    className="size-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary disabled:opacity-30 transition-all bg-white shadow-sm"
                                >
                                    <span className="material-symbols-outlined">arrow_back_ios_new</span>
                                </button>
                                
                                <div className="text-center">
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">{currentCardIdx + 1} / {selectedDeck.cards.length}</p>
                                    <div className="flex gap-1.5 justify-center">
                                        {selectedDeck.cards.map((_, i) => (
                                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentCardIdx ? 'w-6 bg-primary' : 'w-1.5 bg-slate-200'}`} />
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    disabled={currentCardIdx === selectedDeck.cards.length - 1 || isAnimating}
                                    onClick={async () => { 
                                        if (isAnimating) return;
                                        if (isFlipped) {
                                            setIsFlipped(false);
                                            await new Promise(r => setTimeout(r, 400));
                                        }
                                        setAnimDirection('right');
                                        setIsAnimating(true);
                                        await new Promise(r => setTimeout(r, 400));
                                        setCurrentCardIdx(v => v + 1); 
                                        setIsAnimating(false);
                                    }}
                                    className="size-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary disabled:opacity-30 transition-all bg-white shadow-sm"
                                >
                                    <span className="material-symbols-outlined">arrow_forward_ios</span>
                                </button>
                            </div>

                        </div>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] w-full mx-auto p-8 lg:p-12 pb-24 flex flex-col gap-10">
            <header>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 italic">Flashcards</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Revisa tu vocabulario aprendido nivel {studentLevel}.</p>
            </header>

            {decks.length === 0 ? (
                <div className="bg-white dark:bg-sidebar-dark rounded-[32px] p-20 text-center border border-slate-200 dark:border-slate-800 border-dashed">
                    <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">style</span>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No hay mazos de flashcards para este nivel todavía.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {decks.map((deck) => (
                        <div 
                            key={deck.id}
                            onClick={() => { setSelectedDeck(deck); setCurrentCardIdx(0); setIsFlipped(false); }}
                            className="group bg-white dark:bg-sidebar-dark rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden relative"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10">
                                <div className="size-16 rounded-[24px] bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all shadow-lg shadow-primary/5">
                                    <span className="material-symbols-outlined text-3xl">style</span>
                                </div>
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 block">{deck.category}</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tight line-clamp-2">{deck.title}</h3>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{deck.cards.length} CARTAS</span>
                                    <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                        <span className="material-symbols-outlined">play_arrow</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
