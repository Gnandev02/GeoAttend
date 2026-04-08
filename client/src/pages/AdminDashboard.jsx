import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
    Users, Settings, Map, CheckCircle, Trash2, Plus,
    RefreshCw, LayoutDashboard, Search, MapPin, Activity, FileText
} from 'lucide-react';
import { format } from 'date-fns';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview'); // overview, students, attendance, campus
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [campus, setCampus] = useState({ name: '', latitude: '', longitude: '', radius: '' });
    const [loading, setLoading] = useState(true);

    // Form state
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [studentFormData, setStudentFormData] = useState({ name: '', email: '', password: '', rollNumber: '', department: '' });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'students' || activeTab === 'overview') {
                const res = await api.get('/admin/students');
                setStudents(res.data);
            }
            if (activeTab === 'attendance' || activeTab === 'overview') {
                const res = await api.get('/admin/attendance');
                setAttendance(res.data);
            }
            if (activeTab === 'campus' || activeTab === 'overview') {
                const res = await api.get('/admin/campus');
                if (res.data) setCampus(res.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStudentSubmit = async (e) => {
        e.preventDefault();
        try {
            // First ensure we have a campus ID to link to
            let targetCampusId = campus?._id;

            if (!targetCampusId) {
                const campusRes = await api.get('/admin/campus');
                if (campusRes.data && campusRes.data._id) {
                    targetCampusId = campusRes.data._id;
                } else {
                    throw new Error('Please configure a campus in Campus Setup before adding students');
                }
            }

            await api.post('/admin/student', {
                ...studentFormData,
                campusId: targetCampusId
            });

            setShowStudentForm(false);
            setStudentFormData({ name: '', email: '', password: '', rollNumber: '', department: '' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || error.message || 'Error creating student');
        }
    };

    const handleDeleteStudent = async (id) => {
        if (window.confirm('Delete this student and all their records?')) {
            try {
                await api.delete(`/admin/student/${id}`);
                fetchData();
            } catch (error) {
                alert('Error deleting student');
            }
        }
    };

    const handleCampusSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/campus', {
                name: campus.name,
                latitude: parseFloat(campus.latitude),
                longitude: parseFloat(campus.longitude),
                radius: parseInt(campus.radius)
            });
            alert('Campus details updated successfully');
        } catch (error) {
            alert(error.response?.data?.message || 'Error updating campus');
        }
    };

    if (loading && activeTab === 'overview' && !students.length) {
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
                    <div className="w-14 h-14 rounded-full bg-[#0ea5e9]/10 text-[#0284c7] flex items-center justify-center text-xl font-bold mb-3 shadow-inner">
                        A
                    </div>
                    <h2 className="font-bold text-slate-900 tracking-tight text-lg">Admin Portal</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">System Master Controls</p>
                </div>

                <div className="p-4 flex-1 space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-hidden scrollbar-hide">
                    <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors shrink-0 md:w-full ${activeTab === 'overview' ? 'bg-[#0284c7]/10 text-[#0284c7]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <LayoutDashboard className="w-4 h-4" /> Overview
                    </button>
                    <button onClick={() => setActiveTab('students')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors shrink-0 md:w-full ${activeTab === 'students' ? 'bg-[#0284c7]/10 text-[#0284c7]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <Users className="w-4 h-4" /> Manage Students
                    </button>
                    <button onClick={() => setActiveTab('attendance')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors shrink-0 md:w-full ${activeTab === 'attendance' ? 'bg-[#0284c7]/10 text-[#0284c7]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <FileText className="w-4 h-4" /> Attendance Logs
                    </button>
                    <button onClick={() => setActiveTab('campus')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors shrink-0 md:w-full ${activeTab === 'campus' ? 'bg-[#0284c7]/10 text-[#0284c7]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <Map className="w-4 h-4" /> Campus Setup
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 pb-6 space-y-6 scrollbar-hide">

                {loading && activeTab !== 'overview' && (
                    <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg w-fit text-sm font-medium animate-pulse">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Fetching latest data...
                    </div>
                )}

                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                    <>
                        {/* Top Metrics Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="saas-card p-6 flex flex-col justify-center relative overflow-hidden">
                                <Users className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 opacity-50 pointer-events-none" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registered</p>
                                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{students.length}</h3>
                                <p className="text-sm text-green-600 font-bold mt-2 flex items-center"><Activity className="w-3 h-3 mr-1" /> Active Students</p>
                            </div>

                            <div className="saas-card p-6 flex flex-col justify-center relative overflow-hidden">
                                <CheckCircle className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 opacity-50 pointer-events-none" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Logs</p>
                                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{attendance.length}</h3>
                                <p className="text-sm text-[#0284c7] font-bold mt-2 flex items-center">Total Lifetime Records</p>
                            </div>

                            <div className="saas-card p-6 bg-gradient-to-br from-[#0f172a] to-[#0284c7] text-white flex flex-col justify-center relative overflow-hidden">
                                <MapPin className="absolute -right-4 -bottom-4 w-24 h-24 text-white opacity-10 pointer-events-none" />
                                <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Active Geofence</p>
                                <h3 className="text-xl font-extrabold text-white mt-1 leading-tight">{campus?.name || 'Not Configured'}</h3>
                                <div className="mt-3 flex gap-4 text-sm font-semibold text-blue-100">
                                    <span>Radius: {campus?.radius || 0}m</span>
                                </div>
                                <button onClick={() => setActiveTab('campus')} className="mt-4 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 px-3 rounded-lg w-fit transition-all hover:-translate-y-0.5">Edit Setup</button>
                            </div>
                        </div>

                        {/* Split Data View */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            {/* Quick Student List */}
                            <div className="saas-card flex flex-col h-[400px]">
                                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="font-bold text-slate-900">Recent Students</h3>
                                    <button onClick={() => setActiveTab('students')} className="text-xs font-bold text-[#0284c7] hover:text-[#0369a1] transition-colors">View All</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2">
                                    {students.slice(0, 6).map(s => (
                                        <div key={s._id} className="p-3 flex items-center gap-4 hover:bg-slate-50 rounded-xl transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{s.userId?.name?.charAt(0)}</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{s.userId?.name}</p>
                                                <p className="text-xs font-semibold text-slate-500">{s.rollNumber} • {s.department}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Live Map Preview (Mocked) */}
                            <div className="saas-card p-6 h-[400px] flex flex-col">
                                <h3 className="font-bold text-slate-900 mb-4">Live Campus Activity</h3>
                                <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 relative overflow-hidden flex items-center justify-center shadow-inner">
                                    {/* Mock Map Background */}
                                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]"></div>

                                    {campus?.radius ? (
                                        <div className="relative z-10 w-48 h-48 rounded-full border-2 border-[#0284c7] bg-[#0284c7]/10 flex items-center justify-center">
                                            <div className="w-3 h-3 bg-[#0284c7] rounded-full shadow-[0_0_0_4px_rgba(2,132,199,0.2)]"></div>
                                            {/* Mock Live student dots */}
                                            <div className="absolute top-1/4 left-1/3 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                                            <div className="absolute bottom-1/3 right-1/4 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)] delay-150"></div>
                                        </div>
                                    ) : (
                                        <p className="relative z-10 text-sm font-bold text-slate-500">No Geofence Configured</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* --- STUDENTS TAB --- */}
                {activeTab === 'students' && (
                    <div className="saas-card overflow-hidden h-[calc(100vh-140px)] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Student Directory</h2>
                                <p className="text-sm font-medium text-slate-500">Manage enrolled accounts and identities.</p>
                            </div>
                            <button
                                onClick={() => setShowStudentForm(!showStudentForm)}
                                className="flex items-center gap-2 btn-primary"
                            >
                                {showStudentForm ? 'Cancel Creation' : <><Plus className="w-4 h-4" /> Add Student</>}
                            </button>
                        </div>

                        {showStudentForm && (
                            <div className="p-6 border-b border-slate-100 bg-[#0284c7]/5">
                                <form onSubmit={handleStudentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700 uppercase">Full Name</label><input required className="saas-input py-2.5" value={studentFormData.name} onChange={e => setStudentFormData({ ...studentFormData, name: e.target.value })} placeholder="Gnandev" /></div>
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700 uppercase">Email</label><input required type="email" className="saas-input py-2.5" value={studentFormData.email} onChange={e => setStudentFormData({ ...studentFormData, email: e.target.value })} placeholder="john@student.edu" /></div>
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700 uppercase">Password</label><input required type="password" minLength="6" className="saas-input py-2.5" value={studentFormData.password} onChange={e => setStudentFormData({ ...studentFormData, password: e.target.value })} placeholder="Min. 6 characters" /></div>
                                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700 uppercase">Roll Number</label><input required className="saas-input py-2.5" value={studentFormData.rollNumber} onChange={e => setStudentFormData({ ...studentFormData, rollNumber: e.target.value })} placeholder="e.g. CS2024-001" /></div>
                                    <div className="space-y-1.5 md:col-span-2"><label className="text-xs font-bold text-slate-700 uppercase">Department</label><input required className="saas-input py-2.5" value={studentFormData.department} onChange={e => setStudentFormData({ ...studentFormData, department: e.target.value })} placeholder="Computer Science" /></div>

                                    <div className="md:col-span-2 pt-2">
                                        <button type="submit" className="btn-primary w-full md:w-auto">Create Student Account</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 z-10 shadow-sm">
                                    <tr>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Name & Email</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Roll No.</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Department</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-1/4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students.map(student => (
                                        <tr key={student._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="font-bold text-slate-900">{student.userId?.name}</div>
                                                <div className="text-xs font-semibold text-slate-500 mt-0.5">{student.userId?.email}</div>
                                            </td>
                                            <td className="py-4 px-6 text-sm font-semibold text-slate-600">{student.rollNumber}</td>
                                            <td className="py-4 px-6 text-sm font-semibold text-slate-600">{student.department}</td>
                                            <td className="py-4 px-6 text-right">
                                                <button onClick={() => handleDeleteStudent(student._id)} className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {students.length === 0 && (
                                        <tr><td colSpan="4" className="py-8 text-center text-slate-500 font-medium text-sm">No students found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- ATTENDANCE TAB --- */}
                {activeTab === 'attendance' && (
                    <div className="saas-card overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Global Verification Logs</h2>
                                <p className="text-sm font-medium text-slate-500">Immutable records of GPS-verified attendance attempts.</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 z-10 shadow-sm">
                                    <tr>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">GPS Coordinates</th>
                                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {attendance.map(record => (
                                        <tr key={record._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="font-bold text-slate-900 text-sm">{record.date}</div>
                                                <div className="text-xs font-semibold text-slate-500 mt-0.5">{record.time}</div>
                                            </td>
                                            <td className="py-4 px-6 text-sm font-bold text-slate-700">
                                                {record.studentId?.name || 'Unknown'}
                                            </td>
                                            <td className="py-4 px-6 text-xs font-mono font-semibold text-slate-500">
                                                {record.locationCoordinates?.lat?.toFixed(5) || 'N/A'}, {record.locationCoordinates?.lng?.toFixed(5) || 'N/A'}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={record.status === 'Present' ? 'badge-success' : 'badge-danger'}>
                                                    {record.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {attendance.length === 0 && (
                                        <tr><td colSpan="4" className="py-8 text-center text-slate-500 font-medium text-sm">No attendance records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- CAMPUS TAB --- */}
                {activeTab === 'campus' && (
                    <div className="max-w-3xl mx-auto md:mx-0">
                        <div className="saas-card overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                                    <MapPin className="w-5 h-5 mr-3 text-[#0284c7]" />
                                    Geofence Configuration
                                </h2>
                                <p className="text-sm font-medium text-slate-500 mt-2">Define the central coordinate and safe radius. Students marking attendance outside this zone will be blocked.</p>
                            </div>

                            <form onSubmit={handleCampusSubmit} className="p-8 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Campus Name / Identifier</label>
                                    <input required className="saas-input"
                                        value={campus.name} onChange={e => setCampus({ ...campus, name: e.target.value })} placeholder="e.g. Main Engineering Block" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Center Latitude</label>
                                        <input required type="number" step="any" className="saas-input font-mono text-sm"
                                            value={campus.latitude} onChange={e => setCampus({ ...campus, latitude: e.target.value })} placeholder="28.6139..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Center Longitude</label>
                                        <input required type="number" step="any" className="saas-input font-mono text-sm"
                                            value={campus.longitude} onChange={e => setCampus({ ...campus, longitude: e.target.value })} placeholder="77.2090..." />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Acceptable Radius</label>
                                    <div className="flex items-center gap-4">
                                        <input required type="number" className="saas-input w-full sm:w-1/2 text-lg font-bold"
                                            value={campus.radius} onChange={e => setCampus({ ...campus, radius: e.target.value })} placeholder="100" />
                                        <span className="text-sm font-bold text-slate-500">Meters</span>
                                    </div>
                                    <input type="range" min="10" max="1000" className="w-full sm:w-1/2 mt-4 accent-[#0284c7]" value={campus.radius || 0} onChange={e => setCampus({ ...campus, radius: e.target.value })} />
                                </div>

                                <div className="pt-6 border-t border-slate-100 flex justify-end">
                                    <button type="submit" className="btn-primary">
                                        Apply Geofence Settings
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
