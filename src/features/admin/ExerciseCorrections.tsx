import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';

interface Submission {
    id: string;
    user_id: string;
    lesson_id: string;
    content: string;
    category: string;
    status: string;
    grade: number | null;
    feedback: string | null;
    created_at: string;
    student_name: string;
    lesson_title: string;
}

export default function ExerciseCorrections() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [grade, setGrade] = useState<number>(0);
    const [exercises, setExercises] = useState<any[]>([]);
    const [exerciseGrades, setExerciseGrades] = useState<Record<string, { grade: number, comment: string }>>({});
    const [overallComment, setOverallComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('admin_submissions_view')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSubmissions(data || []);
        } catch (error) {
            console.error('Error fetching submissions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const handleOpenReview = async (submission: Submission) => {
        setSelectedSubmission(submission);
        
        // Fetch exercises for this lesson to enable detailed grading
        const { data: exData } = await supabase
            .from('exercises')
            .select('*')
            .eq('lesson_id', submission.lesson_id)
            .order('order_index', { ascending: true });
        
        setExercises(exData || []);

        try {
            const parsedFeedback = JSON.parse(submission.feedback || '{}');
            if (typeof parsedFeedback === 'object' && parsedFeedback.exerciseGrades) {
                setExerciseGrades(parsedFeedback.exerciseGrades);
                setOverallComment(parsedFeedback.overallComment || '');
            } else {
                // Legacy or empty feedback
                setExerciseGrades({});
                setOverallComment(submission.feedback || '');
            }
        } catch (e) {
            setExerciseGrades({});
            setOverallComment(submission.feedback || '');
        }
        
        setGrade(submission.grade || 0);
    };

    // Auto-calculate overall grade
    useEffect(() => {
        if (exercises.length === 0) return;
        
        const gradable = exercises.filter(ex => !['audio', 'document', 'text', 'flashcards'].includes(ex.exercise_type));
        if (gradable.length === 0) return;

        const sum = gradable.reduce((acc, ex) => acc + (exerciseGrades[ex.id]?.grade || 0), 0);
        const autoGrade = Math.round((sum / (gradable.length * 10)) * 100);
        setGrade(isNaN(autoGrade) ? 0 : autoGrade);
    }, [exerciseGrades, exercises]);

    const handleSaveReview = async () => {
        if (!selectedSubmission) return;
        setIsSubmitting(true);
        try {
            const detailedFeedback = JSON.stringify({
                overallComment,
                exerciseGrades
            });

            const { error } = await supabase
                .from('exercise_submissions')
                .update({
                    status: 'reviewed',
                    feedback: detailedFeedback,
                    grade,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedSubmission.id);

            if (error) throw error;

            setSubmissions(submissions.map(s => 
                s.id === selectedSubmission.id 
                    ? { ...s, status: 'reviewed', feedback: detailedFeedback, grade } 
                    : s
            ));
            setSelectedSubmission(null);
            alert('Grade and feedback submitted successfully!');
        } catch (error) {
            console.error('Error saving review:', error);
            alert('Failed to save review.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStudentAnswer = (exercise: any) => {
        if (!selectedSubmission) return null;
        let answers: any = {};
        try {
            answers = JSON.parse(selectedSubmission.content);
        } catch (e) {
            return <div className="text-slate-400 italic text-xs">Could not parse answers</div>;
        }

        const answer = answers[exercise.id];
        if (answer === undefined) return <div className="text-slate-400 italic text-xs">No answer provided</div>;

        if (exercise.exercise_type === 'question_mc' || exercise.exercise_type === 'audio_vocab') {
            const optIdx = answer as number;
            const isCorrect = optIdx === exercise.content.correctIdx;
            return (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {exercise.content.options[optIdx] || 'Unknown Option'}
                        </span>
                        <Badge variant={isCorrect ? 'success' : 'danger'} className="text-[10px] py-0">
                            {isCorrect ? 'Correct' : 'Incorrect'}
                        </Badge>
                    </div>
                </div>
            );
        }

        if (exercise.exercise_type === 'question_fill_drag' || exercise.exercise_type === 'question_fill_typed') {
            const studentAns = answer as Record<number, string>;
            return (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(studentAns).map(([idx, val]) => (
                        <div key={idx} className="bg-slate-100 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                            Blank {Number(idx)+1}: <span className="text-primary font-bold">{val}</span>
                        </div>
                    ))}
                </div>
            );
        }

        return <div className="text-xs text-slate-500 font-mono">{JSON.stringify(answer)}</div>;
    };

    if (loading && submissions.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-slate-400 text-sm animate-pulse">Loading submissions...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto p-8 flex flex-col gap-8">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Link className="hover:text-primary transition-colors" to="/admin/dashboard">Home</Link>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <span className="text-slate-900 font-medium">Corrections</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Exercise Corrections</h1>
                    <p className="text-slate-500 mt-1">Review and grade submissions from all students.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Exercise</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {submissions.map((submission) => (
                                <tr key={submission.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900 dark:text-white">{submission.student_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{submission.lesson_title}</div>
                                        <div className="text-xs text-slate-500 uppercase">{submission.category}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(submission.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={submission.status === 'reviewed' ? 'success' : 'warning'}>
                                            {submission.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        {submission.grade !== null ? (
                                            <span className="font-bold text-primary">{submission.grade}/100</span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button 
                                            size="sm" 
                                            variant={submission.status === 'reviewed' ? 'outline' : 'primary'}
                                            onClick={() => handleOpenReview(submission)}
                                        >
                                            {submission.status === 'reviewed' ? 'Edit Review' : 'Grade Task'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Review Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review Submission</h2>
                                <p className="text-sm text-slate-500">{selectedSubmission.student_name} • {selectedSubmission.lesson_title}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Calculated Grade</div>
                                    <div className="text-2xl font-black text-primary">{grade}/100</div>
                                </div>
                                <button 
                                    onClick={() => setSelectedSubmission(null)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1">
                            <div className="space-y-12">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">grading</span>
                                        Individual Exercises
                                    </h3>
                                    
                                    <div className="space-y-6">
                                        {exercises.filter(ex => !['audio', 'document', 'text', 'flashcards'].includes(ex.exercise_type)).map((exercise, idx) => (
                                            <div key={exercise.id} className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exercise {idx + 1}</span>
                                                            <Badge variant="neutral" className="text-[9px] uppercase">{exercise.exercise_type.replace(/_/g, ' ')}</Badge>
                                                        </div>
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-200">
                                                            {exercise.content.question || exercise.content.title || 'Interactive Exercise'}
                                                        </h4>
                                                    </div>
                                                    <div className="w-32 shrink-0">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Score (0-10)</label>
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            max="10"
                                                            value={exerciseGrades[exercise.id]?.grade || 0}
                                                            onChange={(e) => setExerciseGrades({
                                                                ...exerciseGrades,
                                                                [exercise.id]: {
                                                                    ...(exerciseGrades[exercise.id] || {}),
                                                                    grade: Math.min(10, Math.max(0, parseInt(e.target.value) || 0))
                                                                }
                                                            })}
                                                            className="w-full p-2 text-center font-black text-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Student's Response</div>
                                                    {renderStudentAnswer(exercise)}
                                                </div>

                                                <textarea 
                                                    placeholder="Add a specific comment for this exercise..."
                                                    value={exerciseGrades[exercise.id]?.comment || ''}
                                                    onChange={(e) => setExerciseGrades({
                                                        ...exerciseGrades,
                                                        [exercise.id]: {
                                                            ...(exerciseGrades[exercise.id] || {}),
                                                            comment: e.target.value
                                                        }
                                                    })}
                                                    className="w-full p-3 text-sm rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                                                    rows={2}
                                                />
                                            </div>
                                        ))}

                                        {exercises.filter(ex => ['audio', 'document', 'text', 'flashcards'].includes(ex.exercise_type)).length > 0 && (
                                            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                                                <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-widest">Other Materials (Not Graded)</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60">
                                                    {exercises.filter(ex => ['audio', 'document', 'text', 'flashcards'].includes(ex.exercise_type)).map((ex) => (
                                                        <div key={ex.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-slate-400">
                                                                {ex.exercise_type === 'audio' ? 'headphones' : ex.exercise_type === 'document' ? 'description' : 'article'}
                                                            </span>
                                                            <span className="text-xs font-medium truncate">{ex.content.title || ex.content.fileName || ex.exercise_type}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">chat_bubble</span>
                                        Overall Tutor Comment
                                    </label>
                                    <textarea 
                                        rows={4}
                                        value={overallComment}
                                        onChange={(e) => setOverallComment(e.target.value)}
                                        placeholder="Summarize the student's overall performance..."
                                        className="w-full p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <Button 
                                variant="outline" 
                                className="flex-1 h-14 rounded-2xl font-bold" 
                                onClick={() => setSelectedSubmission(null)}
                            >
                                Discard Changes
                            </Button>
                            <Button 
                                variant="primary" 
                                className="flex-[2] h-14 rounded-2xl font-bold shadow-lg shadow-primary/20"
                                onClick={handleSaveReview}
                                loading={isSubmitting}
                            >
                                <span className="material-symbols-outlined mr-2">send</span>
                                Finalize & Submit Grade
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
