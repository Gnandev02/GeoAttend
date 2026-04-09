import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

const LandingPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showRoleSelector, setShowRoleSelector] = useState(false);
    const [totalVerified, setTotalVerified] = useState("...");
    const [systemAccuracy, setSystemAccuracy] = useState("...");
    const [activeStudents, setActiveStudents] = useState("...");

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/main?action=get-landing-stats');
                const data = await res.json();
                
                if (data.success) {
                    setTotalVerified(data.total_attendance_count <= 500 ? data.total_attendance_count : "500+");
                    setSystemAccuracy(data.accuracy > 0 ? `${data.accuracy}%` : '0%');
                    setActiveStudents(data.total_students <= 500 ? data.total_students : "500+");
                }
            } catch (err) {
                console.error("Failed to fetch landing stats:", err);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, []);

    const isLogged = !!user;
    const dashboardPath = user?.role === 'admin' ? '/admin' : '/student';
    const userName = user?.name || 'Dashboard';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="font-body text-slate-600 bg-white antialiased selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed w-full z-50 transition-all duration-300 glass-nav py-4 px-6 sm:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </div>
                        <span className="font-sans font-bold text-xl tracking-tight text-slate-900">Geo<span
                            className="text-brand-600">Attend</span></span>
                    </div>

                    <div className="hidden md:flex items-center gap-10">
                        {/* Navigation Links */}
                        <div className="flex items-center gap-8">
                            <a href="#how-it-works"
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">How it Works</a>
                            <a href="#features"
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Features</a>
                        </div>

                        {/* Auth Buttons Group */}
                        <div className="flex items-center gap-6" id="auth-buttons-desktop">
                            {!isLogged ? (
                                <div className="relative group">
                                    <button
                                        className="flex items-center gap-1 text-sm font-semibold text-slate-800 hover:text-brand-600 transition-colors py-2">
                                        Log in
                                        <svg xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180 text-slate-400"
                                            viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd"
                                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    {/* Dropdown Menu */}
                                    <div
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top translate-y-2 group-hover:translate-y-0 z-50 overflow-hidden">
                                        <div className="p-1.5 space-y-0.5">
                                            <Link to="/student-login"
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors group/item">
                                                <div
                                                    className="w-8 h-8 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center transition-colors group-hover/item:bg-white group-hover/item:shadow-sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20"
                                                        fill="currentColor">
                                                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                                    </svg>
                                                </div>
                                                Student Login
                                            </Link>
                                            <Link to="/admin-login"
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors group/item">
                                                <div
                                                    className="w-8 h-8 rounded-md bg-slate-50 text-slate-500 flex items-center justify-center transition-colors group-hover/item:bg-white group-hover/item:shadow-sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                                                        viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                            d="M9 12l2 2 4-4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                Admin Login
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <button className="flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-brand-600 transition-colors py-2 px-3 rounded-xl border border-slate-100 hover:border-brand-200 bg-white/50 shadow-sm">
                                        <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold uppercase shadow-sm">
                                            {userName.charAt(0)}
                                        </div>
                                        <span className="hidden lg:inline">{userName.split(' ')[0]}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top translate-y-2 group-hover:translate-y-0 z-50 overflow-hidden">
                                        <div className="p-1.5 space-y-0.5">
                                            <Link to={dashboardPath} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors">
                                                <div className="w-8 h-8 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                                    </svg>
                                                </div>
                                                Dashboard
                                            </Link>
                                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 hover:text-red-700 text-sm font-medium text-slate-700 transition-colors text-left group/logout">
                                                <div className="w-8 h-8 rounded-md bg-red-50 text-red-500 flex items-center justify-center group-hover/logout:bg-white transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                    </svg>
                                                </div>
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <button id="mobile-menu-btn" className="md:hidden text-slate-900 p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                <div id="mobile-menu"
                    className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 shadow-lg px-6 py-4 flex-col gap-4`}>
                    <a href="#how-it-works" className="text-base font-medium text-slate-700">How it Works</a>
                    <a href="#features" className="text-base font-medium text-slate-700">Features</a>

                    <div id="auth-buttons-mobile" className="flex flex-col gap-4">
                        {!isLogged ? (
                            <>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Login</p>
                                    <Link to="/student-login" className="text-base font-medium text-slate-800 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-600" viewBox="0 0 20 20"
                                            fill="currentColor">
                                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                        </svg>
                                        Student Portal
                                    </Link>
                                    <Link to="/admin-login" className="text-base font-medium text-slate-800 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                d="M9 12l2 2 4-4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z" />
                                        </svg>
                                        Admin Portal
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-bold uppercase">
                                            {userName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{userName}</p>
                                            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                                        </div>
                                    </div>
                                    <Link to={dashboardPath} className="text-base font-medium text-slate-800 flex items-center gap-2">
                                        Dashboard
                                    </Link>
                                    <button onClick={handleLogout} className="text-base font-medium text-red-600 flex items-center gap-2 text-left w-full">
                                        Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main
                className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 sm:px-12 lg:px-24 overflow-hidden border-b border-slate-100 hero-gradient">
                {/* Background Grid */}
                <div
                    className="absolute inset-0 z-0 bg-grid-slate-100 [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none">
                </div>

                <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center relative z-10">

                    {/* Hero Content */}
                    <div className="space-y-8 text-center lg:text-left">
                        <h1
                            className="font-sans font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-tight text-slate-900">
                            Automated Campus Attendance <br />
                            Verified by <span className="text-[#0284c7]">Real-Time GPS</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-body">
                            Eliminate proxy attendance with secure, browser-based location verification built for modern
                            institutions. Precise, private, and effortless.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4"
                            id="hero-cta-buttons">
                            {isLogged ? (
                                <Link to={dashboardPath}
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-base hover:bg-slate-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group">
                                    Go to Dashboard
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </Link>
                            ) : (
                                <div className="relative w-full sm:w-auto">
                                    <button
                                        onClick={() => setShowRoleSelector(!showRoleSelector)}
                                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-base hover:bg-slate-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group">
                                        Get Started
                                        <svg xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </button>

                                    {/* Role Selector Overlay/Dropdown */}
                                    {showRoleSelector && (
                                        <div className="absolute top-full left-0 mt-3 w-full sm:w-72 bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                                            <div className="p-2 space-y-2">
                                                <Link to="/student-login" className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors group/role">
                                                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover/role:bg-white transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                                        </svg>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-slate-900 leading-none">Student Portal</p>
                                                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Verify campus attendance</p>
                                                    </div>
                                                </Link>
                                                <Link to="/admin-login" className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors group/role">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center group-hover/role:bg-white transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-slate-900 leading-none">Admin Dashboard</p>
                                                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Manage records & geofences</p>
                                                    </div>
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    const preview = document.getElementById('dashboard-preview');
                                    if (preview) preview.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-base hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Watch Demo
                            </button>
                        </div>
                    </div>

                    {/* Hero Visual: Mockup */}
                    <div className="relative w-full aspect-[4/3] max-w-lg mx-auto lg:mx-0 animate-float">
                        {/* Decorative Glow */}
                        <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-brand-400/20 blur-[80px] rounded-full pointer-events-none">
                        </div>

                        {/* Dashboard UI Card */}
                        <div className="absolute inset-0 glass-card rounded-2xl z-20 overflow-hidden flex flex-col">
                            {/* Top Bar */}
                            <div className="h-12 border-b border-slate-100 flex items-center px-4 justify-between bg-white/50">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                                </div>
                                <div className="text-[10px] font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                    admin.geoattend.com</div>
                                <div className="w-6 h-6 bg-slate-100 rounded-full"></div>
                            </div>

                            {/* App Content */}
                            <div className="flex-1 p-5 flex flex-col gap-4 bg-slate-50/50">
                                {/* Header Area */}
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h3 className="text-slate-900 font-semibold text-sm">Live Attendance</h3>
                                        <p className="text-slate-400 text-xs mt-0.5">CS 101 • Main Campus</p>
                                    </div>
                                    <div
                                        className="bg-green-50 text-green-700 border border-green-200 text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                                    </div>
                                </div>

                                {/* Map Area */}
                                <div
                                    className="relative w-full h-32 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                                    {/* Map background pattern */}
                                    <div className="absolute inset-0"
                                        style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '10px 10px', opacity: 0.5 }}>
                                    </div>

                                    {/* Geofence polygon */}
                                    <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 overflow-visible text-brand-300" viewBox="0 0 100 100">
                                        <polygon points="50,5 90,30 80,80 20,80 10,30" className="fill-brand-50/40 stroke-current stroke-1 pointer-events-none" strokeDasharray="4" />
                                    </svg>

                                    {/* Map Pins */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-brand-100 animate-pulse"></div>
                                    <div className="absolute top-1/3 right-1/3 w-2 h-2 rounded-full bg-brand-400 ring-2 ring-white"></div>
                                    <div className="absolute bottom-1/4 -right-4 w-2 h-2 rounded-full bg-slate-400 ring-2 ring-white"></div>
                                </div>

                                {/* Stats Area */}
                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    <div className="bg-white border border-slate-100 rounded-lg p-3">
                                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Total Verified</div>
                                        <div className="text-slate-900 font-bold text-lg mt-0.5">{totalVerified}</div>
                                    </div>
                                    <div className="bg-white border border-slate-100 rounded-lg p-3 relative group cursor-help">
                                        <div className="text-slate-400 text-[10px] uppercase font-semibold truncate" title="Accuracy reflects how many attendances were automatically verified without admin intervention">GeoAttend Accuracy</div>
                                        <div className="text-brand-600 font-bold text-lg mt-0.5">{systemAccuracy}</div>
                                        
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 text-[10px] bg-slate-800 text-white shadow-lg rounded p-2 text-center pointer-events-none z-50">
                                            Accuracy reflects how many attendances were automatically verified without admin intervention
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Mini Card */}
                        <div
                            className="absolute -right-6 top-1/4 glass-card p-3 rounded-lg shadow-sm z-30 border border-slate-100 animate-float-delayed">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20"
                                        fill="currentColor">
                                        <path fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Geo-based Verification</div>
                                    <div className="text-[11px] font-bold text-slate-800 mt-0.5">Location verified inside boundary</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main >

            {/* Trusted By Section */}
            < section className="py-12 px-6 border-b border-slate-100 bg-slate-50/50" >
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-16 gap-y-8">
                    <div className="flex flex-col items-center">
                        <div className="font-sans font-bold text-3xl text-slate-900">{activeStudents}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">Active Students</div>
                    </div>
                    <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col items-center">
                        <div className="font-sans font-bold text-3xl text-slate-900">{systemAccuracy}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">GeoAttend Accuracy</div>
                    </div>
                    <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col items-center">
                        <div className="font-sans font-bold text-3xl text-slate-900">Full Stack</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">Modern Web Technologies</div>
                    </div>
                </div>
            </section >

            {/* How It Works Section */}
            < section id="how-it-works" className="py-24 px-6 sm:px-12 lg:px-24 bg-white relative" >
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-brand-600 font-semibold tracking-wide text-sm uppercase mb-3">Workflow</h2>
                        <h3 className="font-sans font-bold text-3xl sm:text-4xl text-slate-900 mb-4">Mark attendance in seconds</h3>
                        <p className="text-lg text-slate-500 font-body">A frictionless experience for students that provides
                            cryptographically secure proof of location to administrators.</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8 relative">
                        {/* Connecting Line for Desktop */}
                        <div className="hidden md:block absolute top-[28px] left-[12%] right-[12%] h-px bg-slate-200 z-0"></div>

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div
                                className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm mb-6 icon-container text-brand-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h4 className="font-semibold text-slate-900 mb-2">1. Secure Login</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">Students authenticate via their institution
                                credentials.</p>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div
                                className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm mb-6 icon-container text-brand-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                </svg>
                            </div>
                            <h4 className="font-semibold text-slate-900 mb-2">2. Location Permission</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">Browser requests single-use precise GPS
                                coordinates.</p>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div
                                className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm mb-6 icon-container text-brand-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h4 className="font-semibold text-slate-900 mb-2">3. Geofence Verification</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">System validates position against active class
                                boundaries.</p>
                        </div>

                        {/* Step 4 */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div
                                className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm mb-6 icon-container text-brand-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h4 className="font-semibold text-slate-900 mb-2">4. Attendance Marked</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">Presence recorded instantly on the admin
                                dashboard.</p>
                        </div>
                    </div>
                </div>
            </section >

            {/* Features Section */}
            < section id="features" className="py-24 px-6 sm:px-12 lg:px-24 bg-slate-50 border-y border-slate-100" >
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                        <div className="max-w-2xl">
                            <h2 className="font-sans font-bold text-3xl sm:text-4xl text-slate-900 mb-4">Enterprise-grade attendance
                            </h2>
                            <p className="text-lg text-slate-500 font-body">Powerful features designed to reduce overhead and
                                enhance data integrity across your entire campus.</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="p-8 rounded-xl bg-white border border-slate-200 hover:border-brand-300 transition-colors">
                            <div
                                className="w-10 h-10 rounded-lg icon-container flex items-center justify-center text-brand-600 mb-5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-2">Dynamic Geofencing</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Draw and modify virtual boundaries around precise
                                classroom locations on the map interface.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-8 rounded-xl bg-white border border-slate-200 hover:border-brand-300 transition-colors">
                            <div
                                className="w-10 h-10 rounded-lg icon-container flex items-center justify-center text-brand-600 mb-5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-2">Anti-Proxy Security</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Browser-level hardware APIs prevent spoofing.
                                Requires active consent and physical presence.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-8 rounded-xl bg-white border border-slate-200 hover:border-brand-300 transition-colors">
                            <div
                                className="w-10 h-10 rounded-lg icon-container flex items-center justify-center text-brand-600 mb-5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-2">Admin Analytics</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Comprehensive dashboards with historical trends,
                                exportable reports, and absence tracking.</p>
                        </div>

                        {/* Feature 4 */}
                        <div className="p-8 rounded-xl bg-white border border-slate-200 hover:border-brand-300 transition-colors">
                            <div
                                className="w-10 h-10 rounded-lg icon-container flex items-center justify-center text-brand-600 mb-5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-2">Real-Time GPS Validation</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Instantly calculates distance from the defined
                                center point. No polling delays.</p>
                        </div>

                        {/* Feature 5 */}
                        <div className="p-8 rounded-xl bg-white border border-slate-200 hover:border-brand-300 transition-colors">
                            <div
                                className="w-10 h-10 rounded-lg icon-container flex items-center justify-center text-brand-600 mb-5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-2">Multi-Campus Support</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Manage attendance across multiple physical
                                locations from a single unified workspace.</p>
                        </div>

                        {/* Feature 6 */}
                        <div className="p-8 rounded-xl bg-white border border-slate-200 hover:border-brand-300 transition-colors">
                            <div
                                className="w-10 h-10 rounded-lg icon-container flex items-center justify-center text-brand-600 mb-5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-2">Secure Authentication</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Integrates with modern SSO providers and utilizes
                                secure JWT for session management.</p>
                        </div>
                    </div>
                </div>
            </section >

            {/* Comparison Section */}
            < section id="compare" className="py-24 px-6 sm:px-12 lg:px-24 bg-white border-b border-slate-100" >
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="font-sans font-bold text-3xl text-slate-900 mb-4">The modern standard</h2>
                    </div>

                    <div className="overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-900 w-1/3">Feature</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-500 w-1/3">Traditional Methods</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-brand-700 bg-brand-50/30 w-1/3">GeoAttend
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-100">
                                <tr>
                                    <td className="py-4 px-6 font-medium text-slate-900">Proxy Attendance</td>
                                    <td className="py-4 px-6 text-slate-500">Highly vulnerable</td>
                                    <td className="py-4 px-6 text-slate-900 bg-brand-50/20 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24"
                                            stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Eliminated via GPS
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-6 font-medium text-slate-900">Hardware Required</td>
                                    <td className="py-4 px-6 text-slate-500">Scanners, Registers</td>
                                    <td className="py-4 px-6 text-slate-900 bg-brand-50/20 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24"
                                            stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        None (BYOD)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-6 font-medium text-slate-900">Time to Mark</td>
                                    <td className="py-4 px-6 text-slate-500">10-15 mins per class</td>
                                    <td className="py-4 px-6 text-slate-900 bg-brand-50/20 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24"
                                            stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        &lt; 5 seconds
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-6 font-medium text-slate-900">Data Analytics</td>
                                    <td className="py-4 px-6 text-slate-500">Manual compilation</td>
                                    <td className="py-4 px-6 text-slate-900 bg-brand-50/20 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24"
                                            stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Real-time dashboards
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section >


            {/* Final CTA Section */}
            < section className="py-24 px-6 sm:px-12 text-center relative overflow-hidden bg-slate-900 border-t border-slate-800" >
                {/* Dark grid background */}
                < div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: "linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div >

                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-600/30 blur-[100px] rounded-full pointer-events-none">
                </div>

                <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                    <h2 className="font-sans font-bold text-3xl sm:text-5xl text-white">
                        Upgrade Your Campus Attendance System today.
                    </h2>
                    <p className="text-slate-400 text-lg">
                        Deploy GeoAttend and eliminate manual verification overhead without buying custom hardware.
                    </p>
                    <div className="pt-4 flex justify-center">
                        <Link to="/login"
                            className="px-8 py-4 rounded-md bg-white text-slate-900 font-semibold text-lg hover:bg-slate-50 transition-colors shadow-sm focus:ring-4 focus:ring-white/20">
                            Get Started
                        </Link>
                    </div>
                </div>
            </section >

            {/* Footer */}
            < footer className="bg-white border-t border-slate-200 py-12 px-6 sm:px-12 lg:px-24" >
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                    strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                            </div>
                            <span className="font-sans font-bold text-lg text-slate-900">GeoAttend</span>
                        </div>
                        <p className="text-sm text-slate-500">&copy; 2026 GeoAttend Inc. All rights reserved.</p>
                    </div>

                    <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium text-slate-600">
                        <a href="#" className="hover:text-brand-600 transition-colors">About</a>
                        <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
                        <a href="#" className="hover:text-brand-600 transition-colors">Contact</a>
                        <a href="#" className="hover:text-brand-600 transition-colors">Privacy Policy</a>
                    </div>
                </div>
            </footer >
        </div >
    );
};

export default LandingPage;
