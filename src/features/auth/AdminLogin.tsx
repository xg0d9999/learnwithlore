import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { supabase, getRedirectUrl } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
    const navigate = useNavigate();
    const { error: serverError } = useAuth();
    const [email, setEmail] = useState(() => localStorage.getItem('lwl_remember_admin_email') || '');
    const [password, setPassword] = useState(() => localStorage.getItem('lwl_remember_admin_password') || '');
    const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('lwl_remember_admin_email'));
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            console.log('[Auth] Initiating Admin Google Sign-In...');
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: getRedirectUrl('/admin/dashboard'),
                    queryParams: {
                        prompt: 'select_account',
                    },
                },
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('Admin Google login error:', err);
            setError(err.message || 'Error connecting to Google.');
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (rememberMe) {
                localStorage.setItem('lwl_remember_admin_email', email);
                localStorage.setItem('lwl_remember_admin_password', password);
            } else {
                localStorage.removeItem('lwl_remember_admin_email');
                localStorage.removeItem('lwl_remember_admin_password');
            }

            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (data.user) {
                // Check if the user has the admin role
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .maybeSingle();

                if (profileError) throw profileError;

                if (!profile) {
                    throw new Error('Administrator profile not found.');
                }

                if (profile.role !== 'admin') {
                    await supabase.auth.signOut();
                    throw new Error('This account is not authorized as an administrator.');
                }


                navigate('/admin/dashboard');
            }
        } catch (err: any) {
            console.error('Admin login error:', err);
            setError(err.message || 'An error occurred during login.');
        } finally {
            setLoading(false);
        }

    };


    return (
        <div className="w-full max-w-[1000px] bg-white rounded-3xl shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col md:flex-row min-h-[640px]">
            {/* Visual Side */}
            <div className="w-full md:w-5/12 bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-12 text-center group border-r border-slate-50">
                <div className="absolute inset-0 opacity-60 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]"></div>
                <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

                <div className="relative z-10">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute -inset-8 bg-slate-200/50 rounded-full blur-3xl opacity-40"></div>
                        <div className="relative w-48 h-48 md:w-56 md:h-56 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 rotate-3 transition-transform duration-500 group-hover:rotate-0">
                            <div className="grid grid-cols-2 gap-3 p-6">
                                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">analytics</span>
                                </div>
                                <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-3xl">key</span>
                                </div>
                                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">group</span>
                                </div>
                                <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-3xl">settings</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 mt-12 space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Control del Sistema</h2>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[240px] mx-auto">
                        Gestiona usuarios, materiales y protocolos de seguridad de la plataforma.
                    </p>
                </div>
            </div>

            {/* Form Side */}
            <div className="w-full md:w-7/12 p-8 md:p-12 lg:p-16 bg-white flex flex-col justify-center relative">
                <div className="max-w-[400px] mx-auto w-full">
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-[28px]">shield_person</span>
                                </div>
                                <span className="text-xl font-bold text-slate-900 tracking-tight">LearnWithLore</span>
                            </div>
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-full border border-slate-200">
                                Administrator
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Acceso Administrador</h1>
                        <p className="text-slate-500 mt-2 text-sm">Acceso exclusivo para administradores de la plataforma.</p>
                        {(error || serverError) && (
                            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                                    <span className="material-symbols-outlined text-[18px]">error</span>
                                    <span>{error || serverError?.message}</span>
                                </div>
                                {serverError?.description && (
                                    <p className="text-xs text-red-500 leading-relaxed pl-6">
                                        {serverError.description}
                                    </p>
                                )}
                                {serverError?.description?.includes('Scan error') && (
                                    <div className="mt-2 p-3 bg-white/50 border border-red-200 rounded-lg">
                                        <p className="text-[11px] text-red-800 font-bold uppercase tracking-wider mb-1">Solución Crítica:</p>
                                        <p className="text-[11px] text-red-700 leading-normal">
                                            Tu usuario de autenticación está corrupto en Supabase.
                                            Para arreglarlo: Ve al Dashboard de Supabase &gt; Authentication &gt; User Management y <strong>ELIMINA</strong> tu usuario.
                                            Luego vuelve aquí e inicia sesión de nuevo con Google.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-1.5 group/field">
                            <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="email">Email Admin</label>
                            <div className="relative">
                                <input
                                    className="w-full h-14 px-4 pl-11 bg-white rounded-xl border-none text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200 focus:ring-2 focus:ring-slate-800 focus:outline-none transition-all duration-200 shadow-sm"
                                    id="email"
                                    name="email"
                                    placeholder="admin@gateway.edu"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />

                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within/field:text-slate-800">
                                    <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 group/field">
                            <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="password">Clave Secreta</label>
                            <div className="relative">
                                <input
                                    className="w-full h-14 px-4 pl-11 bg-white rounded-xl border-none text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200 focus:ring-2 focus:ring-slate-800 focus:outline-none transition-all duration-200 shadow-sm"
                                    id="password"
                                    name="password"
                                    placeholder="••••••••••••"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />

                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within/field:text-slate-800">
                                    <span className="material-symbols-outlined text-[22px]">vpn_key</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-2 cursor-pointer group/check">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <div className="size-5 rounded-md border-2 border-slate-200 peer-checked:border-slate-800 peer-checked:bg-slate-800 transition-all group-hover/check:border-slate-800/50"></div>
                                    <span className="material-symbols-outlined text-white text-[16px] absolute scale-0 peer-checked:scale-100 transition-transform">check</span>
                                </div>
                                <span className="text-sm font-semibold text-slate-600 group-hover/check:text-slate-900 transition-colors">Recuérdame</span>
                            </label>

                            <a className="text-sm font-medium text-slate-400 hover:text-slate-800 transition-colors hover:underline decoration-2 underline-offset-4" href="#">
                                Solicitar nueva clave
                            </a>
                        </div>

                        <button
                            className="w-full h-14 mt-4 bg-[#1e293b] text-white font-bold rounded-xl text-[15px] shadow-lg shadow-slate-900/20 transition-all duration-300 hover:bg-[#0f172a] hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 group/btn disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Acceso Autorizado</span>
                                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover/btn:translate-x-1">lock_open</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-100"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-4 text-slate-400 font-semibold tracking-wider">O continúa con</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            handleGoogleLogin();
                        }}
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

                    <div className="mt-8 text-center space-y-4">
                        <p className="text-sm font-medium text-slate-500">
                            ¿Necesitas una cuenta de admin? <Link to="/admin/register" className="text-slate-900 font-bold hover:underline">Regístrate aquí</Link>
                        </p>
                        <Link to="/login" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Volver al Portal de Alumnos
                        </Link>
                    </div>

                </div>

                <div className="absolute bottom-6 left-0 right-0 text-center md:text-left md:pl-16">
                    <p className="text-xs text-slate-300 font-medium">
                        © 2024 LearnWithLore · Secure Admin Console
                    </p>
                </div>
            </div>
        </div>
    );
}
