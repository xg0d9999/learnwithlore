import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function StudentSpeaking() {
    const { user } = useAuth();
    const [isPremium, setIsPremium] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const checkPremiumStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                setIsPremium(data?.is_premium || false);
            } catch (error) {
                console.error('Error fetching premium status:', error);
                // Fallback to false if error
                setIsPremium(false);
            } finally {
                setLoading(false);
            }
        };

        checkPremiumStatus();
    }, [user]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white min-h-screen">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
            <header className="px-8 py-6 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <span className="material-symbols-outlined text-3xl">record_voice_over</span>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        Speaking Practice
                        {isPremium && (
                            <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider shadow-sm">
                                Premium
                            </span>
                        )}
                    </h1>
                    <p className="text-sm font-medium text-slate-500">
                        Chat realistically with our AI native speaker.
                    </p>
                </div>
            </header>

            <main className="flex-1 flex flex-col p-8 items-center justify-center relative overflow-hidden">
                {isPremium ? (
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center justify-center min-h-[500px] p-10 relative overflow-visible">
                        <div className="text-center mb-8 relative z-10 w-full transition-all">
                            <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Lore AI</h2>
                            <p className="text-slate-500 font-medium text-sm tracking-tight leading-relaxed max-w-md mx-auto">
                                Practica tu inglés con Lore, nuestro asistente nativo.
                            </p>
                        </div>

                        {/* ElevenLabs Widget Container - Balanced scale and precise positioning */}
                        <div className="relative z-20 flex flex-col items-center justify-center w-full py-10 overflow-visible">
                            <div className="scale-[1.4] translate-x-[75px] -translate-y-[80px] transform transition-all duration-300 origin-center">
                                <elevenlabs-convai 
                                    agent-id="agent_5201km570hm7eycvpqzwqkgkwvy9"
                                    style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                ></elevenlabs-convai>
                            </div>
                        </div>
                        
                        <div className="mt-12 text-center relative z-10 w-full">
                            <p className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                Conectado
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl overflow-hidden relative min-h-[500px] flex items-center justify-center text-center p-8">
                        {/* Fake background to look like it's locked */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 opacity-90 blur-sm pointer-events-none"></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
                        
                        <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white mb-6 shadow-xl shadow-amber-500/20">
                                <span className="material-symbols-outlined text-4xl">lock</span>
                            </div>
                            
                            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
                                Unlock Speaking Practice
                            </h2>
                            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                                Get instant, realistic speaking practice with our native IA voice. Improve your pronunciation, fluency, and confidence in real-time.
                            </p>
                            
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 w-full mb-8 border border-white/10">
                                <ul className="text-left space-y-3 text-slate-200 font-medium">
                                    <li className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-amber-400">check_circle</span>
                                        Unlimited conversation time
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-amber-400">check_circle</span>
                                        Real-time pronunciation feedback
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-amber-400">check_circle</span>
                                        Hyper-realistic native voices
                                    </li>
                                </ul>
                            </div>
                            
                            <button 
                                onClick={() => alert('¡Pronto implementaremos la pasarela de pago para conseguir Premium!')}
                                className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">workspace_premium</span>
                                Upgrade to Premium
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// Ensure TypeScript recognizes the custom element
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { 'agent-id': string };
        }
    }
}
