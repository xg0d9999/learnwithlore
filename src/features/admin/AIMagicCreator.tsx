import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { Select } from '../../components/ui/Select';
import { toast } from 'sonner';

interface Flashcard {
    es: string;
    en: string;
    image_url?: string;
}

export default function AIMagicCreator() {
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(10);
    const [selectedLevels, setSelectedLevels] = useState<string[]>(['A1']);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
    const [previewIdx, setPreviewIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Categories State
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('new');
    const [isFetchingCategories, setIsFetchingCategories] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setIsFetchingCategories(true);
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select('id, title, level')
                .eq('category', 'vocabulary')
                .order('title');
            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setIsFetchingCategories(false);
        }
    };

    const generateFreepikImage = async (prompt: string): Promise<string> => {
        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    styling: { style: 'cartoon' },
                    image: { size: 'square_1_1' },
                    prompt: prompt
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Proxy Error: ${errorData.error || response.status}`);
            }

            const data = await response.json();
            // Freepik usually returns base64 or a URL. 
            // According to their API, it might return a data array with base64 or a link.
            // If it's a URL, we use it. If it's base64, we might need to upload it to Supabase or use it directly.
            // For now, let's assume it returns a URL or we'll handle the base64.
            const imageUrl = data.data?.[0]?.base64
                ? `data:image/png;base64,${data.data[0].base64}`
                : data.data?.[0]?.url;

            return imageUrl || '';
        } catch (error) {
            console.error('Freepik generation error:', error);
            return '';
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || generatedCards.length === 0) return;

        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
            const filePath = `flashcards/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('public')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('public')
                .getPublicUrl(filePath);

            const newCards = [...generatedCards];
            newCards[previewIdx].image_url = publicUrl;
            setGeneratedCards(newCards);
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Error al subir la imagen');
        } finally {
            setIsUploading(false);
        }
    };

    const handleGenerate = async () => {
        if (!topic) {
            toast.error('Por favor introduce una temática');
            return;
        }
        setIsGenerating(true);
        setGeneratedCards([]);
        setStatus('Iniciando generación...');

        try {
            // Diagnostic: Check if API key exists
            const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
            console.log('--- AI Diagnostic ---');
            console.log('Key detected:', !!apiKey);
            if (apiKey) console.log('Key prefix:', apiKey.substring(0, 10) + '...');

            if (!apiKey) {
                toast.error('Error: VITE_OPENROUTER_API_KEY no configurada.');
                setIsGenerating(false);
                return;
            }

            setStatus('Conectando con OpenRouter...');
            // 1. Fetch existing words for de-duplication if category is selected
            let existingWordsList: string[] = [];
            if (selectedCategoryId !== 'new') {
                setStatus('Buscando palabras existentes para evitar duplicados...');
                const { data: exercises } = await supabase
                    .from('exercises')
                    .select('content')
                    .eq('lesson_id', selectedCategoryId)
                    .eq('exercise_type', 'flashcards');

                if (exercises) {
                    exercises.forEach(ex => {
                        const cards = ex.content?.cards || [];
                        cards.forEach((c: any) => {
                            if (c.en) existingWordsList.push(c.en.toLowerCase());
                            if (c.es) existingWordsList.push(c.es.toLowerCase());
                        });
                    });
                }
            }

            const isSimpleTopic = topic.toLowerCase().includes('animal') || topic.length < 10;

            setStatus(`Generando ${count} palabras para: ${topic}...`);
            const systemPrompt = `You are an expert language teacher. Generate a list of ${count} flashcards for the theme: "${topic}".
            Target Levels: ${selectedLevels.join(', ')}
            Target Languages: ${selectedLanguages.join(', ')}
            
            ${existingWordsList.length > 0 ? `AVOID these existing words: ${existingWordsList.join(', ')}` : ''}

            RULES:
            1. WORD COUNT: 
               - THEMATIC CATEGORY TYPE: ${isSimpleTopic ? 'SIMPLE' : 'COMPLEX'}
               - If THEMATIC CATEGORY TYPE is SIMPLE, use ONLY 1 WORD per flashcard (e.g., "Dog", "Blue").
               - If THEMATIC CATEGORY TYPE is COMPLEX, you can use short phrases (MAX 3 WORDS, e.g., "Arrive on time").
            2. IMAGE PROMPTS: For each word/phrase, provide a "freepik_prompt". This should be a basic, graphic, cartoon-style description for an AI to generate an icon-like illustration on a white/clean background.
            
            Each flashcard MUST have:
            - word_es: The word/phrase in Spanish.
            - word_en: The word/phrase in English.
            - freepik_prompt: The graphic/cartoon description.
            
            Return ONLY the raw JSON array. NO MARKDOWN. NO CONVERSATION.`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'LearnWithLore',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'arcee-ai/trinity-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Tema: ${topic}. Cantidad: ${count}. ${existingWordsList.length > 0 ? `Palabras a evitar: ${existingWordsList.join(', ')}` : ''}` }
                    ]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.error?.message || 'API Error');

            const content = data.choices[0].message.content.trim();
            let rawCards: any[] = [];
            try {
                const firstBracket = content.indexOf('[');
                const lastBracket = content.lastIndexOf(']');
                if (firstBracket !== -1 && lastBracket !== -1) {
                    rawCards = JSON.parse(content.substring(firstBracket, lastBracket + 1));
                } else {
                    rawCards = JSON.parse(content);
                }
            } catch (err) {
                throw new Error('Formato de IA inválido. Reintenta.');
            }

            // 2. Generate Images with Freepik for each card (concurrently)
            setStatus('¡Palabras creadas! Iniciando generación de imágenes en paralelo...');

            let completedCount = 0;
            const cardsWithImages = await Promise.all(rawCards.map(async (c: any) => {
                const word = c.word_es || c.word_en;
                const imageUrl = await generateFreepikImage(c.freepik_prompt || `${c.word_en} cartoon icon`);
                completedCount++;
                setStatus(`[${completedCount}/${rawCards.length}] Imagen lista: ${word}`);
                return {
                    es: c.word_es,
                    en: c.word_en,
                    image_url: imageUrl || `https://source.unsplash.com/featured/?${encodeURIComponent(c.word_en + ' cartoon')}`
                };
            }));

            setGeneratedCards(cardsWithImages);
            setPreviewIdx(0);
            setStatus('');
            toast.success('¡Mazos e imágenes generadas!');
        } catch (error: any) {
            console.error('Generation error:', error);
            setStatus(`Error: ${error.message}`);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (generatedCards.length === 0) return;
        setIsPublishing(true);
        try {
            let lessonId = selectedCategoryId;

            if (selectedCategoryId === 'new') {
                // 1. Create a new "Lesson"
                const mainLevel = selectedLevels[0] || 'A1';
                const { data: newLesson, error: lError } = await supabase.from('lessons').insert([{
                    title: topic,
                    description: `Mazo autogenerado de ${topic} (${selectedLevels.join(', ')})`,
                    level: mainLevel,
                    category: 'vocabulary',
                    duration: 10,
                    image_url: generatedCards[0].image_url
                }]).select().single();

                if (lError) throw lError;
                lessonId = newLesson.id;

                // 2. Create the flashcard exercise
                const { error: eError } = await supabase.from('exercises').insert([{
                    lesson_id: lessonId,
                    exercise_type: 'flashcards',
                    content: {
                        title: topic,
                        category: topic,
                        cards: generatedCards,
                        showFront: 'es'
                    },
                    order_index: 0
                }]);

                if (eError) throw eError;
            } else {
                // 3. Append to existing exercise
                const { data: existingExercises, error: fError } = await supabase
                    .from('exercises')
                    .select('id, content')
                    .eq('lesson_id', lessonId)
                    .eq('exercise_type', 'flashcards')
                    .single();

                if (fError && fError.code !== 'PGRST116') throw fError;

                if (existingExercises) {
                    const newCards = [...(existingExercises.content?.cards || []), ...generatedCards];
                    const { error: uError } = await supabase
                        .from('exercises')
                        .update({
                            content: {
                                ...existingExercises.content,
                                cards: newCards
                            }
                        })
                        .eq('id', existingExercises.id);

                    if (uError) throw uError;
                } else {
                    // Create if doesn't exist for some reason
                    const { error: eError } = await supabase.from('exercises').insert([{
                        lesson_id: lessonId,
                        exercise_type: 'flashcards',
                        content: {
                            title: topic,
                            category: topic,
                            cards: generatedCards,
                            showFront: 'es'
                        },
                        order_index: 0
                    }]);
                    if (eError) throw eError;
                }
            }

            toast.success('¡Mazo actualizado/publicado con éxito!');
            navigate('/admin/asignaciones');
        } catch (error) {
            console.error('Publish error:', error);
            toast.error('Error al publicar el mazo');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto p-8 lg:p-12 mb-24 flex flex-col gap-10 font-display">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary text-sm font-black uppercase tracking-widest mb-1">
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    <span>AI Magic Creator</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Flashcard Generator</h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg text-lg font-medium">Crea mazos de vocabulario premium en segundos con Inteligencia Artificial.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Configuration Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-sidebar-dark rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Categoría / Pack</label>
                            <div className="relative">
                                <select
                                    className={`w-full h-14 px-6 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none focus:border-primary transition-all appearance-none ${isFetchingCategories ? 'opacity-50' : ''}`}
                                    value={selectedCategoryId}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSelectedCategoryId(val);
                                        if (val !== 'new') {
                                            const cat = categories.find(c => c.id === val);
                                            if (cat) setTopic(cat.title);
                                        } else {
                                            setTopic('');
                                        }
                                    }}
                                    disabled={isFetchingCategories}
                                >
                                    <option value="new">+ Crear Nueva Categoría</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.title} ({cat.level})</option>
                                    ))}
                                </select>
                                {isFetchingCategories && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                                {selectedCategoryId === 'new' ? 'Temática de la Nueva Categoría' : 'Añadir a Temática'}
                            </label>
                            <input
                                type="text"
                                className="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none focus:border-primary transition-all placeholder:text-slate-300"
                                placeholder='Ej: "Objetos de la cocina", "Viajes"'
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                disabled={selectedCategoryId !== 'new'}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <Select
                                    label="Cantidad"
                                    value={count}
                                    onChange={e => setCount(Number(e.target.value))}
                                    options={[
                                        { value: 5, label: '5 cartas' },
                                        { value: 10, label: '10 cartas' },
                                        { value: 15, label: '15 cartas' },
                                        { value: 20, label: '20 cartas' }
                                    ]}
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Niveles</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                                        <label key={l} className={`flex items-center justify-center h-10 rounded-xl border-2 transition-all cursor-pointer font-bold text-xs ${selectedLevels.includes(l) ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedLevels.includes(l)}
                                                onChange={() => {
                                                    if (selectedLevels.includes(l)) setSelectedLevels(selectedLevels.filter(x => x !== l));
                                                    else setSelectedLevels([...selectedLevels, l]);
                                                }}
                                            />
                                            {l}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Idiomas</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['English', 'Spanish'].map(lang => (
                                    <label key={lang} className={`flex items-center gap-2 px-4 h-10 rounded-xl border-2 transition-all cursor-pointer font-bold text-xs ${selectedLanguages.includes(lang) ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedLanguages.includes(lang)}
                                            onChange={() => {
                                                if (selectedLanguages.includes(lang)) setSelectedLanguages(selectedLanguages.filter(x => x !== lang));
                                                else setSelectedLanguages([...selectedLanguages, lang]);
                                            }}
                                        />
                                        <span className="truncate">{lang}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            className="w-full h-14 rounded-2xl shadow-xl shadow-primary/20"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            loading={isGenerating}
                            icon={<span className="material-symbols-outlined">auto_awesome</span>}
                        >
                            Generar con IA
                        </Button>

                        {isGenerating && status && (
                            <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                                    <p className="text-sm font-medium text-primary">{status}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {generatedCards.length > 0 ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
                            <div className="flex items-center justify-between px-4">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Previsualización Premium</h2>
                                <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">
                                    {previewIdx + 1} / {generatedCards.length} Cartas
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                                {/* Card 3D Preview */}
                                <div className="flex flex-col items-center gap-8">
                                    <div className="perspective-2000 w-full max-w-sm aspect-[3/4] cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
                                        <div className={`relative w-full h-full preserve-3d transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isFlipped ? 'rotate-y-180' : ''}`}>
                                            {/* Front */}
                                            <div className="absolute inset-0 backface-hidden bg-white rounded-[32px] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.12),0_18px_36px_-18px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col border border-slate-100/50 group-hover:shadow-[0_40px_80px_-12px_rgba(0,0,0,0.18)] transition-shadow duration-500">
                                                <div className="p-4 flex-1">
                                                    <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-50 relative group">
                                                        {generatedCards[previewIdx].image_url ? (
                                                            <img
                                                                src={generatedCards[previewIdx].image_url}
                                                                alt=""
                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-100">
                                                                <span className="material-symbols-outlined text-6xl">image</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="px-8 pt-2 pb-10 text-center flex flex-col items-center">
                                                    <div className="w-8 h-1 bg-slate-100 rounded-full mb-6"></div>
                                                    <span className="text-[10px] font-black tracking-[0.2em] text-primary/40 uppercase mb-3 px-3 py-1 bg-primary/5 rounded-full">ESPAÑOL</span>
                                                    <h3 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">{generatedCards[previewIdx].es}</h3>
                                                </div>
                                            </div>

                                            {/* Back */}
                                            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-[32px] border border-primary/5 shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
                                                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center relative bg-gradient-to-b from-primary/[0.02] to-transparent">
                                                    <div className="size-20 rounded-[28px] bg-primary/5 text-primary flex items-center justify-center mb-8 shadow-inner border border-primary/10">
                                                        <span className="material-symbols-outlined text-4xl">translate</span>
                                                    </div>
                                                    <span className="text-[10px] font-black tracking-[0.2em] text-primary/40 uppercase mb-3 px-3 py-1 bg-primary/5 rounded-full">TRADUCCIÓN</span>
                                                    <h3 className="text-4xl font-black text-slate-900 italic tracking-tight">{generatedCards[previewIdx].en}</h3>
                                                    <div className="w-12 h-1.5 bg-primary/10 rounded-full mt-6"></div>
                                                </div>
                                                <div className="p-6 text-center border-t border-slate-50 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                                    Clica para voltear
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Navigation */}
                                    <div className="flex items-center gap-6">
                                        <button
                                            onClick={() => { setPreviewIdx(v => Math.max(0, v - 1)); setIsFlipped(false); }}
                                            className="size-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all bg-white shadow-sm"
                                            disabled={previewIdx === 0}
                                        >
                                            <span className="material-symbols-outlined font-black">chevron_left</span>
                                        </button>
                                        <button
                                            onClick={() => { setPreviewIdx(v => Math.min(generatedCards.length - 1, v + 1)); setIsFlipped(false); }}
                                            className="size-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all bg-white shadow-sm"
                                            disabled={previewIdx === generatedCards.length - 1}
                                        >
                                            <span className="material-symbols-outlined font-black">chevron_right</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Edit Panel */}
                                <div className="space-y-6 bg-slate-50/80 p-8 rounded-[32px] border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-primary text-sm">edit</span>
                                        <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">Editar Tarjeta Actual</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Palabra (Español)</label>
                                            <input
                                                type="text"
                                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:border-primary transition-all"
                                                value={generatedCards[previewIdx].es}
                                                onChange={e => {
                                                    const newCards = [...generatedCards];
                                                    newCards[previewIdx].es = e.target.value;
                                                    setGeneratedCards(newCards);
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Traducción (Inglés)</label>
                                            <input
                                                type="text"
                                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:border-primary transition-all"
                                                value={generatedCards[previewIdx].en}
                                                onChange={e => {
                                                    const newCards = [...generatedCards];
                                                    newCards[previewIdx].en = e.target.value;
                                                    setGeneratedCards(newCards);
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Imagen de la Carta</label>
                                            <div className="flex flex-col gap-3">
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:border-primary transition-all text-[10px]"
                                                        placeholder="URL de imagen externa..."
                                                        value={generatedCards[previewIdx].image_url || ''}
                                                        onChange={e => {
                                                            const newCards = [...generatedCards];
                                                            newCards[previewIdx].image_url = e.target.value;
                                                            setGeneratedCards(newCards);
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <label className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        <span className="material-symbols-outlined text-sm">{isUploading ? 'sync' : 'upload'}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{isUploading ? 'Subiendo...' : 'Subir ImagenLocal'}</span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                            disabled={isUploading}
                                                        />
                                                    </label>
                                                    <button
                                                        onClick={() => {
                                                            const newCards = [...generatedCards];
                                                            const term = newCards[previewIdx].en || topic;
                                                            newCards[previewIdx].image_url = `https://source.unsplash.com/featured/?${encodeURIComponent(term + ' clear background 3d')}&sig=${Math.random()}`;
                                                            setGeneratedCards(newCards);
                                                        }}
                                                        className="size-11 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm"
                                                        title="Regenerar Imagen"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">refresh</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-200 flex flex-col gap-2">
                                        <p className="text-[10px] text-slate-400 font-medium">Puedes modificar manualmente cualquier campo antes de publicar el mazo.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Action Bar */}
                            <div className="sticky bottom-8 z-40 bg-white/80 backdrop-blur-md border border-slate-200 p-6 rounded-3xl shadow-2xl flex justify-between items-center mt-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
                                    <span className="text-sm font-bold text-slate-600">Mazo listo para publicar</span>
                                </div>
                                <div className="flex gap-4">
                                    <Button variant="secondary" className="px-8 rounded-2xl border-2" onClick={() => setGeneratedCards([])}>Descartar</Button>
                                    <Button
                                        variant="primary"
                                        className="px-10 rounded-2xl shadow-xl shadow-primary/20"
                                        loading={isPublishing}
                                        disabled={isPublishing}
                                        onClick={handlePublish}
                                        icon={<span className="material-symbols-outlined">publish</span>}
                                    >
                                        Publicar Mazo
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center p-20 text-center gap-6 bg-slate-50/50 min-h-[500px]">
                            <div className="size-24 rounded-full bg-white flex items-center justify-center text-slate-200 shadow-sm">
                                <span className="material-symbols-outlined text-5xl">style</span>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-400 uppercase tracking-tight italic">Sin Mazos Generados</h3>
                                <p className="text-slate-400 max-w-xs text-sm font-medium">Configura la temática y pulsa el botón de generar para que la IA haga su magia.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
