import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
    MapPin, Clock, Calendar, AlertCircle,
    LayoutDashboard, BookOpen, BarChart3, Settings, LogOut, CheckCircle2
} from 'lucide-react';

const StudentDashboard = () => {
    const [profile, setProfile] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [markResult, setMarkResult] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [profileRes, attendanceRes] = await Promise.all([
                api.get('/student/profile'),
                api.get('/student/attendance')
            ]);
            setProfile(profileRes.data);
            setAttendance(attendanceRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = () => {
        setLocationError('');
        setMarkResult(null);
        setMarking(true);

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            setMarking(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;

                    const res = await api.post('/student/mark', {
                        lat: latitude,
                        lng: longitude,
                        sessionName: 'Main Session'
                    });

                    setMarkResult({
                        success: true,
                        message: res.data.message,
                        distance: res.data.distance
                    });

                    fetchData();
                } catch (error) {
                    setMarkResult({
                        success: false,
                        message: error.response?.data?.message || 'Error marking attendance'
                    });
                } finally {
                    setMarking(false);
                }
            },
            (error) => {
                setMarking(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('Location permission denied.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location information unavailable.');
                        break;
                    case error.TIMEOUT:
                        setLocationError('Location request timed out.');
                        break;
                    default:
                        setLocationError('Unknown location error.');
                        break;
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Calculate overall attendance percentage
    const presentCount = attendance.filter(r => r.status === 'Present').length;
    const totalCount = attendance.length;
    const attendancePercentage = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);

    // Mock Subject-wise breakdown for UI display
    const subjects = [
        { name: 'Software Engineering', present: 24, total: 28, color: 'bg-blue-500' },
        { name: 'Database Systems', present: 18, total: 20, color: 'bg-purple-500' },
        { name: 'Computer Networks', present: 15, total: 22, color: 'bg-indigo-500' },
        { name: 'Web Technologies', present: 20, total: 20, color: 'bg-green-500' },
    ];

    // Mock Monthly Chart Data
    const monthlyData = [
        { month: 'Jan', value: 85 }, { month: 'Feb', value: 92 },
        { month: 'Mar', value: 78 }, { month: 'Apr', value: 95 },
        { month: 'May', value: 88 }
    ];

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-100px)] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-120px)] mt-[-1rem]">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 saas-card flex flex-col overflow-hidden flex-shrink-0 mb-6 md:mb-0">
                <div className="p-6 border-b border-slate-50 flex flex-col items-center md:items-start text-center md:text-left">
                    <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold mb-3 shadow-inner">
                        {profile?.userId?.name?.charAt(0) || 'S'}
                    </div>
                    <h2 className="font-bold text-slate-900 tracking-tight text-lg">{profile?.userId?.name || 'Student'}</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{profile?.rollNumber} • {profile?.department}</p>
                </div>

                <div className="p-4 flex-1 space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-hidden scrollbar-hide">
                    <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors shrink-0 md:w-full ${activeTab === 'overview' ? 'bg-[#0284c7]/10 text-[#0284c7]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </button>
                    <button onClick={() => setActiveTab('subjects')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors shrink-0 md:w-full ${activeTab === 'subjects' ? 'bg-[#0284c7]/10 text-[#0284c7]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <BookOpen className="w-4 h-4" /> My Subjects
                    </button>
                    <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors shrink-0 md:w-full ${activeTab === 'analytics' ? 'bg-[#0284c7]/10 text-[#0284c7]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <BarChart3 className="w-4 h-4" /> Analytics
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 pb-6 space-y-6 scrollbar-hide">

                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Overall Percentage */}
                    <div className="saas-card p-6 flex items-center gap-5">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path className="stroke-slate-100" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className={`${attendancePercentage >= 75 ? 'stroke-[#0284c7]' : 'stroke-orange-500'}`} strokeDasharray={`${attendancePercentage}, 100`} strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="absolute text-sm font-bold text-slate-800">{attendancePercentage}%</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Attendance</p>
                            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{presentCount} <span className="text-base font-semibold text-slate-400">/ {totalCount} classes</span></h3>
                        </div>
                    </div>

                    {/* Quick Status */}
                    <div className="saas-card p-6 flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Today's Status</p>
                        <div className="flex items-center gap-3">
                            {attendance.length > 0 && attendance[0].date === new Date().toISOString().split('T')[0] ? (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Marked Present</p>
                                        <p className="text-xs font-semibold text-slate-400">at {attendance[0].time}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <p className="font-bold text-slate-500">Pending</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Call to Action Container */}
                    <div className="saas-card p-6 bg-gradient-to-br from-[#0f172a] to-[#0284c7] flex items-center justify-between text-white relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
                        <div className="relative z-10 w-full">
                            <h3 className="font-bold mb-1">Verify Attendance</h3>
                            <p className="text-xs text-blue-100 mb-4 opacity-90 font-medium tracking-wide">Secure live GPS check-in</p>
                            <button
                                onClick={handleMarkAttendance}
                                disabled={marking}
                                className="w-full bg-white text-[#0f172a] hover:bg-slate-50 hover:-translate-y-0.5 font-bold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-80"
                            >
                                {marking ? <span className="animate-spin w-4 h-4 border-2 border-[#0f172a] border-t-transparent rounded-full"></span> : <MapPin className="w-4 h-4" />}
                                {marking ? 'Verifying...' : 'Mark Now'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Alerts / Notifications */}
                {locationError && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{locationError}</p>
                    </div>
                )}
                {markResult && (
                    <div className={`${markResult.success ? (markResult.message.includes('rejected') ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-green-50 border-green-100 text-green-800') : 'bg-red-50 border-red-100 text-red-800'} p-4 rounded-xl flex items-start gap-3 border`}>
                        <div className="flex-1">
                            <p className="text-sm font-medium">{markResult.message}</p>
                            {markResult.distance && <p className="text-xs mt-1 opacity-80">Distance verified: {markResult.distance}m</p>}
                        </div>
                    </div>
                )}

                {/* Split Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Attendance History Table */}
                    <div className="saas-card overflow-hidden flex flex-col h-96">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-900">Recent Logs</h3>
                            <button className="text-xs font-bold text-[#0284c7] hover:text-[#0369a1] transition-colors">View All</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {attendance.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                                    <Clock className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm font-medium">No recent records found.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {attendance.slice(0, 10).map((record) => (
                                        <div key={record._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-none">{format(new Date(record.date || new Date()), 'MMM')}</span>
                                                    <span className="text-sm font-extrabold text-slate-900 leading-none mt-1">{format(new Date(record.date || new Date()), 'dd')}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{record.time}</p>
                                                    <p className="text-xs font-semibold text-slate-400 mt-0.5"><MapPin className="inline w-3 h-3 mr-0.5" /> Campus Geo-zone</p>
                                                </div>
                                            </div>
                                            <span className={record.status === 'Present' ? 'badge-success' : 'badge-danger'}>
                                                {record.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Analytics / Breakdown */}
                    <div className="space-y-6">
                        {/* Monthly Bar Chart (Visual Mock) */}
                        <div className="saas-card p-6">
                            <h3 className="font-bold text-slate-900 mb-6">Subject Breakdown</h3>
                            <div className="space-y-4">
                                {subjects.map((sub, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between items-end mb-1.5">
                                            <span className="text-sm font-bold text-slate-700">{sub.name}</span>
                                            <span className="text-xs font-extrabold text-slate-400">{Math.round((sub.present / sub.total) * 100)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${sub.color} rounded-full`} style={{ width: `${(sub.present / sub.total) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Chart */}
                        <div className="saas-card p-6">
                            <h3 className="font-bold text-slate-900 mb-4">Monthly Trend</h3>
                            <div className="h-32 flex items-end gap-3 justify-between pt-4">
                                {monthlyData.map((data, i) => (
                                    <div key={i} className="flex flex-col items-center flex-1 gap-2">
                                        <div className="w-full relative flex items-end justify-center h-full bg-slate-50 rounded-t-md hover:bg-slate-100 transition-colors">
                                            <div className="w-full bg-[#0ea5e9]/20 absolute bottom-0 rounded-t-sm" style={{ height: `${data.value}%` }}></div>
                                            <div className="w-full bg-[#0284c7] absolute bottom-0 rounded-t-sm transition-all shadow-[0_-4px_10px_rgba(2,132,199,0.2)]" style={{ height: `${data.value - 10}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{data.month}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
