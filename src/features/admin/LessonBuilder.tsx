import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { toast } from 'sonner';
import { listDriveFiles, initializeGapiClient, loadGapiScript, initializeTokenClient, setAccessToken, shareFileWithAnyone, isTokenValid, clearAccessToken } from '../../services/googleDriveService';

const FREE_MODELS = [
    "google/gemma-3n-e4b-it"
];

const ELEVEN_LABS_API_KEY = "sk_bef262947b0b3edc39654b60f3210b229a7e19e3ac5f96b3";
const FALLBACK_VOICES = [
    { id: '21m00Tcm4lJCp75V8xOe', name: 'Rachel (F)' },
    { id: 'pNInz6obpgDQGcFigWte', name: 'Adam (M)' }
];

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- Types ---
interface Block {
    id: string;
    type: 'text' | 'audio' | 'question_mc' | 'question_fill' | 'question_fill_drag' | 'question_fill_typed' | 'audio_vocab' | 'document' | 'flashcards';
    title: string;
    content: any; // Flexible JSON for different block types
    order_index: number;
}

interface Lesson {
    id: string;
    title: string;
    description: string;
    level: string;
    category: string;
    duration: string;
    image_url: string;
    language: string;
    writing_location?: string;
    writing_task?: string;
    writing_requirements?: string;
}

interface Draft {
    id: string;
    title: string;
    blocks: Block[];
    timestamp: number;
}

// --- Component ---
export default function LessonBuilder() {
    const navigate = useNavigate();
    const { id: lessonId } = useParams();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [isDraftsLoaded, setIsDraftsLoaded] = useState(false);

    // Google Drive Selection State
    const [showDriveSelector, setShowDriveSelector] = useState<string | null>(null);
    const [driveFiles, setDriveFiles] = useState<any[]>([]);
    const [loadingDrive, setLoadingDrive] = useState(false);
    const [drivePath, setDrivePath] = useState<{ id: string, name: string }[]>([{ id: 'root', name: 'Mi Unidad' }]);
    const [isDriveAuthorized, setIsDriveAuthorized] = useState(true);

    const handleDocumentUpload = async (blockId: string, file: File) => {
        if (!file) return;
        setUploadingDoc(blockId);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${generateUUID()}.${fileExt}`;
            const filePath = `asignaciones/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('public')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('public')
                .getPublicUrl(filePath);

            updateBlockContent(blockId, {
                url: publicUrl,
                fileName: file.name,
                fileType: file.type
            });
        } catch (error) {
            console.error('Error uploading document:', error);
            toast.error('Error al subir el documento. Revisa tu conexión o si el archivo es demasiado grande.');
        } finally {
            setUploadingDoc(null);
        }
    };

    // AI Generator Modal State
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiConfig, setAIConfig] = useState<{ type: Block['type']; count: number; theme: string; level: string; language: string }>({
        type: 'question_mc',
        count: 3,
        theme: '',
        level: 'A1',
        language: 'English'
    });

    useEffect(() => {
        const isActuallyNew = !lessonId || lessonId === 'new' || lessonId === 'manual';

        if (!isActuallyNew) {
            fetchLessonData();
        } else {
            setLoading(false);
            setLesson({
                id: 'new',
                title: 'Untitled Asignación',
                description: '',
                level: 'A1',
                category: 'grammar',
                duration: '15 Minutes',
                image_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800',
                language: 'English',
                writing_location: '',
                writing_task: '',
                writing_requirements: ''
            });
        }
    }, [lessonId]);

    useEffect(() => {
        // Load drafts from localStorage
        const savedDrafts = localStorage.getItem('lwl_exercise_drafts');
        if (savedDrafts) {
            try {
                setDrafts(JSON.parse(savedDrafts));
            } catch (e) {
                console.error("Failed to parse drafts", e);
            }
        }
        setIsDraftsLoaded(true);
    }, []);

    useEffect(() => {
        // Save drafts to localStorage only AFTER initial load
        if (isDraftsLoaded) {
            localStorage.setItem('lwl_exercise_drafts', JSON.stringify(drafts));
        }
    }, [drafts, isDraftsLoaded]);

    useEffect(() => {
        if (showDriveSelector) {
            loadDriveFiles(drivePath[drivePath.length - 1].id);
        }
    }, [showDriveSelector, drivePath]);

    const checkAuth = async () => {
        const stored = localStorage.getItem('gdrive_token');
        if (stored) {
            setAccessToken(stored);
            const valid = await isTokenValid();
            if (valid) {
                setIsDriveAuthorized(true);
                return true;
            }
        }
        setIsDriveAuthorized(false);
        return false;
    };

    const loadDriveFiles = async (folderId: string = 'root') => {
        setLoadingDrive(true);
        try {
            await loadGapiScript();
            if (!window.gapi?.client?.drive) {
                await initializeGapiClient();
            }

            const isAuthed = await checkAuth();
            if (!isAuthed) {
                setLoadingDrive(false);
                return;
            }

            const files = await listDriveFiles(folderId);
            setIsDriveAuthorized(true);

            // Filter files and folders if tagging metadata is present
            const filteredFiles = files.filter((file: any) => {
                // If the file/folder doesn't have a description, we don't show it 
                // per user request: "Si la carpeta no tiene la etiqueta, no se verá"
                if (!file.description) return false;

                try {
                    const tags = JSON.parse(file.description);
                    const levelMatch = !lesson?.level || tags.levels?.includes(lesson.level);
                    const langMatch = !lesson?.language || tags.langs?.includes(lesson.language);
                    return levelMatch && langMatch;
                } catch (e) {
                    return false;
                }
            });

            setDriveFiles(filteredFiles);
        } catch (err: any) {
            console.error('Error loading drive files:', err);
            if (err.status === 401) {
                clearAccessToken();
                setIsDriveAuthorized(false);
            } else {
                toast.error('Error al conectar con Google Drive');
            }
        } finally {
            setLoadingDrive(false);
        }
    };

    const handleDriveAuth = async () => {
        try {
            await loadGisScript();
            const tokenClient = initializeTokenClient((resp: any) => {
                if (resp.error) {
                    toast.error('Error de autenticación');
                    return;
                }
                localStorage.setItem('gdrive_token', resp.access_token);
                setAccessToken(resp.access_token);
                setIsDriveAuthorized(true);
                loadDriveFiles(drivePath[drivePath.length - 1].id);
            });
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (err) {
            console.error('Auth error:', err);
            toast.error('Error al iniciar sesión en Google');
        }
    };

    const loadGisScript = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (window.google) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => resolve();
            script.onerror = (err) => reject(err);
        });
    };

    const handleSelectDriveFile = (file: any) => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            setDrivePath([...drivePath, { id: file.id, name: file.name }]);
            loadDriveFiles(file.id);
            return;
        }

        // Transform webViewLink to an embeddable preview link for students
        // Normal webViewLink: https://drive.google.com/file/d/ID/view?usp=drivesdk
        // Preview link: https://drive.google.com/file/d/ID/preview
        let embedUrl = file.webViewLink || '';
        if (file.id) {
            embedUrl = `https://drive.google.com/file/d/${file.id}/preview`;
            // Ensure the file is shared so students can see it
            shareFileWithAnyone(file.id);
        }

        const blockData = {
            url: embedUrl,
            fileName: file.name,
            fileType: file.mimeType,
            size: parseInt(file.size || '0'),
            driveId: file.id
        };

        if (showDriveSelector) {
            updateBlockContent(showDriveSelector, blockData);
            setShowDriveSelector(null);
        }
    };

    const [availableVoices, setAvailableVoices] = useState<{ id: string, name: string }[]>(FALLBACK_VOICES);

    useEffect(() => {
        const fetchVoices = async () => {
            try {
                const response = await fetch("https://api.elevenlabs.io/v1/voices", {
                    headers: { "xi-api-key": ELEVEN_LABS_API_KEY }
                });
                if (!response.ok) return;
                const data = await response.json();
                if (data.voices) {
                    setAvailableVoices(data.voices.map((v: any) => ({ id: v.voice_id, name: v.name })));
                }
            } catch (err) {
                console.error("Error fetching ElevenLabs voices:", err);
            }
        };
        fetchVoices();
    }, []);

    const fetchLessonData = async () => {
        setLoading(true);
        try {
            const { data: lessonData, error: lessonError } = await supabase
                .from('lessons')
                .select('*')
                .eq('id', lessonId)
                .single();

            if (lessonError) throw lessonError;
            setLesson(lessonData);

            const { data: exercisesData, error: exercisesError } = await supabase
                .from('exercises')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('order_index', { ascending: true });

            if (exercisesError) throw exercisesError;
            setBlocks(exercisesData.map((ex: any) => ({
                id: ex.id,
                type: ex.exercise_type,
                title: ex.content.title || 'Untitled Block',
                content: ex.content,
                order_index: ex.order_index
            })));
        } catch (err) {
            console.error('Error fetching lesson:', err);
        } finally {
            setLoading(false);
        }
    };

    const addBlock = (type: Block['type']) => {
        const newBlock: Block = {
            id: generateUUID(),
            type,
            title: `New ${type.replace('_', ' ')}`,
            content: {},
            order_index: blocks.length
        };
        setBlocks([...blocks, newBlock]);
    };

    const removeBlock = (id: string) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const updateBlockContent = (id: string, updates: any) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, content: { ...b.content, ...updates } } : b));
    };

    const listElevenLabsVoices = async () => {
        try {
            const response = await fetch("https://api.elevenlabs.io/v1/voices", {
                headers: { "xi-api-key": ELEVEN_LABS_API_KEY }
            });
            const data = await response.json();
            console.log("ElevenLabs Available Voices:", data.voices?.map((v: any) => ({ id: v.voice_id, name: v.name })));
            toast.info(`Voices listed in console. Found ${data.voices?.length || 0} voices.`);
        } catch (err) {
            console.error("Error listing voices:", err);
        }
    };

    const handleAIGenerateAudioText = async (blockId: string, prompt: string, isDialogue: boolean = false) => {
        if (!prompt) return;
        setGeneratingAI(true);
        try {
            const systemPrompt = isDialogue
                ? "You are a professional script writer for English learning audio. Generate a dialogue between TWO people. Use the format 'Speaker A: ...' and 'Speaker B: ...' clearly. Keep it natural. Respond ONLY with the script text."
                : "You are a professional script writer for English learning audio. Generate a short, natural-sounding audio script based on the theme provided. Respond ONLY with the script text.";

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "LearnWithLore",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "google/gemma-3n-e4b-it",
                    "messages": [
                        { "role": "system", "content": systemPrompt },
                        { "role": "user", "content": `Generate ${isDialogue ? 'a dialogue' : 'an audio script'} for: "${prompt}"` }
                    ]
                })
            });
            const data = await response.json();
            const text = data.choices[0].message.content.trim();
            updateBlockContent(blockId, { ai_script: text });
        } catch (err) {
            console.error('Error generating audio script:', err);
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleGenerateElevenLabsAudio = async (blockId: string, text: string, voiceId: string, isDialogue: boolean = false, speakerVoices: any = {}) => {
        if (!text) return;
        setGeneratingAI(true);
        try {
            let finalBlob: Blob;

            if (isDialogue) {
                // Parse script into segments
                const lines = text.split('\n').filter(l => l.trim().includes(':'));
                const blobs: Blob[] = [];

                for (const line of lines) {
                    const [speakerName, content] = line.split(':').map(s => s.trim());
                    // Find actual voiceId for this speaker label (e.g. "Speaker A" -> its selected voiceId)
                    const actualVoiceId = speakerVoices[speakerName] || voiceId;

                    if (!content) continue;

                    const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${actualVoiceId}/stream`;
                    console.log(`ElevenLabs Call (Stream): ${ttsUrl} for speaker ${speakerName}`);

                    const response = await fetch(ttsUrl, {
                        method: "POST",
                        headers: { "xi-api-key": ELEVEN_LABS_API_KEY, "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: content,
                            model_id: "eleven_multilingual_v2",
                            voice_settings: {
                                stability: 0.25,
                                similarity_boost: 0.75,
                                style: 0.85,
                                use_speaker_boost: true
                            }
                        })
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(`ElevenLabs error [${response.status}] for ${speakerName}: ${JSON.stringify(errData)}`);
                    }
                    blobs.push(await response.blob());
                    // Small delay to avoid rate limits if many segments
                    await new Promise(r => setTimeout(r, 200));
                }
                finalBlob = new Blob(blobs, { type: 'audio/mpeg' });
            } else {
                const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
                const response = await fetch(ttsUrl, {
                    method: "POST",
                    headers: { "xi-api-key": ELEVEN_LABS_API_KEY, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text,
                        model_id: "eleven_multilingual_v2",
                        voice_settings: {
                            stability: 0.25,
                            similarity_boost: 0.75,
                            style: 0.85,
                            use_speaker_boost: true
                        }
                    })
                });
                if (!response.ok) throw new Error("ElevenLabs API error");
                finalBlob = await response.blob();
            }

            if (!finalBlob || finalBlob.size === 0) {
                throw new Error("El audio generado está vacío. Intenta de nuevo.");
            }

            const fileName = `audio_${generateUUID()}.mp3`;
            const filePath = `asignaciones/${fileName}`;
            const fileToUpload = new File([finalBlob], fileName, { type: 'audio/mpeg' });

            // Upload to Supabase Storage matching handleDocumentUpload exactly
            const { error: uploadError } = await supabase.storage
                .from('public')
                .upload(filePath, fileToUpload);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('public')
                .getPublicUrl(filePath);

            updateBlockContent(blockId, {
                url: publicUrl,
                ai_script: text
            });
        } catch (err) {
            console.error('Error generating ElevenLabs audio:', err);
            toast.error('Error al generar el diálogo. Revisa tu saldo o configuración de ElevenLabs.');
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleAIGenerateExercises = async () => {
        if (!lesson?.title) {
            toast.warning('Please enter a lesson title and description first.');
            return;
        }

        setGeneratingAI(true);
        setShowAIModal(false);

        if (aiConfig.type === 'flashcards') {
            // Flashcards have a special structure and separate prompt logic
            // We use the existing theme and the newly added level/language
            // First we need a block for it if it doesn't exist, or just append it
            const newBlockId = generateUUID();
            const newBlock: Block = {
                id: newBlockId,
                type: 'flashcards',
                title: aiConfig.theme || `AI Flashcards (${aiConfig.level})`,
                content: { cards: [], category: aiConfig.theme, showFront: 'es' },
                order_index: blocks.length
            };
            setBlocks([...blocks, newBlock]);
            handleAIGenerateFlashcards(newBlockId, aiConfig.theme || 'Vocabulario general');
            return;
        }

        try {
            const fetchExercises = async (model: string) => {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer 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`,
                        "HTTP-Referer": window.location.origin,
                        "X-Title": "LearnWithLore",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": [
                            {
                                "role": "system",
                                "content": `You are a specialized English teacher. Generate ${aiConfig.count} ${aiConfig.type} exercises for a lesson. 
                                Respond ONLY with a valid JSON array of objects. Do not include markdown formatting like \`\`\`json.
                                IMPORTANT FOR question_mc: Ensure the 'correctIdx' (0 to 3) is randomized.
                                Format per type:
                                - question_mc: { "question": "...", "options": ["...", "..."], "correctIdx": number, "title": "..." }
                                - question_fill_drag: { "text": "A long text (4-5 lines of English) with exactly 4-5 blanks like [word]. Example: 'Yesterday [I] went to the [store] and [bought] some [milk].'", "title": "Short title in Spanish" }
                                - question_fill_typed: { "text": "A long text (4-5 lines of English) with exactly 4-5 blanks like [word]. Example: 'They [had] a [great] time [at] the [party] last night.'", "title": "Short title in Spanish" }
                                - text: { "text": "Lesson content...", "title": "..." }
                                - audio_vocab: { "question": "Word in English...", "audio_url": "Leave empty", "title": "Spanish title" }
                                - document: { "title": "Document Title", "content": "Full document text here..." }`
                            },
                            {
                                "role": "user",
                                "content": `Generate ${aiConfig.count} ${aiConfig.type} exercises.
                                Lesson Title: "${lesson.title}"
                                Lesson Context: "${lesson.description}"
                                Difficulty: "${lesson.level}"
                                ${aiConfig.theme ? `Specific Topic/Theme for these exercises: "${aiConfig.theme}"` : ''}
                                Make sure the exercises strictly follow this topic and difficulty.`
                            }
                        ]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData?.error?.message || `API Error: ${response.status}`);
                }

                const data = await response.json();
                return data.choices?.[0]?.message?.content;
            };

            let content = null;
            for (const model of FREE_MODELS) {
                try {
                    console.log(`AI Gen (Exercises): Intentando con modelo ${model}...`);
                    content = await fetchExercises(model);
                    if (content) {
                        console.log(`✅ Éxito con modelo: ${model}`);
                        break;
                    }
                } catch (err: any) {
                    console.warn(`❌ Modelo ${model} falló (probablemente límite 429). Probando el siguiente...`);
                }
            }

            if (!content) {
                console.warn("Todos los modelos fallaron por límites de la API. Usando mock data de prueba.");
                const mockData = Array.from({ length: aiConfig.count }).map((_, i) => {
                    if (aiConfig.type === 'question_mc') return { question: `Sample MC Question ${i + 1}?`, options: ["Option A", "Option B", "Option C", "Option D"], correctIdx: 0, title: `Mock MC ${i + 1}` };
                    if (aiConfig.type === 'question_fill_drag') return { text: `The [cat] is [on] the table.`, title: `Mock Fill Drag ${i + 1}` };
                    if (aiConfig.type === 'question_fill_typed') return { text: `I [like] to [read] books.`, title: `Mock Fill Typed ${i + 1}` };
                    if (aiConfig.type === 'audio_vocab') return { question: `Sample Vocab word ${i + 1}`, audio_url: "", title: `Mock Vocab ${i + 1}` };
                    if (aiConfig.type === 'document') return { title: `Sample Document ${i + 1}`, content: `This is the content for sample document ${i + 1}.` };
                    return { text: `Sample lesson explanation text ${i + 1}.`, title: `Mock Text ${i + 1}` };
                });
                content = JSON.stringify(mockData);
            }

            if (!content) throw new Error("No content received");

            let exercises;
            try {
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                exercises = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
            } catch (e) {
                console.error("Failed to parse JSON:", content);
                throw new Error("AI returned invalid JSON format.");
            }

            if (Array.isArray(exercises)) {
                const newBlocks = exercises.map((ex, i) => ({
                    id: generateUUID(),
                    type: aiConfig.type,
                    title: ex.title || `AI Generated ${aiConfig.type}`,
                    content: ex,
                    order_index: blocks.length + i
                }));
                setBlocks([...blocks, ...newBlocks]);
            }

        } catch (error: any) {
            console.error('AI Generation error:', error);
            toast.error(`AI Generation Error: ${error.message}`);
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleAIGenerateWorkshop = async () => {
        if (!lesson?.title) {
            toast.warning('Please enter a lesson title first.');
            return;
        }

        setGeneratingAI(true);
        try {
            const fetchGeneratedContent = async (model: string) => {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer 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`,
                        "HTTP-Referer": window.location.origin,
                        "X-Title": "LearnWithLore",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a specialized English teacher assistant. Generate writing lesson parameters in JSON format. IMPORTANT: Titles must be short. Instructions ('writing_task') and requirements ('writing_requirements') MUST be in SPANISH. Tasks should be in English. Respond ONLY with the JSON object."
                            },
                            {
                                "role": "user",
                                "content": `Generate a writing workshop for the topic: "${lesson.title}". 
                                Description context: "${lesson.description}". 
                                Return a JSON with: 
                                {
                                    "writing_location": "A specific realistic location related to the task",
                                    "writing_task": "Detailed instructions IN SPANISH (2-3 sentences)",
                                    "writing_requirements": "3-4 key requirements IN SPANISH separated by newlines"
                                }`
                            }
                        ],
                        "stream": true
                    })
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error?.error?.message || `API Error: ${response.status}`);
                }

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let fullContent = "";

                if (!reader) throw new Error("Could not initialize stream reader.");

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n").filter(line => line.trim() !== "");

                    for (const line of lines) {
                        const message = line.replace(/^data: /, "");
                        if (message === "[DONE]") break;

                        try {
                            const parsed = JSON.parse(message);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) fullContent += delta;
                        } catch (e) {
                            // Some chunks might be incomplete or metadata
                            continue;
                        }
                    }
                }

                return fullContent;
            };

            let content = null;
            for (const model of FREE_MODELS) {
                try {
                    console.log(`AI Gen (Workshop): Intentando con modelo ${model}...`);
                    content = await fetchGeneratedContent(model);
                    if (content) {
                        console.log(`✅ Éxito con modelo: ${model}`);
                        break;
                    }
                } catch (err: any) {
                    console.warn(`❌ Modelo ${model} falló. Probando el siguiente...`);
                }
            }

            if (!content) throw new Error("Todos los modelos de la API de IA fallaron debido al límite de peticiones gratuitas. Por favor, inténtalo más tarde o añade saldo a tu cuenta de OpenRouter.");

            // Extract JSON if model wraps it in markdown
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const aiData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

            setLesson({
                ...lesson,
                writing_location: aiData.writing_location || lesson.writing_location,
                writing_task: aiData.writing_task || lesson.writing_task,
                writing_requirements: aiData.writing_requirements || lesson.writing_requirements
            });

        } catch (error: any) {
            console.error('AI Generation error:', error);
            toast.error(`AI Generation Error: ${error.message}`);
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleAIGenerateFlashcards = async (blockId: string, theme: string) => {
        setGeneratingAI(true);
        try {
            const systemPrompt = `You are an expert language teacher. Generate a list of ${aiConfig.count} flashcards for the theme: "${theme}".
            Level: ${aiConfig.level}
            Target Language: ${aiConfig.language}
            Each flashcard MUST have:
            - word_es: The word in Spanish.
            - word_en: The word in English.
            - image_prompt: A very detailed DALL-E style prompt to generate a beautiful, minimalist, high-quality 3D illustration of the word.
            
            Return ONLY a JSON array of objects.
            Example: [{"word_es": "Perro", "word_en": "Dog", "image_prompt": "A cute 3D Pixar-style golden retriever puppy..."}]`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'LearnWithLore',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemma-3n-e4b-it',
                    messages: [{ role: 'user', content: systemPrompt }]
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.error?.message || `API Error: ${response.status}`);
            }

            if (!data.choices?.[0]?.message?.content) {
                throw new Error('La IA no devolvió un formato válido.');
            }

            const content = data.choices[0].message.content;
            const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const cards = JSON.parse(cleanedContent);

            const updatedCards = cards.map((c: any) => ({
                id: generateUUID(),
                es: c.word_es,
                en: c.word_en,
                image_url: `https://source.unsplash.com/featured/?${encodeURIComponent(c.word_en)}`,
                audio_url: ''
            }));

            updateBlockContent(blockId, {
                theme,
                category: theme,
                cards: updatedCards,
                showFront: 'es'
            });

        } catch (error: any) {
            console.error('AI Flashcard Generation error:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleSaveDraft = () => {
        console.info('Saving Draft - Current blocks:', blocks);
        if (blocks.length === 0) {
            alert("No hay ejercicios para guardar como borrador. (Blocks length: 0)");
            return;
        }
        const newDraft: Draft = {
            id: generateUUID(),
            title: lesson?.title || "Borrador sin título",
            blocks: [...blocks],
            timestamp: Date.now()
        };
        setDrafts(prev => [newDraft, ...prev].slice(0, 10)); // Use functional update
        toast.success("¡Borrador guardado correctamente!");
    };

    const handleRestoreDraft = (draft: Draft) => {
        if (confirm(`¿Quieres añadir los ${draft.blocks.length} ejercicios de "${draft.title}" a la lección actual?`)) {
            // Add blocks with new temporary IDs to avoid collisions
            const restoredBlocks = draft.blocks.map(b => ({
                ...b,
                id: generateUUID()
            }));
            setBlocks([...blocks, ...restoredBlocks]);
        }
    };

    const handleDeleteDraft = (id: string) => {
        setDrafts(drafts.filter(d => d.id !== id));
    };

    const handleSave = async () => {
        if (!lesson) return;
        setSaving(true);
        try {
            const isNew = lessonId === 'new';

            let finalLessonId = lessonId;

            if (isNew) {
                const { data: newLesson, error: lError } = await supabase.from('lessons').insert([{
                    title: lesson.title,
                    description: lesson.description,
                    level: lesson.level,
                    category: lesson.category,
                    duration: lesson.duration,
                    image_url: lesson.image_url,
                    writing_location: lesson.writing_location,
                    writing_task: lesson.writing_task,
                    writing_requirements: lesson.writing_requirements
                }]).select().single();
                if (lError) throw lError;
                finalLessonId = newLesson.id;
            } else {
                const { error: lError } = await supabase.from('lessons').update({
                    title: lesson.title,
                    description: lesson.description,
                    level: lesson.level,
                    category: lesson.category,
                    duration: lesson.duration,
                    image_url: lesson.image_url,
                    writing_location: lesson.writing_location,
                    writing_task: lesson.writing_task,
                    writing_requirements: lesson.writing_requirements
                }).eq('id', lessonId);
                if (lError) throw lError;
            }

            // 2. Save Exercises (Delete existing and rebuild for simplicity, or upsert)
            // For robustness, let's delete and re-insert or use upsert if they have IDs
            await supabase.from('exercises').delete().eq('lesson_id', finalLessonId);

            const exercisesToInsert = blocks.map((b, i) => ({
                id: b.id.includes('-') ? b.id : undefined, // Check if it's a real UUID or temp
                lesson_id: finalLessonId,
                exercise_type: b.type,
                content: { ...b.content, title: b.title },
                order_index: i
            }));

            const { error: eError } = await supabase.from('exercises').insert(exercisesToInsert);
            if (eError) throw eError;

            toast.success('Asignación saved successfully!');
            if (isNew) navigate(`/admin/builder/manual/${finalLessonId}`);
        } catch (err) {
            console.error('Save error:', err);
            toast.error('Failed to save asignación.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse">Loading Builder...</div>;

    return (
        <div className="flex flex-col items-center bg-slate-50 min-h-screen px-4 py-8 md:px-12 font-display">
            <div className="w-full max-w-[800px] flex flex-col gap-8">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Link className="hover:text-primary transition-colors" to="/admin/lessons">Asignaciones</Link>
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        <span className="text-slate-900 font-medium">{lessonId === 'new' ? 'Nueva Asignación' : 'Editar Asignación'}</span>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            className="bg-white border-slate-200 shadow-sm px-6"
                            onClick={handleSaveDraft}
                        >
                            Save as Draft
                        </Button>
                        <Button
                            variant="primary"
                            className="bg-slate-900 hover:bg-black text-white px-8 shadow-lg shadow-slate-200"
                            onClick={handleSave}
                            loading={saving}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Recovery Banner */}

                {/* Lesson Meta */}
                <div className="space-y-6">
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                        <label className="flex flex-col gap-1 mb-4">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Asignación Title</span>
                            <input
                                className="w-full bg-transparent border-none p-0 text-3xl font-black text-slate-900 placeholder:text-slate-200 focus:ring-0"
                                placeholder="Título de la Asignación (p.ej: Verbos Irregulares 19/03)"
                                value={lesson?.title || ''}
                                onChange={e => setLesson({ ...lesson!, title: e.target.value })}
                            />
                        </label>
                        <label className="flex flex-col gap-1 mb-6">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Asignación Description</span>
                            <textarea
                                className="w-full bg-transparent border-none p-0 text-lg font-medium text-slate-600 placeholder:text-slate-200 focus:ring-0 resize-none"
                                placeholder="Descripción breve del contenido..."
                                rows={2}
                                value={lesson?.description || ''}
                                onChange={e => setLesson({ ...lesson!, description: e.target.value })}
                            />
                        </label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Level</span>
                                <Select
                                    className="w-full"
                                    value={lesson?.level}
                                    onChange={e => setLesson({ ...lesson!, level: e.target.value })}
                                    options={[
                                        { value: 'A1', label: 'Nivel A1' },
                                        { value: 'A2', label: 'Nivel A2' },
                                        { value: 'B1', label: 'Nivel B1' },
                                        { value: 'B2', label: 'Nivel B2' },
                                        { value: 'C1', label: 'Nivel C1' },
                                        { value: 'C2', label: 'Nivel C2' },
                                    ]}
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Idioma</span>
                                <Select
                                    className="w-full !h-10"
                                    value={lesson?.language || 'English'}
                                    onChange={e => setLesson({ ...lesson!, language: e.target.value })}
                                    options={[
                                        { value: 'English', label: '🇺🇸 English' },
                                        { value: 'Spanish', label: '🇪🇸 Español' },
                                    ]}
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Category</span>
                                <Select
                                    className="w-full"
                                    value={lesson?.category}
                                    onChange={e => setLesson({ ...lesson!, category: e.target.value })}
                                    options={['grammar', 'vocabulary', 'writing', 'reading', 'listening'].map(t => ({ value: t, label: t.toUpperCase() }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Estimated Time</span>
                                <input
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:border-primary outline-none"
                                    placeholder="e.g. 20 Minutes"
                                    value={lesson?.duration || ''}
                                    onChange={e => setLesson({ ...lesson!, duration: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Header Image URL</span>
                                <input
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:border-primary outline-none"
                                    placeholder="Paste image URL..."
                                    value={lesson?.image_url || ''}
                                    onChange={e => setLesson({ ...lesson!, image_url: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Writing Specific Fields */}
                        {lesson?.category === 'writing' && (
                            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="size-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                                        <span className="material-symbols-outlined">edit_note</span>
                                    </div>
                                    <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest">Writing Workshop Settings</h3>
                                </div>

                                <button
                                    onClick={handleAIGenerateWorkshop}
                                    disabled={generatingAI}
                                    className="flex items-center gap-2 w-fit px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-black transition-all shadow-lg shadow-slate-200 group disabled:opacity-50"
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${generatingAI ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`}>
                                        {generatingAI ? 'sync' : 'auto_awesome'}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        {generatingAI ? 'Generating...' : 'Fill with AI'}
                                    </span>
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">location_on</span> Workshop Location
                                        </span>
                                        <input
                                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:border-rose-500 transition-all outline-none"
                                            placeholder="e.g. Grand Plaza Hotel"
                                            value={lesson?.writing_location || ''}
                                            onChange={e => setLesson({ ...lesson!, writing_location: e.target.value })}
                                        />
                                    </label>
                                    <label className="flex flex-col gap-2 relative">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">assignment</span> Task Instruction
                                        </span>
                                        <textarea
                                            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 focus:border-rose-500 transition-all outline-none resize-none"
                                            placeholder="Write a formal letter to..."
                                            rows={4}
                                            value={lesson?.writing_task || ''}
                                            onChange={e => setLesson({ ...lesson!, writing_task: e.target.value })}
                                        />
                                    </label>
                                </div>

                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">lightbulb</span> Key Requirements (One per line)
                                    </span>
                                    <textarea
                                        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 focus:border-rose-500 transition-all outline-none resize-none"
                                        placeholder="Use formal salutations...&#10;Keep a polite tone...&#10;Minimum 150 words..."
                                        rows={4}
                                        value={lesson?.writing_requirements || ''}
                                        onChange={e => setLesson({ ...lesson!, writing_requirements: e.target.value })}
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex flex-col gap-6 min-h-[400px]">
                    {blocks.map((block) => (
                        <div key={block.id} className="group relative rounded-2xl bg-white shadow-sm border border-slate-200 hover:shadow-md transition-all overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                            {/* Block Header */}
                            <div className="flex items-center justify-between px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-300 cursor-grab active:cursor-grabbing">drag_indicator</span>
                                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-500 tracking-wider">
                                        <span className="material-symbols-outlined text-[18px] text-primary">
                                            {block.type === 'text' ? 'article' :
                                                block.type === 'audio' ? 'volume_up' :
                                                    block.type === 'document' ? 'description' :
                                                        block.type === 'flashcards' ? 'style' : 'quiz'}
                                        </span>
                                        {block.type === 'document' ? 'Documento / PDF' : block.type.replace('_', ' ')}
                                    </span>
                                </div>
                                <button onClick={() => removeBlock(block.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </div>

                            {/* Block Body */}
                            <div className="p-6">
                                {block.type === 'text' && (
                                    <textarea
                                        className="w-full min-h-[120px] bg-transparent border-none text-slate-700 leading-relaxed placeholder:text-slate-300 focus:ring-0 resize-none text-base font-medium"
                                        placeholder="Escribe aquí la teoría o instrucciones para el alumno..."
                                        value={block.content.text || ''}
                                        onChange={e => updateBlockContent(block.id, { text: e.target.value })}
                                    />
                                )}

                                {block.type === 'document' && (
                                    <div className="space-y-4">
                                        {!block.content.url ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div
                                                    className={`border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${uploadingDoc === block.id ? 'opacity-50 cursor-wait' : 'hover:border-primary/50 hover:bg-primary/5'}`}
                                                    onClick={() => {
                                                        if (uploadingDoc) return;
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = 'application/pdf,image/*';
                                                        input.onchange = (e: any) => handleDocumentUpload(block.id, e.target.files[0]);
                                                        input.click();
                                                    }}
                                                >
                                                    <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                        {uploadingDoc === block.id ? (
                                                            <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-3xl">upload_file</span>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-bold text-slate-900">Subir desde PC</p>
                                                        <p className="text-xs text-slate-500 mt-1">Sube un PDF o Imagen local</p>
                                                    </div>
                                                </div>

                                                <div
                                                    className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer hover:border-[#1FA463] hover:bg-[#1FA463]/10"
                                                    onClick={async () => {
                                                        const token = window.gapi?.client?.getToken()?.access_token || localStorage.getItem('gdrive_token');
                                                        if (!token) {
                                                            toast.error('Debes vincular tu cuenta de Google Drive en Admin > Archivos primero.');
                                                            return;
                                                        }

                                                        toast.loading('Cargando Google Drive...', { id: 'gdrive-load' });
                                                        try {
                                                            await loadGapiScript();
                                                            if (!window.gapi?.client?.drive) {
                                                                await initializeGapiClient();
                                                            }
                                                            if (!window.gapi?.client?.getToken()) {
                                                                window.gapi.client.setToken({ access_token: token });
                                                            }
                                                            setShowDriveSelector(block.id);
                                                        } catch (err) {
                                                            toast.error('Error al iniciar Google Drive');
                                                        } finally {
                                                            toast.dismiss('gdrive-load');
                                                        }
                                                    }}
                                                >
                                                    <div className="size-12 rounded-full bg-[#1FA463]/10 flex items-center justify-center text-[#1FA463]">
                                                        <span className="material-symbols-outlined text-3xl">add_to_drive</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-bold text-slate-900">Seleccionar de Drive</p>
                                                        <p className="text-xs text-slate-500 mt-1">Elige un archivo de tu nube</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                            <span className="material-symbols-outlined">
                                                                {block.content.fileType?.includes('pdf') ? 'picture_as_pdf' : 'image'}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-900 truncate">
                                                                {block.content.fileName || 'Documento cargado'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                                {block.content.fileType?.split('/')[1] || 'FILE'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => updateBlockContent(block.id, { url: null, fileName: null, fileType: null })}
                                                        className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                        title="Eliminar archivo"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                                    </button>
                                                </div>

                                                {/* Preview */}
                                                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
                                                    {block.content.fileType?.includes('pdf') ? (
                                                        <iframe
                                                            src={`${block.content.url}#toolbar=0`}
                                                            className="w-full h-[400px] border-none"
                                                            title="Preview"
                                                        />
                                                    ) : (
                                                        <img
                                                            src={block.content.url}
                                                            alt="Preview"
                                                            className="w-full h-auto max-h-[500px] object-contain bg-slate-50"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {block.type === 'audio' && (
                                    <div className="flex flex-col gap-6">
                                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border-2 border-slate-100 shadow-sm transition-all hover:border-primary/20">
                                            <div className="size-14 rounded-full bg-primary flex items-center justify-center text-white shadow-[0_10px_25px_-5px_rgba(13,89,242,0.3)]">
                                                <span className="material-symbols-outlined text-3xl">play_arrow</span>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    className="w-full bg-transparent border-none p-0 text-base font-black text-slate-900 focus:ring-0 placeholder:text-slate-300"
                                                    placeholder="URL del audio (o genera uno con IA debajo...)"
                                                    value={block.content.url || ''}
                                                    onChange={e => updateBlockContent(block.id, { url: e.target.value })}
                                                />
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full w-1/3 bg-primary/20 rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ElevenLabs Generator UI */}
                                        <div className="p-6 rounded-[28px] bg-slate-50/50 border border-slate-100 space-y-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-lg">auto_awesome</span>
                                                    </div>
                                                    <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Generador de Audio IA (ElevenLabs)</h4>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); listElevenLabsVoices(); }}
                                                        className="text-[9px] font-bold text-primary hover:underline ml-2"
                                                    >
                                                        Listar Voces (Debug)
                                                    </button>
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${block.content.is_dialogue ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`}>Modo Diálogo</span>
                                                    <div
                                                        onClick={() => updateBlockContent(block.id, { is_dialogue: !block.content.is_dialogue, speakers: block.content.speakers || { 'Speaker A': availableVoices[0]?.id || FALLBACK_VOICES[0].id, 'Speaker B': availableVoices[1]?.id || FALLBACK_VOICES[1].id } })}
                                                        className={`w-10 h-5 rounded-full relative transition-all ${block.content.is_dialogue ? 'bg-primary' : 'bg-slate-200'}`}
                                                    >
                                                        <div className={`absolute top-1 size-3 rounded-full bg-white transition-all ${block.content.is_dialogue ? 'left-6' : 'left-1'}`} />
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="space-y-4">
                                                {block.content.is_dialogue && (
                                                    <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm animate-in zoom-in-95 duration-300">
                                                        {['Speaker A', 'Speaker B'].map(s => (
                                                            <div key={s} className="space-y-2">
                                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">{s}</label>
                                                                <Select
                                                                    className="w-full !h-10 !text-[10px]"
                                                                    value={(block.content.speakers || {})[s] || availableVoices[0]?.id || FALLBACK_VOICES[0].id}
                                                                    onChange={e => updateBlockContent(block.id, {
                                                                        speakers: { ...(block.content.speakers || {}), [s]: e.target.value }
                                                                    })}
                                                                    options={availableVoices.map((v: any) => ({ value: v.id, label: v.name }))}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder={block.content.is_dialogue ? "Tema del diálogo (ej: 'Checking in at an airport')" : "Prompt para el guion (ej: 'Conversation about coffee')"}
                                                        className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:border-primary outline-none transition-all"
                                                        value={block.content.ai_prompt || ''}
                                                        onChange={e => updateBlockContent(block.id, { ai_prompt: e.target.value })}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="primary"
                                                        className="h-11 px-4 rounded-xl"
                                                        loading={generatingAI}
                                                        onClick={() => handleAIGenerateAudioText(block.id, block.content.ai_prompt, block.content.is_dialogue)}
                                                    >
                                                        Generar Guion
                                                    </Button>
                                                </div>

                                                {block.content.ai_script && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Guion Generado</label>
                                                            <textarea
                                                                className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium text-slate-700 min-h-[120px] outline-none focus:border-primary transition-all shadow-inner"
                                                                value={block.content.ai_script}
                                                                onChange={e => updateBlockContent(block.id, { ai_script: e.target.value })}
                                                                placeholder={block.content.is_dialogue ? "Speaker A: Hello\nSpeaker B: Hi there!" : "Write your script here..."}
                                                            />
                                                        </div>

                                                        <div className="flex flex-wrap gap-4 items-end">
                                                            {!block.content.is_dialogue && (
                                                                <div className="flex-1 min-w-[150px] space-y-2">
                                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Voz de ElevenLabs</label>
                                                                    <Select
                                                                        className="w-full !h-11 !text-xs"
                                                                        value={block.content.voice_id || availableVoices[0]?.id || FALLBACK_VOICES[0].id}
                                                                        onChange={e => updateBlockContent(block.id, { voice_id: e.target.value })}
                                                                        options={availableVoices.map((v: any) => ({ value: v.id, label: v.name }))}
                                                                    />
                                                                </div>
                                                            )}
                                                            <Button
                                                                variant="primary"
                                                                className="h-11 px-6 rounded-xl bg-slate-900 border-none hover:bg-black shadow-lg shadow-slate-200 w-full sm:w-auto"
                                                                loading={generatingAI}
                                                                disabled={!block.content.ai_script}
                                                                onClick={() => handleGenerateElevenLabsAudio(
                                                                    block.id,
                                                                    block.content.ai_script,
                                                                    block.content.voice_id || availableVoices[0]?.id || FALLBACK_VOICES[0].id,
                                                                    block.content.is_dialogue,
                                                                    block.content.speakers
                                                                )}
                                                            >
                                                                {block.content.is_dialogue ? 'Generar Diálogo Combinado' : 'Confirmar y Generar Audio'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Flashcards Block Editor */}
                                {block.type === 'flashcards' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Categoría / Tema de IA</label>
                                                <input
                                                    type="text"
                                                    value={block.content.category || ''}
                                                    onChange={(e) => updateBlockContent(block.id, { category: e.target.value })}
                                                    placeholder="Ej: Animales de la selva"
                                                    className="w-full bg-white border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all px-4 py-2"
                                                />
                                            </div>
                                            <Button
                                                variant="secondary"
                                                className="bg-white border-slate-200 h-10 px-4 text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all"
                                                onClick={() => handleAIGenerateFlashcards(block.id, block.content.category || 'General')}
                                                loading={generatingAI}
                                                icon={<span className="material-symbols-outlined text-[18px]">auto_awesome</span>}
                                            >
                                                Generar con IA
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {(block.content.cards || []).map((card: any, idx: number) => (
                                                <div key={card.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm group hover:shadow-md transition-all relative">
                                                    <button
                                                        onClick={() => {
                                                            const newCards = [...block.content.cards];
                                                            newCards.splice(idx, 1);
                                                            updateBlockContent(block.id, { cards: newCards });
                                                        }}
                                                        className="absolute -top-2 -right-2 size-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                                    </button>

                                                    <div className="space-y-3">
                                                        <div className="aspect-[4/3] rounded-xl bg-slate-50 overflow-hidden relative group/img">
                                                            {card.image_url ? (
                                                                <img src={card.image_url} alt={card.es} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                    <span className="material-symbols-outlined text-4xl">image</span>
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <button className="p-2 rounded-xl bg-white text-slate-600 hover:text-primary transition-all shadow-sm">
                                                                    <span className="material-symbols-outlined text-[18px]">upload</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                value={card.es}
                                                                onChange={(e) => {
                                                                    const newCards = [...block.content.cards];
                                                                    newCards[idx].es = e.target.value;
                                                                    updateBlockContent(block.id, { cards: newCards });
                                                                }}
                                                                placeholder="Español"
                                                                className="w-full text-xs font-black text-slate-900 border-none bg-slate-50 rounded-lg p-2 focus:ring-1 focus:ring-primary/20"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={card.en}
                                                                onChange={(e) => {
                                                                    const newCards = [...block.content.cards];
                                                                    newCards[idx].en = e.target.value;
                                                                    updateBlockContent(block.id, { cards: newCards });
                                                                }}
                                                                placeholder="Inglés"
                                                                className="w-full text-xs font-bold text-primary border-none bg-primary/5 rounded-lg p-2 focus:ring-1 focus:ring-primary/20"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    const newCards = [...(block.content.cards || []), { id: generateUUID(), es: '', en: '', image_url: '', audio_url: '' }];
                                                    updateBlockContent(block.id, { cards: newCards });
                                                }}
                                                className="aspect-[4/5] rounded-[24px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
                                            >
                                                <div className="size-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                                                    <span className="material-symbols-outlined">add</span>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Nueva Carta</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {(block.type === 'question_mc' || block.type === 'audio_vocab') && (
                                    <div className="space-y-4">
                                        <input
                                            className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold text-slate-900 focus:border-primary focus:bg-white transition-all outline-none"
                                            placeholder={block.type === 'audio_vocab' ? "Word/Phrase to check..." : "Enter your question..."}
                                            value={block.content.question || ''}
                                            onChange={e => updateBlockContent(block.id, { question: e.target.value })}
                                        />
                                        {block.type === 'audio_vocab' && (
                                            <input
                                                className="w-full bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-[10px] font-bold text-primary focus:border-primary outline-none"
                                                placeholder="Audio Resource URL (required for vocab check)"
                                                value={block.content.audio_url || ''}
                                                onChange={e => updateBlockContent(block.id, { audio_url: e.target.value })}
                                            />
                                        )}
                                        <div className="grid grid-cols-1 gap-2">
                                            {(block.content.options || ['Option 1', 'Option 2']).map((opt: string, i: number) => (
                                                <div key={i} className="flex gap-2 group/opt">
                                                    <input
                                                        type="radio"
                                                        checked={block.content.correctIdx === i}
                                                        onChange={() => updateBlockContent(block.id, { correctIdx: i })}
                                                        className="mt-2.5 size-4 text-primary focus:ring-primary border-slate-300"
                                                    />
                                                    <input
                                                        className={`flex-1 px-4 py-2 rounded-xl border text-sm font-medium transition-all outline-none ${block.content.correctIdx === i ? 'bg-green-50/50 border-green-200 text-green-700' : 'bg-white border-slate-100 text-slate-600'}`}
                                                        value={opt}
                                                        onChange={e => {
                                                            const newOpts = [...(block.content.options || ['Option 1', 'Option 2'])];
                                                            newOpts[i] = e.target.value;
                                                            updateBlockContent(block.id, { options: newOpts });
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    const newOpts = [...(block.content.options || ['Option 1', 'Option 2'])];
                                                    newOpts.push(`Option ${newOpts.length + 1}`);
                                                    updateBlockContent(block.id, { options: newOpts });
                                                }}
                                                className="mt-2 text-[10px] font-black uppercase text-primary tracking-widest hover:text-primary/70 transition-all flex items-center gap-1 w-fit"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                                Add Option
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {(block.type === 'question_fill_drag' || block.type === 'question_fill_typed') && (
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                            Text with Blanks (Use [word] to create a blank)
                                        </p>
                                        <textarea
                                            className="w-full min-h-[120px] bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium text-slate-700 focus:border-primary focus:bg-white transition-all outline-none resize-none"
                                            placeholder="Example: The [cat] is [on] the mat."
                                            value={block.content.text || ''}
                                            onChange={e => updateBlockContent(block.id, { text: e.target.value })}
                                        />

                                        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                                            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2">Live Preview</p>
                                            <div className="text-sm font-medium text-slate-700 leading-loose">
                                                {(block.content.text || '').split(/(\[[^\]]+\])/).map((part: string, i: number) => {
                                                    if (part.startsWith('[') && part.endsWith(']')) {
                                                        const word = part.slice(1, -1);
                                                        return (
                                                            <span key={i} className="inline-block px-3 py-0.5 mx-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-black animate-pulse">
                                                                {word}
                                                            </span>
                                                        );
                                                    }
                                                    return <span key={i}>{part}</span>;
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add Blocks Hub */}
                    <div className="flex flex-col gap-4 mt-4 py-8 border-t-2 border-dashed border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Build your asignación</p>
                                <span className="text-sm text-slate-500 font-medium italic">Select a block type to insert at the end</span>
                            </div>
                            <button
                                onClick={() => setShowAIModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-xl hover:shadow-primary/20 transition-all group"
                            >
                                <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">auto_awesome</span>
                                <span className="text-[11px] font-black uppercase tracking-widest">Create with AI</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {[
                                { type: 'text', label: 'Teoría / Texto', icon: 'article' },
                                { type: 'audio', label: 'Audio', icon: 'volume_up' },
                                { type: 'question_mc', label: 'Quiz (MC)', icon: 'quiz' },
                                { type: 'audio_vocab', label: 'Vocabulario', icon: 'record_voice_over' },
                                { type: 'question_fill_drag', label: 'Fill Blanks (Drag)', icon: 'swipe' },
                                { type: 'question_fill_typed', label: 'Fill Blanks (Text)', icon: 'keyboard' },
                                { type: 'document', label: 'Documento / PDF', icon: 'description' },
                                { type: 'flashcards', label: 'Flashcards', icon: 'style' },
                            ].map((item) => (
                                <button
                                    key={item.type}
                                    onClick={() => addBlock(item.type as any)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-slate-200 hover:border-primary hover:bg-primary/5 hover:-translate-y-1 transition-all group shadow-sm"
                                >
                                    <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-primary transition-all">
                                        <span className="material-symbols-outlined">{item.icon}</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* AI Configuration Modal */}
                {showAIModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">auto_awesome</span>
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">AI Magic Builder</h3>
                                </div>
                                <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Exercise Type</label>
                                    <Select
                                        className="w-full"
                                        value={aiConfig.type}
                                        onChange={v => setAIConfig({ ...aiConfig, type: v as any })}
                                        options={[
                                            { value: "question_mc", label: "Multiple Choice Quiz" },
                                            { value: "question_fill_drag", label: "Fill Blanks (Drag & Drop)" },
                                            { value: "question_fill_typed", label: "Fill Blanks (Typing)" },
                                            { value: "text", label: "Lesson Explanation (Text)" },
                                            { value: "audio_vocab", label: "Vocabulary Check" },
                                            { value: "flashcards", label: "Flashcards Deck" }
                                        ]}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nivel</label>
                                        <Select
                                            className="w-full"
                                            value={aiConfig.level}
                                            onChange={e => setAIConfig({ ...aiConfig, level: e.target.value as any })}
                                            options={[
                                                { value: "A1", label: "A1 - Principiante" },
                                                { value: "A2", label: "A2 - Elemental" },
                                                { value: "B1", label: "B1 - Intermedio" },
                                                { value: "B2", label: "B2 - Intermedio Alto" },
                                                { value: "C1", label: "C1 - Avanzado" }
                                            ]}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Idioma Destino</label>
                                        <Select
                                            className="w-full"
                                            value={aiConfig.language}
                                            onChange={e => setAIConfig({ ...aiConfig, language: e.target.value })}
                                            options={[
                                                { value: "English", label: "Inglés" },
                                                { value: "Spanish", label: "Español" },
                                                { value: "French", label: "Francés" },
                                                { value: "German", label: "Alemán" }
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Temática / Contexto (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Verbos irregulares, Vocabulario de aeropuerto..."
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 outline-none focus:border-primary transition-all"
                                        value={aiConfig.theme}
                                        onChange={e => setAIConfig({ ...aiConfig, theme: e.target.value })}
                                        disabled={generatingAI}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quantity of Blocks</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 5].map(n => (
                                            <button
                                                key={n}
                                                onClick={() => setAIConfig({ ...aiConfig, count: n })}
                                                className={`flex-1 h-10 rounded-xl border text-sm font-black transition-all ${aiConfig.count === n ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            placeholder="Otra"
                                            className={`flex-1 min-w-0 w-16 h-10 px-0 rounded-xl border text-sm font-black text-center outline-none transition-all ${![1, 2, 3, 5].includes(aiConfig.count) ? 'bg-primary border-primary text-white placeholder:text-white/70 shadow-lg shadow-primary/20' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300 placeholder:text-slate-400'}`}
                                            value={![1, 2, 3, 5].includes(aiConfig.count) ? aiConfig.count : ''}
                                            onChange={e => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val) && val > 0) setAIConfig({ ...aiConfig, count: val });
                                            }}
                                            disabled={generatingAI}
                                        />
                                    </div>
                                </div>

                                <Button
                                    variant="primary"
                                    className="w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest mt-4"
                                    onClick={handleAIGenerateExercises}
                                    loading={generatingAI}
                                >
                                    Start Generation
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Drafts Section */}
                {drafts.length > 0 && (
                    <div className="mt-12 pt-12 border-t-2 border-dashed border-slate-200 w-full animate-in fade-in duration-700">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">history</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Borradores Recientes</h3>
                                <p className="text-xs text-slate-500 font-medium">Snapshot de tus mejores ejercicios guardados localmente</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {drafts.map((draft) => (
                                <div key={draft.id} className="bg-amber-50/50 border border-amber-100 rounded-[28px] p-6 shadow-sm hover:shadow-xl hover:shadow-amber-900/5 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDeleteDraft(draft.id)}
                                            className="size-8 rounded-xl bg-white border border-rose-100 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-2xl bg-white flex items-center justify-center text-amber-600 shadow-sm border border-amber-100/50">
                                                <span className="material-symbols-outlined text-[24px]">restore</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 line-clamp-1">{draft.title}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                    {new Date(draft.timestamp).toLocaleDateString()} • {new Date(draft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 min-h-[50px] content-start">
                                            {Object.entries(
                                                draft.blocks.reduce((acc: any, b) => {
                                                    acc[b.type] = (acc[b.type] || 0) + 1;
                                                    return acc;
                                                }, {})
                                            ).map(([type, count]: [any, any]) => (
                                                <span key={type} className="px-2.5 py-1 rounded-full bg-white border border-amber-100 text-[9px] font-black text-amber-700 uppercase tracking-tight shadow-sm">
                                                    {count} {type.replace('question_', '').replace('audio_', '')}
                                                </span>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => handleRestoreDraft(draft)}
                                            className="w-full h-12 rounded-2xl bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group/btn"
                                        >
                                            <span className="material-symbols-outlined text-[18px] group-hover/btn:scale-110 transition-transform">add_circle</span>
                                            Restaurar Borrador
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Google Drive File Selector Modal */}
                {showDriveSelector && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 overflow-hidden">
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-[#1FA463]/10 flex items-center justify-center text-[#1FA463]">
                                        <span className="material-symbols-outlined">add_to_drive</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Google Drive</h3>
                                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mt-0.5">
                                            {drivePath.map((p, i) => (
                                                <span key={p.id} className="flex items-center gap-1">
                                                    {i > 0 && <span className="material-symbols-outlined text-[14px]">chevron_right</span>}
                                                    <button
                                                        className="hover:text-primary transition-colors"
                                                        onClick={() => setDrivePath(drivePath.slice(0, i + 1))}
                                                    >
                                                        {p.name}
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowDriveSelector(null)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-slate-900">
                                {loadingDrive ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                                        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm font-bold uppercase tracking-widest">Cargando...</p>
                                    </div>
                                ) : !isDriveAuthorized ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-sm mx-auto">
                                        <div className="size-20 rounded-3xl bg-[#1FA463]/10 flex items-center justify-center text-[#1FA463]">
                                            <span className="material-symbols-outlined text-5xl">lock</span>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-slate-900 dark:text-white">Acceso Requerido</p>
                                            <p className="text-sm text-slate-500 mt-2">Para navegar por tus archivos de Google Drive necesitas otorgar permisos de acceso.</p>
                                        </div>
                                        <Button
                                            variant="primary"
                                            className="w-full h-12 rounded-2xl bg-[#1FA463] hover:bg-[#1a8e54] border-none font-black uppercase tracking-widest"
                                            onClick={handleDriveAuth}
                                        >
                                            Conectar con Google Drive
                                        </Button>
                                    </div>
                                ) : driveFiles.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                                        <span className="material-symbols-outlined text-5xl opacity-50">folder_open</span>
                                        <p className="text-sm font-bold uppercase tracking-widest">Carpeta vacía</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {driveFiles.map((file) => (
                                            <button
                                                key={file.id}
                                                onClick={() => handleSelectDriveFile(file)}
                                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-left group"
                                            >
                                                <div className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative border border-slate-200/50">
                                                    {file.thumbnailLink && !file.mimeType.includes('folder') ? (
                                                        <img src={file.thumbnailLink} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className={`material-symbols-outlined text-[20px] ${file.mimeType.includes('folder') ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`}>
                                                            {file.mimeType.includes('folder') ? 'folder' : file.mimeType.includes('pdf') ? 'picture_as_pdf' : file.mimeType.includes('video') ? 'movie' : 'description'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-primary transition-colors">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                                                        {new Date(file.modifiedTime).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
