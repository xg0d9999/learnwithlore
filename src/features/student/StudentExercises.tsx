import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { logUserActivity } from '../../utils/activityLogger';

interface ExerciseBlock {
    id: string;
    type: string;
    content: any;
}

export default function StudentExercises() {
    const { id: lessonId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
    const [currentBlockIdx, setCurrentBlockIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [xpAwarded, setXpAwarded] = useState(0);
    const [isChecking, setIsChecking] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [totalGainedXp, setTotalGainedXp] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [isCompletingSession, setIsCompletingSession] = useState(false);
    
    // Premium Drag State
    const [dragInfo, setDragInfo] = useState<{ 
        text: string; 
        x: number; 
        y: number; 
        rotation: number;
        blockId: string;
    } | null>(null);
    const [activeHoverBlank, setActiveHoverBlank] = useState<number | null>(null);
    
    // Flashcard State
    const [cardStates, setCardStates] = useState<Record<string, { currentIdx: number, isFlipped: boolean, showFront: 'es' | 'en' }>>({});

    // Review mode state
    const [searchParams] = useSearchParams();
    const isReviewMode = searchParams.get('review') === 'true';
    const [reviewScore, setReviewScore] = useState<number | null>(null);

    useEffect(() => {
        if (lessonId) fetchLesson();
    }, [lessonId]);

    const fetchLesson = async () => {
        setLoading(true);
        try {
            if (isReviewMode && user) {
                const { data: assignmentData } = await supabase
                    .from('assignments')
                    .select('score')
                    .eq('student_id', user.id)
                    .eq('lesson_id', lessonId)
                    .single();
                
                if (assignmentData) {
                    setReviewScore(assignmentData.score || 100);
                }

                // Try to get their saved answers
                const { data: sub } = await supabase
                    .from('exercise_submissions')
                    .select('content')
                    .eq('user_id', user.id)
                    .eq('lesson_id', lessonId)
                    .eq('category', 'exercises')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (sub && sub.content) {
                    try {
                        setAnswers(JSON.parse(sub.content));
                    } catch(e) {}
                }
            }

            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('order_index', { ascending: true });

            if (error) throw error;
            setBlocks(data.map(d => ({ id: d.id, type: d.exercise_type, content: d.content })));
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (isReviewMode) {
            if (currentBlockIdx < blocks.length - 1) {
                setCurrentBlockIdx(prev => prev + 1);
            } else {
                setIsCompletingSession(true);
                setTimeout(() => {
                    setIsFinished(true);
                }, 600);
            }
            return;
        }

        const currentBlock = blocks[currentBlockIdx];
        
        // If it's a question and we haven't checked yet
        const isQuestion = ['question_mc', 'audio_vocab', 'question_fill_drag', 'question_fill_typed'].includes(currentBlock.type);
        
        if (isQuestion && !isChecking) {
            const userAnswer = answers[currentBlock.id];
            if (userAnswer === undefined) return; // Must provide an answer/interaction

            let isCorrect = false;
            if (currentBlock.type === 'question_mc' || currentBlock.type === 'audio_vocab') {
                isCorrect = userAnswer === currentBlock.content.correctIdx;
            } else if (currentBlock.type === 'question_fill_drag' || currentBlock.type === 'question_fill_typed') {
                // Check all blanks
                const text = currentBlock.content.text || '';
                const blanks = text.match(/\[[^\]]+\]/g) || [];
                const correctAnswers = blanks.map((b: string) => b.slice(1, -1));
                const studentAnswers = answers[currentBlock.id] || {};
                
                isCorrect = correctAnswers.every((val: string, idx: number) => 
                    (studentAnswers[idx] || '').trim().toLowerCase() === val.trim().toLowerCase()
                );
            }

            if (isCorrect) setCorrectCount(prev => prev + 1);
            setFeedback(isCorrect ? 'correct' : 'incorrect');
            setTotalGainedXp(prev => prev + (isCorrect ? 20 : 10));
            setIsChecking(true);
            return;
        }

        // Reset for next block
        setIsChecking(false);
        setFeedback(null);

        if (currentBlockIdx < blocks.length - 1) {
            setCurrentBlockIdx(prev => prev + 1);
        } else {
            setIsCompletingSession(true);
            setTimeout(() => {
                handleComplete();
            }, 600); // Allow fade out animation
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const questionBlocks = blocks.filter(b => ['question_mc', 'audio_vocab', 'question_fill_drag', 'question_fill_typed'].includes(b.type));
            const accuracy = questionBlocks.length > 0 
                ? Math.round((correctCount / questionBlocks.length) * 100) 
                : 100;

            if (user) {
                await logUserActivity(user.id, 'assignment', `Completed interactive assignment with ${accuracy}% accuracy.`);
                await supabase.from('assignments')
                    .update({ status: 'completed', score: accuracy, completed_at: new Date().toISOString() })
                    .eq('student_id', user.id)
                    .eq('lesson_id', lessonId);

                const { data: prog } = await supabase.from('user_progress').select('total_xp').eq('user_id', user.id).single();
                await supabase.from('user_progress').update({ total_xp: (prog?.total_xp || 0) + totalGainedXp }).eq('user_id', user.id);

                await supabase.from('exercise_submissions').insert([{
                    user_id: user.id,
                    lesson_id: lessonId,
                    content: JSON.stringify(answers),
                    category: 'exercises'
                }]);
            }

            setXpAwarded(totalGainedXp);
            setIsFinished(true);
        } catch (err) {
            console.error('Complete error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Premium Drag Handlers
    const handleDragStart = (e: React.PointerEvent, text: string, blockId: string) => {
        if (isChecking || isReviewMode) return;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        setDragInfo({
            text,
            x: e.clientX,
            y: e.clientY,
            rotation: 0,
            blockId
        });
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (!dragInfo) return;
            
            const deltaX = e.clientX - dragInfo.x;
            const newRotation = Math.max(-15, Math.min(15, deltaX * 2.5));

            setDragInfo(prev => prev ? {
                ...prev,
                x: e.clientX,
                y: e.clientY,
                rotation: newRotation * 0.7 + prev.rotation * 0.3
            } : null);

            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const blankEl = elements.find(el => el.hasAttribute('data-blank-idx'));
            if (blankEl) {
                setActiveHoverBlank(parseInt(blankEl.getAttribute('data-blank-idx') || '-1'));
            } else {
                setActiveHoverBlank(null);
            }
        };

        const handleUp = () => {
            if (!dragInfo) return;

            if (activeHoverBlank !== null) {
                const blockAnswers = { ...(answers[dragInfo.blockId] || {}), [activeHoverBlank]: dragInfo.text };
                setAnswers({ ...answers, [dragInfo.blockId]: blockAnswers, lastActiveBlank: undefined });
            }

            setDragInfo(null);
            setActiveHoverBlank(null);
        };

        if (dragInfo) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [dragInfo, activeHoverBlank, answers]);

    if (loading && blocks.length === 0) {
        return <div className="h-screen flex items-center justify-center font-bold text-slate-400 animate-pulse">Initializing Lab Environment...</div>;
    }

    if (isFinished) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center animate-scale-up relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-400 rounded-full blur-[160px] opacity-40 pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-400 rounded-full blur-[160px] opacity-40 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="size-32 rounded-[40px] bg-green-500 text-white flex items-center justify-center shadow-2xl shadow-green-200 mb-8 animate-bounce">
                        <span className="material-symbols-outlined text-6xl">verified</span>
                    </div>
                    <h1 className="text-6xl font-black text-slate-900 mb-4 tracking-tight">Asignación Completada!</h1>
                    <p className="text-xl text-slate-500 mb-12 max-w-lg leading-relaxed font-medium">
                        Has superado con éxito todos los ejercicios y materiales de esta asignación.
                    </p>
                    
                    <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200 shadow-xl flex items-center gap-10 mb-12">
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Accuracy</span>
                            <span className="text-4xl font-black text-slate-900">
                                {isReviewMode && reviewScore !== null 
                                    ? reviewScore 
                                    : Math.round((correctCount / Math.max(1, blocks.filter(b => ['question_mc', 'audio_vocab', 'question_fill_drag', 'question_fill_typed'].includes(b.type)).length)) * 100)}%
                            </span>
                        </div>
                        {!isReviewMode && (
                            <>
                                <div className="h-12 w-px bg-slate-200" />
                                <div className="flex flex-col items-center">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">XP Gained</span>
                                    <span className="text-4xl font-black text-amber-500">+{xpAwarded}</span>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <Button variant="primary" size="lg" className="px-16 py-8 text-lg rounded-[28px] shadow-2xl shadow-primary/20 hover:scale-105 transition-transform" onClick={() => navigate('/student/dashboard')}>
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    if (blocks.length === 0) return null;
    const currentBlock = blocks[currentBlockIdx];
    const progress = Math.round((currentBlockIdx / blocks.length) * 100);

    return (
        <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden">
            <div className="absolute top-[-15%] right-[-10%] w-[700px] h-[700px] bg-blue-400 rounded-full blur-[180px] opacity-40 pointer-events-none" />
            <div className="absolute bottom-[-15%] left-[-10%] w-[700px] h-[700px] bg-purple-400 rounded-full blur-[180px] opacity-40 pointer-events-none" />

            <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-6 relative z-30">
                <button onClick={() => navigate('/student/dashboard')} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                    <span className="material-symbols-outlined text-slate-400">close</span>
                </button>
                <div className="flex-1 flex items-center gap-4">
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-[1px]">
                        <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs font-black text-slate-400">{progress}%</span>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="material-symbols-outlined text-amber-500 filled text-[20px]">workspace_premium</span>
                    <span className="text-sm font-black text-amber-600">PARTE {currentBlockIdx + 1}</span>
                </div>
            </header>

            <main className={`flex-1 overflow-y-auto p-4 md:p-12 flex flex-col items-center relative z-10 transition-all duration-700 ${isCompletingSession ? 'opacity-0 scale-95' : 'opacity-100'}`}>
                <div key={currentBlockIdx} className="w-full max-w-2xl animate-slide-in-right">
                    {currentBlock ? (
                        <div className="space-y-8">
                            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-200 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-blue-400" />

                                {currentBlock.type === 'text' && (
                                    <div className="prose prose-slate max-w-none">
                                        <h2 className="text-2xl font-bold text-slate-900 mb-4">{currentBlock.content.title}</h2>
                                        <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{currentBlock.content.text}</p>
                                    </div>
                                )}

                                {currentBlock.type === 'document' && (
                                    <div className="flex flex-col gap-6">
                                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm relative overflow-hidden group">
                                            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative z-10">
                                                <span className="material-symbols-outlined text-3xl">
                                                    {currentBlock.content.fileType?.includes('pdf') ? 'picture_as_pdf' : 
                                                     currentBlock.content.fileType?.includes('image') ? 'image' : 
                                                     currentBlock.content.fileType?.includes('video') ? 'movie' : 'description'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0 relative z-10">
                                                <h3 className="text-lg font-black text-slate-900 truncate">
                                                    {currentBlock.content.fileName || 'Material de Clase'}
                                                </h3>
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                                    {currentBlock.content.fileType?.split('/')[1]?.toUpperCase() || 'DOCUMENTO'} 
                                                    {currentBlock.content.size ? ` • ${(currentBlock.content.size / 1024 / 1024).toFixed(2)} MB` : ''}
                                                </p>
                                            </div>
                                            {!currentBlock.content.url?.includes('drive.google.com') && (
                                                <a href={currentBlock.content.url} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                                                    Ver / Descargar
                                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                </a>
                                            )}
                                        </div>
                                        <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
                                            {currentBlock.content.url?.includes('drive.google.com') ? (
                                                <iframe 
                                                    src={currentBlock.content.url} 
                                                    className="w-full h-[600px] border-none" 
                                                    title="Drive Preview"
                                                    allow="autoplay"
                                                />
                                            ) : (
                                                <>
                                                    {currentBlock.content.fileType?.includes('pdf') ? (
                                                        <iframe src={`${currentBlock.content.url}#toolbar=0`} className="w-full h-[600px] border-none" title="Theory Document" />
                                                    ) : (
                                                        <img src={currentBlock.content.url} alt="Theory" className="w-full h-auto max-h-[800px] object-contain" />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {currentBlock.type === 'audio' && (
                                    <div className="flex flex-col items-center gap-6 py-8">
                                        <div className="size-20 rounded-full bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/30 animate-pulse">
                                            <span className="material-symbols-outlined text-4xl">graphic_eq</span>
                                        </div>
                                        <div className="text-center">
                                            <h2 className="text-2xl font-bold text-slate-900 mb-1">Listen carefully</h2>
                                            <p className="text-sm text-slate-500 font-medium">Focus on pronunciation and context.</p>
                                        </div>
                                        {currentBlock.content.url?.includes('drive.google.com') ? (
                                            <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
                                                <iframe 
                                                    src={currentBlock.content.url} 
                                                    className="w-full h-[150px] border-none" 
                                                    title="Audio Preview"
                                                    allow="autoplay"
                                                />
                                            </div>
                                        ) : (
                                            <audio controls src={currentBlock.content.url} className="w-full mt-4" />
                                        )}
                                    </div>
                                )}

                                {(currentBlock.type === 'question_mc' || currentBlock.type === 'audio_vocab') && (
                                    <div className={`space-y-6 transition-all duration-300 ${feedback === 'incorrect' ? 'animate-shake' : ''}`}>
                                        {currentBlock.type === 'audio_vocab' && (
                                            <div className="flex justify-center mb-6">
                                                <button onClick={() => new Audio(currentBlock.content.audio_url).play()} className="size-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-black transition-all shadow-xl active:scale-95">
                                                    <span className="material-symbols-outlined text-3xl">volume_up</span>
                                                </button>
                                            </div>
                                        )}
                                        <h2 className="text-2xl font-bold text-slate-900 text-center">{currentBlock.content.question}</h2>
                                        <div className="grid grid-cols-1 gap-3">
                                            {currentBlock.content.options?.map((opt: string, i: number) => {
                                                const isSelected = answers[currentBlock.id] === i;
                                                const isCorrectIdx = currentBlock.content.correctIdx === i;
                                                const showOutcome = isChecking || isReviewMode;
                                                let btnStyles = 'border-slate-100 hover:border-slate-200 bg-white';
                                                if (isSelected) {
                                                    if (showOutcome) btnStyles = isCorrectIdx ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
                                                    else btnStyles = 'border-primary bg-primary/5';
                                                } else if (showOutcome && isCorrectIdx) {
                                                    btnStyles = 'border-green-500 bg-green-50 opacity-70';
                                                }
                                                return (
                                                    <button key={i} disabled={showOutcome} onClick={() => setAnswers({ ...answers, [currentBlock.id]: i })} className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${btnStyles}`}>
                                                        <span className={`font-bold transition-colors ${isSelected ? (showOutcome ? (isCorrectIdx ? 'text-green-700' : 'text-red-700') : 'text-primary') : 'text-slate-600'}`}>
                                                            {opt}
                                                        </span>
                                                        <div className={`size-6 rounded-full border-2 transition-all flex items-center justify-center ${isSelected ? (showOutcome ? (isCorrectIdx ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500') : 'border-primary bg-primary') : 'border-slate-200 bg-white'}`}>
                                                            {isSelected && <span className="material-symbols-outlined text-white text-[16px] font-bold">{showOutcome ? (isCorrectIdx ? 'check' : 'close') : 'check'}</span>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {(currentBlock.type === 'question_fill_drag' || currentBlock.type === 'question_fill_typed') && (
                                    <div className={`space-y-8 transition-all duration-300 ${feedback === 'incorrect' ? 'animate-shake' : ''}`}>
                                        <div className="text-xl font-medium text-slate-700 leading-loose text-center bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                            {(() => {
                                                const parts = (currentBlock.content.text || '').split(/(\[[^\]]+\])/);
                                                let blankCounter = 0;
                                                return parts.map((part: string, i: number) => {
                                                    if (part.startsWith('[') && part.endsWith(']')) {
                                                        const currentIdx = blankCounter++;
                                                        const studentAns = (answers[currentBlock.id] || {})[currentIdx] || '';
                                                        const isCorrect = part.slice(1, -1).trim().toLowerCase() === studentAns.trim().toLowerCase();
                                                        const showOutcome = isChecking || isReviewMode;
                                                        if (currentBlock.type === 'question_fill_typed') {
                                                            return (
                                                                <input key={i} type="text" disabled={showOutcome} value={studentAns} onChange={e => {
                                                                    const newAns = { ...(answers[currentBlock.id] || {}), [currentIdx]: e.target.value };
                                                                    setAnswers({ ...answers, [currentBlock.id]: newAns });
                                                                }} className={`inline-block w-32 mx-1 px-3 py-1 rounded-xl border-2 transition-all outline-none text-center font-bold ${showOutcome ? (isCorrect ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-slate-200 focus:border-primary bg-white text-primary'}`} placeholder="..." />
                                                            );
                                                        } else {
                                                            return (
                                                                <div key={i} data-blank-idx={currentIdx} onClick={() => {
                                                                    if (showOutcome) return;
                                                                    setAnswers({ ...answers, lastActiveBlank: currentIdx });
                                                                }} className={`inline-flex items-center justify-center min-w-24 min-h-10 mx-1 px-3 py-1 rounded-xl border-2 border-dashed transition-all cursor-pointer ${showOutcome ? (isCorrect ? 'border-green-500 bg-green-50 text-green-700 border-solid' : 'border-red-500 bg-red-50 text-red-700 border-solid') : (answers.lastActiveBlank === currentIdx || activeHoverBlank === currentIdx ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-105' : 'border-slate-300 bg-slate-100/50 hover:border-slate-400 hover:bg-slate-200')}`}>
                                                                    <span className="font-black text-sm">{studentAns || ''}</span>
                                                                </div>
                                                            );
                                                        }
                                                    }
                                                    return <span key={i}>{part}</span>;
                                                });
                                            })()}
                                        </div>

                                        {currentBlock.type === 'question_fill_drag' && !isChecking && !isReviewMode && (
                                            <div className="flex flex-wrap justify-center gap-3 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                                {(() => {
                                                    const text = currentBlock.content.text || '';
                                                    const blanks = text.match(/\[[^\]]+\]/g) || [];
                                                    const options = blanks.map((b: string) => b.slice(1, -1));
                                                    const sortedOptions = [...options].sort();
                                                    return sortedOptions.map((opt: string, i: number) => {
                                                        const isUsed = Object.values(answers[currentBlock.id] || {}).includes(opt);
                                                        return (
                                                            <button key={i} onPointerDown={(e) => handleDragStart(e, opt, currentBlock.id)} onClick={() => {
                                                                const activeBlank = answers.lastActiveBlank;
                                                                if (activeBlank !== undefined) {
                                                                    const blockAnswers = { ...(answers[currentBlock.id] || {}), [activeBlank]: opt };
                                                                    setAnswers({ ...answers, [currentBlock.id]: blockAnswers, lastActiveBlank: undefined });
                                                                }
                                                            }} className={`px-5 py-2.5 rounded-2xl border-2 font-black text-sm shadow-sm transition-all active:scale-95 touch-none select-none ${isUsed ? 'opacity-30 border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary hover:shadow-lg hover:shadow-primary/10 cursor-grab active:cursor-grabbing'}`}>
                                                                {opt}
                                                            </button>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        )}

                                        {feedback && !isReviewMode && (
                                            <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 animate-scale-up ${feedback === 'correct' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                                                <span className="material-symbols-outlined font-bold">{feedback === 'correct' ? 'verified' : 'error'}</span>
                                                <div className="flex-1">
                                                    <p className="font-black text-sm">{feedback === 'correct' ? 'Brilliant!' : 'Check your answers'}</p>
                                                    <p className="text-xs opacity-80">{feedback === 'correct' ? 'You earned +20 XP' : 'You earned +10 XP for trying'}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {currentBlock.type === 'flashcards' && (
                                    <div className="flex flex-col items-center gap-8 py-4">
                                        <div className="text-center">
                                            <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-1 block">{currentBlock.content.category || 'Flashcards'}</span>
                                            <h2 className="text-2xl font-black text-slate-900">Review the vocabulary</h2>
                                        </div>

                                        {(() => {
                                            const state = cardStates[currentBlock.id] || { currentIdx: 0, isFlipped: false, showFront: currentBlock.content.showFront || 'es' };
                                            const card = (currentBlock.content.cards || [])[state.currentIdx];
                                            
                                            if (!card) return <div className="p-8 text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay cartas en este mazo</div>;

                                            const flip = () => setCardStates({ ...cardStates, [currentBlock.id]: { ...state, isFlipped: !state.isFlipped } });
                                            const next = () => setCardStates({ ...cardStates, [currentBlock.id]: { ...state, currentIdx: Math.min(state.currentIdx + 1, currentBlock.content.cards.length - 1), isFlipped: false } });
                                            const prev = () => setCardStates({ ...cardStates, [currentBlock.id]: { ...state, currentIdx: Math.max(state.currentIdx - 1, 0), isFlipped: false } });
                                            const swap = () => setCardStates({ ...cardStates, [currentBlock.id]: { ...state, showFront: state.showFront === 'es' ? 'en' : 'es' } });

                                            const speak = (e: any) => {
                                                e.stopPropagation();
                                                const text = state.isFlipped ? (state.showFront === 'es' ? card.en : card.es) : (state.showFront === 'es' ? card.es : card.en);
                                                const msg = new SpeechSynthesisUtterance(text);
                                                msg.lang = state.isFlipped ? (state.showFront === 'es' ? 'en-US' : 'es-ES') : (state.showFront === 'es' ? 'es-ES' : 'en-US');
                                                window.speechSynthesis.speak(msg);
                                            };

                                            return (
                                                <div className="w-full max-w-sm space-y-8">
                                                    {/* 3D Card Container */}
                                                    <div className="perspective-1000 w-full aspect-[4/5] cursor-pointer group" onClick={flip}>
                                                        <div className={`relative w-full h-full preserve-3d flip-transition ${state.isFlipped ? 'rotate-y-180' : ''}`}>
                                                            {/* Front Side */}
                                                            <div className="absolute inset-0 backface-hidden bg-white rounded-[32px] border-2 border-slate-100 shadow-2xl overflow-hidden flex flex-col">
                                                                <div className="flex-1 bg-slate-50 relative overflow-hidden">
                                                                    {card.image_url ? (
                                                                        <img src={card.image_url} alt="Flashcard" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                                            <span className="material-symbols-outlined text-6xl">image</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="p-8 text-center bg-white">
                                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">{state.showFront === 'es' ? 'SPANISH' : 'ENGLISH'}</span>
                                                                    <h3 className="text-3xl font-black text-slate-900">{state.showFront === 'es' ? card.es : card.en}</h3>
                                                                </div>
                                                            </div>

                                                            {/* Back Side */}
                                                            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary/5 rounded-[32px] border-2 border-primary/20 shadow-2xl overflow-hidden flex flex-col">
                                                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                                                    <div className="size-20 rounded-full bg-white flex items-center justify-center text-primary mb-6 shadow-xl shadow-primary/10">
                                                                        <span className="material-symbols-outlined text-4xl">translate</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 block">{state.showFront === 'es' ? 'ENGLISH' : 'SPANISH'}</span>
                                                                    <h3 className="text-4xl font-black text-slate-900 mb-6">{state.showFront === 'es' ? card.en : card.es}</h3>
                                                                    
                                                                    <button 
                                                                        onClick={speak}
                                                                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white hover:bg-black transition-all shadow-lg shadow-black/20 active:scale-95 group/audio"
                                                                    >
                                                                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">volume_up</span>
                                                                        <span className="text-xs font-black uppercase tracking-widest">Listen</span>
                                                                    </button>
                                                                </div>
                                                                <div className="p-4 text-center border-t border-primary/10 text-[9px] font-black text-primary/40 uppercase tracking-widest">
                                                                    Tap to show front
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="flex items-center justify-between gap-4">
                                                        <button 
                                                            onClick={prev}
                                                            disabled={state.currentIdx === 0}
                                                            className="size-12 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-slate-100 disabled:hover:text-slate-400 transition-all bg-white shadow-sm"
                                                        >
                                                            <span className="material-symbols-outlined">arrow_back_ios_new</span>
                                                        </button>
                                                        
                                                        <div className="flex-1 flex flex-col items-center">
                                                            <div className="flex gap-1 mb-2">
                                                                {(currentBlock.content.cards || []).map((_: any, i: number) => (
                                                                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${state.currentIdx === i ? 'w-6 bg-primary' : 'w-1.5 bg-slate-200'}`} />
                                                                ))}
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{state.currentIdx + 1} of {currentBlock.content.cards.length}</span>
                                                        </div>

                                                        <button 
                                                            onClick={next}
                                                            disabled={state.currentIdx === currentBlock.content.cards.length - 1}
                                                            className="size-12 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-slate-100 disabled:hover:text-slate-400 transition-all bg-white shadow-sm"
                                                        >
                                                            <span className="material-symbols-outlined">arrow_forward_ios</span>
                                                        </button>
                                                    </div>

                                                    <button 
                                                        onClick={swap}
                                                        className="w-full py-4 rounded-2xl border-2 border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                                                        Switch Language Sides
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 animate-fade-in">
                            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">inventory_2</span>
                            <p className="text-slate-500 font-bold">This unit seems to be empty.</p>
                        </div>
                    )}
                </div>
            </main>

            <footer className="px-6 py-6 bg-white border-t border-slate-200 relative z-30">
                <div className="max-w-2xl mx-auto flex gap-4">
                    <Button variant="outline" className="flex-1 rounded-2xl h-14" onClick={() => navigate('/student/dashboard')}>Quit Lab</Button>
                    <Button variant="primary" size="lg" className="flex-[2] rounded-2xl h-14 bg-slate-900 hover:bg-black border-none" onClick={handleNext} loading={loading}>
                        {isReviewMode ? (currentBlockIdx === blocks.length - 1 ? 'Finish Review' : 'Continue') : (isChecking ? 'Continue' : (currentBlockIdx === blocks.length - 1 ? 'Finish & Claim Reward' : 'Check & Next'))}
                    </Button>
                </div>
            </footer>

            {dragInfo && (
                <div className="fixed pointer-events-none z-[9999] select-none shadow-2xl transition-transform duration-100" style={{ left: dragInfo.x, top: dragInfo.y, transform: `translate(-50%, -50%) rotate(${dragInfo.rotation}deg) scale(1.1)` }}>
                    <div className="px-6 py-3 rounded-2xl border-2 border-primary bg-white text-primary font-black text-sm shadow-2xl flex items-center gap-3">
                        <span className="material-symbols-outlined text-lg">drag_indicator</span>
                        {dragInfo.text}
                    </div>
                </div>
            )}
        </div>
    );
}
