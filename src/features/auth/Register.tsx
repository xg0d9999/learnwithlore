import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Register() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/student/dashboard`,
                    queryParams: {
                        prompt: 'select_account',
                    },
                },
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('Google registration error:', err);
            setError(err.message || 'Error connecting to Google.');
        }
    };


    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                // Create profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        full_name: fullName.trim(),
                        role: 'student',
                    });

                if (profileError) throw profileError;

                // Create initial progress record
                const { error: progressError } = await supabase
                    .from('user_progress')
                    .insert({
                        user_id: data.user.id,
                    });

                if (progressError) throw progressError;

                navigate('/student/dashboard');
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'An error occurred during registration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[1000px] bg-white rounded-3xl shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col md:flex-row min-h-[640px]">
            {/* Visual Side */}
            <div className="w-full md:w-5/12 bg-purple-50 relative overflow-hidden flex flex-col items-center justify-center p-12 text-center group">
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#9333ea_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>
                <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>

                <div className="relative z-10 transform transition-transform duration-700 hover:scale-105">
                    <div className="relative">
                        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl opacity-20"></div>
                        <img
                            alt="Learning journey"
                            className="relative w-48 md:w-64 drop-shadow-2xl rounded-lg rotate-[6deg] transition-transform duration-500 group-hover:rotate-0"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOdwQ16ZfNmzxZM-Ssx2y9ScUjNj59T5iG2G3KvZuMRHEcF64KNP3KlG_glEKf88HH32xXuW0nDzEVI4dWAFq6Mdavo1SAkTT66lJ1nfwwV2bp_88WzQtBwoq-Wsjvz_QWtr_l6ckUI9F9_DY2fngjfx9SaJbKFx-zaVYRDIq7OX0mqLFKfs_O6MkvLBLjaD3HtixT3BWMNbnNIv9WYMV6Vs1nfBvANL_n8KnZ7fkNfH5r8ZxYwWFxLXF-d3IpwA3YkBT5gjd5TVI"
                        />
                    </div>
                </div>

                <div className="relative z-10 mt-12 space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">The Future of Learning</h2>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[240px] mx-auto">
                        Join our community and start your personalized educational journey today.
                    </p>
                </div>
            </div>

            {/* Form Side */}
            <div className="w-full md:w-7/12 p-8 md:p-12 lg:p-16 bg-white flex flex-col justify-center relative">
                <div className="max-w-[400px] mx-auto w-full">
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-[28px]">person_add</span>
                            </div>
                            <span className="text-xl font-bold text-slate-900 tracking-tight">LearnWithLore</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create account</h1>
                        <p className="text-slate-500 mt-2 text-sm">Join LearnWithLore and start achieving your goals.</p>
                        {error && (
                            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}
                    </div>

                    <form className="space-y-4" onSubmit={handleRegister}>
                        <div className="space-y-1.5 group/field">
                            <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="fullName">Full Name</label>
                            <div className="relative">
                                <input
                                    className="w-full h-14 px-4 pl-11 bg-white rounded-xl border-none text-slate-900 placeholder:text-slate-400 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-200 shadow-sm"
                                    id="fullName"
                                    name="fullName"
                                    placeholder="Maria García"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within/field:text-primary">
                                    <span className="material-symbols-outlined text-[22px]">badge</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 group/field">
                            <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="email">Email Address</label>
                            <div className="relative">
                                <input
                                    className="w-full h-14 px-4 pl-11 bg-white rounded-xl border-none text-slate-900 placeholder:text-slate-400 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-200 shadow-sm"
                                    id="email"
                                    name="email"
                                    placeholder="student@example.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within/field:text-primary">
                                    <span className="material-symbols-outlined text-[22px]">mail</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 group/field">
                            <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="password">Password</label>
                            <div className="relative">
                                <input
                                    className="w-full h-14 px-4 pl-11 bg-white rounded-xl border-none text-slate-900 placeholder:text-slate-400 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-200 shadow-sm"
                                    id="password"
                                    name="password"
                                    placeholder="••••••••"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within/field:text-primary">
                                    <span className="material-symbols-outlined text-[22px]">lock</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-100"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-4 text-slate-400 font-semibold tracking-wider">Or continue with</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full h-14 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-[15px] shadow-sm transition-all duration-300 hover:bg-slate-50 hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 group/google"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover/google:scale-110" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span>Google</span>
                        </button>

                        <button
                            className="w-full h-14 mt-4 bg-primary text-white font-bold rounded-xl text-[15px] shadow-lg shadow-blue-500/20 transition-all duration-300 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 group/btn disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            type="submit"
                            disabled={loading}
                        >

                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover/btn:translate-x-1">person_add</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-4 border-t border-slate-50">
                        <p className="text-sm font-medium text-slate-500">
                            Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-6 left-0 right-0 text-center md:text-left md:pl-16">
                    <p className="text-xs text-slate-300 font-medium">
                        © 2024 LearnWithLore Educational Platform
                    </p>
                </div>
            </div>
        </div>
    );
}

