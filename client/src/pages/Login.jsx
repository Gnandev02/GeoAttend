import { useState, useContext, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, User as UserIcon } from 'lucide-react';

const Login = ({ forceRole }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loadingLocal, setLoadingLocal] = useState(false);

    const { login, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Parse role from URL query params or forceRole prop
    const queryParams = new URLSearchParams(location.search);
    const roleParam = forceRole || queryParams.get('role');
    const isLoginAdmin = roleParam === 'admin';

    // Pre-fill demo credentials for convenience based on role selected
    useEffect(() => {
        if (isLoginAdmin) {
            setEmail('admin@geo.edu');
            setPassword('password');
        } else if (roleParam === 'student') {
            setEmail('student@geo.edu');
            setPassword('password');
        }
    }, [roleParam, isLoginAdmin]);

    // Redirect if already logged in
    if (user) {
        return <Navigate to={user.role === 'admin' ? "/admin" : "/student"} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoadingLocal(true);

        const result = await login(email, password);

        setLoadingLocal(false);

        if (result.success) {
            // Navigation is handled by the AuthContext state change updating the generic route
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0284c7]/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

            <div className="w-full max-w-md relative z-10">

                {/* Logo Area */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#0284c7] text-white shadow-[0_8px_16px_rgba(2,132,199,0.2)] mb-4">
                        {isLoginAdmin ? <ShieldCheck size={28} /> : <UserIcon size={28} />}
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {isLoginAdmin ? 'Admin Access' : 'Student Portal'}
                    </h2>
                    <p className="mt-2 text-slate-500 font-medium text-sm">
                        {isLoginAdmin ? 'Secure dashboard access for administrators' : 'Verify your campus attendance live'}
                    </p>
                </div>

                <div className="saas-card p-8 sm:p-10 relative overflow-hidden">
                    {/* Top highlight bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0284c7] to-indigo-500"></div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="saas-input"
                                    placeholder={isLoginAdmin ? "admin@geo.edu" : "student@geo.edu"}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex justify-between">
                                    <span>Password</span>
                                    <a href="#" className="text-[#0284c7] hover:text-[#0369a1] capitalize tracking-normal font-semibold">Forgot?</a>
                                </label>
                                <input
                                    type="password"
                                    required
                                    className="saas-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 text-sm py-3 px-4 rounded-lg font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loadingLocal}
                            className={`w-full btn-primary py-3.5 text-base ${loadingLocal ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loadingLocal ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Authenticating...
                                </span>
                            ) : (
                                'Sign in securely'
                            )}
                        </button>
                    </form>
                </div>

                {/* Back Link */}
                <div className="mt-8 text-center text-sm font-medium">
                    <a href="/" className="text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to GeoAttend
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Login;
