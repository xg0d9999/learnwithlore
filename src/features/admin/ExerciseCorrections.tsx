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
    const [feedback, setFeedback] = useState('');
    const [grade, setGrade] = useState<number>(0);
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

    const handleOpenReview = (submission: Submission) => {
        setSelectedSubmission(submission);
        setFeedback(submission.feedback || '');
        setGrade(submission.grade || 0);
    };

    const handleSaveReview = async () => {
        if (!selectedSubmission) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('exercise_submissions')
                .update({
                    status: 'reviewed',
                    feedback,
                    grade,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedSubmission.id);

            if (error) throw error;

            setSubmissions(submissions.map(s => 
                s.id === selectedSubmission.id 
                    ? { ...s, status: 'reviewed', feedback, grade } 
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
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review Submission</h2>
                                <p className="text-sm text-slate-500">{selectedSubmission.student_name} • {selectedSubmission.lesson_title}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedSubmission(null)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Student's Work</label>
                                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-pre-wrap border border-slate-200 dark:border-slate-700 italic">
                                    "{selectedSubmission.content}"
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Grade (0-100)</label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max="100"
                                        value={grade}
                                        onChange={(e) => setGrade(parseInt(e.target.value) || 0)}
                                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Feedback</label>
                                <textarea 
                                    rows={5}
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Provide detailed feedback to the student..."
                                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                            <Button 
                                variant="outline" 
                                className="flex-1" 
                                onClick={() => setSelectedSubmission(null)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                className="flex-1"
                                onClick={handleSaveReview}
                                loading={isSubmitting}
                            >
                                Submit Review
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
