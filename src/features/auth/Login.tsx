import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function Login() {
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent, role: 'student' | 'admin') => {
        e.preventDefault();
        if (role === 'student') navigate('/student/dashboard');
        if (role === 'admin') navigate('/admin/dashboard');
    };

    return (
        <div className="w-full">
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-xl shadow-primary/30 mb-6">
                    <span className="material-symbols-outlined text-[40px]">translate</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Welcome to LearnWithLore</h1>
                <p className="text-slate-500 font-medium">Log in to enter the portal</p>
            </div>

            <Card padding="lg" className="shadow-xl shadow-slate-200/50 dark:shadow-none">
                <form className="space-y-5" onSubmit={(e) => handleLogin(e, 'student')}>
                    <Input
                        label="Email Address"
                        placeholder="student@example.com"
                        type="email"
                        icon={<span className="material-symbols-outlined">mail</span>}
                    />

                    <Input
                        label="Password"
                        placeholder="••••••••"
                        type="password"
                        icon={<span className="material-symbols-outlined">lock</span>}
                    />

                    <div className="flex items-center justify-between mt-2 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 w-4 h-4" />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Remember me</span>
                        </label>
                        <a href="#" className="text-sm font-bold text-primary hover:underline">Forgot password?</a>
                    </div>

                    <Button type="submit" fullWidth className="mt-6 mb-4" size="lg">
                        Enter the Portal
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        fullWidth
                        onClick={(e) => handleLogin(e, 'admin')}
                    >
                        Log in as Admin
                    </Button>
                </form>

                <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-800 pt-6">
                    <p className="text-slate-500 font-medium">
                        New student? <a href="/register" className="font-bold text-primary hover:underline">Create an account</a>
                    </p>
                </div>
            </Card>
        </div>
    );
}
