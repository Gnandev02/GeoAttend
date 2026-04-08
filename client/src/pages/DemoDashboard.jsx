import React from 'react';
import {
    Users, CheckCircle, MapPin, Activity,
    ArrowLeft, LayoutDashboard, FileText, PieChart
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DemoDashboard = () => {
    // Static mockup data for demo purposes
    const studentsCount = 542;
    const attendanceCount = 12480;
    const campus = { name: "Central Tech Campus", radius: 500 };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top Warning Banner for Demo */}
            <div className="bg-[#0284c7] text-white py-2 px-6 flex justify-between items-center text-xs font-bold uppercase tracking-widest z-50">
                <span className="flex items-center gap-2">
                    <Activity className="w-3 h-3" />
                    Public Preview Mode • Read Only
                </span>
                <Link to="/" className="hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    Back to Landing
                </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-6 p-6 h-[calc(100vh-32px)]">
                {/* Sidebar Navigation (Mock) */}
                <div className="w-full md:w-64 saas-card flex flex-col overflow-hidden flex-shrink-0">
                    <div className="p-6 border-b border-slate-50 flex flex-col items-center md:items-start text-center md:text-left">
                        <div className="w-14 h-14 rounded-full bg-[#0ea5e9]/10 text-[#0284c7] flex items-center justify-center text-xl font-bold mb-3 shadow-inner">
                            D
                        </div>
                        <h2 className="font-bold text-slate-900 tracking-tight text-lg">Demo Portal</h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Admin Experience Preview</p>
                    </div>

                    <div className="p-4 flex-1 space-y-1.5">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-[#0284c7]/10 text-[#0284c7]">
                            <LayoutDashboard className="w-4 h-4" /> Overview
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 cursor-not-allowed opacity-60">
                            <Users className="w-4 h-4" /> Manage Students
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 cursor-not-allowed opacity-60">
                            <FileText className="w-4 h-4" /> Attendance Logs
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 cursor-not-allowed opacity-60">
                            <MapPin className="w-4 h-4" /> Campus Setup
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-50">
                        <Link to="/login?role=admin" className="btn-primary w-full text-center text-xs">
                            Get Full Access
                        </Link>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 pb-6 space-y-6 scrollbar-hide">
                    {/* Top Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="saas-card p-6 flex flex-col justify-center relative overflow-hidden">
                            <Users className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 opacity-50 pointer-events-none" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registered</p>
                            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{studentsCount}</h3>
                            <p className="text-sm text-green-600 font-bold mt-2 flex items-center"><Activity className="w-3 h-3 mr-1" /> Active Students</p>
                        </div>

                        <div className="saas-card p-6 flex flex-col justify-center relative overflow-hidden">
                            <CheckCircle className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 opacity-50 pointer-events-none" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Logs</p>
                            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{attendanceCount}</h3>
                            <p className="text-sm text-[#0284c7] font-bold mt-2 flex items-center">Real-time GPS Verified</p>
                        </div>

                        <div className="saas-card p-6 bg-gradient-to-br from-[#0f172a] to-[#0284c7] text-white flex flex-col justify-center relative overflow-hidden">
                            <MapPin className="absolute -right-4 -bottom-4 w-24 h-24 text-white opacity-10 pointer-events-none" />
                            <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Active Geofence</p>
                            <h3 className="text-xl font-extrabold text-white mt-1 leading-tight">{campus.name}</h3>
                            <div className="mt-3 flex gap-4 text-sm font-semibold text-blue-100">
                                <span>Radius: {campus.radius}m</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Mock Chart Area */}
                        <div className="saas-card p-8 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900">Attendance Distribution</h3>
                                <PieChart className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="h-64 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-32 h-32 rounded-full border-[12px] border-slate-200 border-t-[#0284c7] animate-spin-slow mb-4 mx-auto"></div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Live Analytics Loading...</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Table (Mock) */}
                        <div className="saas-card overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-slate-900">Recent Verification Logs</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {[
                                    { name: "Gnandev", time: "09:02 AM", status: "Present" },
                                    { name: "Praveen", time: "09:05 AM", status: "Present" },
                                    { name: "Charan", time: "09:12 AM", status: "Rejected" },
                                    { name: "Kamal", time: "09:15 AM", status: "Present" },
                                ].map((item, i) => (
                                    <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                {item.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                                <p className="text-[10px] font-semibold text-slate-400">{item.time}</p>
                                            </div>
                                        </div>
                                        <span className={item.status === 'Present' ? 'badge-success' : 'badge-danger'}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Geofence Visualization (Mock) */}
                    <div className="saas-card p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Active Geofence Visualization</h3>
                                <p className="text-sm font-medium text-slate-500">Real-time student location distribution on campus.</p>
                            </div>
                            <div className="px-4 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-bold animate-pulse">
                                LIVE MAP
                            </div>
                        </div>

                        <div className="h-96 rounded-2xl bg-slate-50 border border-slate-200 relative overflow-hidden flex items-center justify-center shadow-inner">
                            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]"></div>

                            <div className="relative z-10 w-64 h-64 rounded-full border-2 border-dashed border-[#0284c7] bg-[#0284c7]/5 flex items-center justify-center">
                                <div className="w-4 h-4 bg-[#0284c7] rounded-full shadow-[0_0_20px_rgba(2,132,199,0.5)]"></div>

                                {/* Animated random dots */}
                                <div className="absolute top-1/4 left-1/3 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                                <div className="absolute bottom-1/3 right-1/4 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)] delay-150"></div>
                                <div className="absolute top-1/2 right-1/3 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)] delay-300"></div>
                                <div className="absolute bottom-1/4 left-1/2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-bounce translate-y-32"></div>
                            </div>

                            <div className="absolute bottom-6 right-6 saas-card p-4 text-[10px] font-bold text-slate-500 flex flex-col gap-2">
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Within Zone</div>
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Outside Zone</div>
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#0284c7]"></span> Geofence Center</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemoDashboard;
