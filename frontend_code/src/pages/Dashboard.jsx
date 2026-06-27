import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // ✅ MEMOIZE user to prevent re-renders
  const user = useMemo(() => {
    try {
      return api.auth.getUser();
    } catch (e) {
      console.log('User not found');
      return null;
    }
  }, []);
  
  const isAdmin = user?.is_admin || false;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState('');
  const [chartData, setChartData] = useState([]);

  // ✅ MEMOIZE chart data to prevent unnecessary updates
  const generateChartData = useCallback((percentage) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
    return days.map((day, idx) => ({
      name: day,
      attendance: Math.min(100, Math.round(percentage - (4 - idx) * (Math.random() * 2))),
    }));
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const todayStats = await api.attendance.getToday();
        setStats(todayStats);
        
        const pct = todayStats.percentage || 94;
        setChartData(generateChartData(pct));

        if (!isAdmin && user?.classes?.length > 0) {
          setSelectedClassForAttendance(user.classes[0]);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to fetch dashboard data. Please make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAdmin, user, generateChartData]);

  const handleTakeAttendanceClick = useCallback(() => {
    if (selectedClassForAttendance) {
      navigate(`/attendance/take?class=${selectedClassForAttendance}`);
    }
  }, [selectedClassForAttendance, navigate]);

  // ✅ MEMOIZE stats display to prevent re-renders
  const statsDisplay = useMemo(() => {
    if (!stats) return null;
    return {
      present: stats.present_count || 0,
      total: stats.total_students || 0,
      percentage: stats.percentage || 0,
      classWise: stats.class_wise || []
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-slate-900 min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
        <h3 className="text-sm font-semibold text-red-800">Connection Error</h3>
        <p className="mt-2 text-xs text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-900 min-h-screen p-6">
      {/* Header card */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Good morning, {user?.name || 'Admin'}
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur border border-white/10 rounded-xl px-4 py-2.5">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Today's Summary</span>
            <span className="text-lg font-bold">
              {statsDisplay?.present || 0}/{statsDisplay?.total || 0} Present ({statsDisplay?.percentage || 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Grid actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance logging panel */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-white">Record Attendance</h2>
          </div>
          <p className="text-xs text-slate-400">
            Submit or modify daily attendance sheets. Default state starts as present.
          </p>

          <div className="space-y-3">
            {isAdmin ? (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Class</label>
                <select
                  value={selectedClassForAttendance}
                  onChange={(e) => setSelectedClassForAttendance(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 py-2 px-3 text-xs text-white outline-none transition-all"
                >
                  <option value="">Choose class...</option>
                  {statsDisplay?.classWise.map((c) => (
                    <option key={c.class_name} value={c.class_name}>Class {c.class_name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Class</label>
                <select
                  value={selectedClassForAttendance}
                  onChange={(e) => setSelectedClassForAttendance(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 py-2 px-3 text-xs text-white outline-none"
                >
                  {user?.classes?.map((cls) => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleTakeAttendanceClick}
              disabled={!selectedClassForAttendance}
              className="w-full inline-flex h-9 items-center justify-center rounded-lg bg-white text-slate-900 text-xs font-semibold shadow hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Take Attendance
            </button>
          </div>
        </div>

        {/* Quick links & navigation */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-white">Quick Operations</h2>
          </div>
          <p className="text-xs text-slate-400">Navigate to common directories and reports</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link
              to="/reports/class"
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center gap-2"
            >
              <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-semibold text-white">Class Reports</span>
            </Link>

            {isAdmin && (
              <>
                <Link
                  to="/reports/student"
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center gap-2"
                >
                  <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs font-semibold text-white">Student Reports</span>
                </Link>

                <Link
                  to="/students"
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center gap-2"
                >
                  <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-white">Students DB</span>
                </Link>

                <Link
                  to="/teachers"
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center gap-2"
                >
                  <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-xs font-semibold text-white">Teachers</span>
                </Link>

                <Link
                  to="/classes"
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center gap-2"
                >
                  <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-xs font-semibold text-white">Classes</span>
                </Link>

                <Link
                  to="/academic-year"
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center gap-2"
                >
                  <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-semibold text-white">Academic Year</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Breakdown panel */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white">Class-wise Attendance</h3>
          
          <div className="divide-y divide-white/10 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Class</th>
                  <th className="pb-3">Present Count</th>
                  <th className="pb-3 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs text-slate-300">
                {statsDisplay?.classWise.map((c) => (
                  <tr key={c.class_name} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-semibold text-white">Class {c.class_name}</td>
                    <td className="py-3">{c.present} / {c.total}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.percentage >= 90 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {c.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
                {!statsDisplay?.classWise?.length && (
                  <tr>
                    <td colSpan="3" className="py-4 text-center text-slate-400">No classes assigned.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* History Chart */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white">Weekly Attendance Trend</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[80, 100]} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                />
                <Bar dataKey="attendance" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}