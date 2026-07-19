import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentReports() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');

  // Date Range Presets
  const [datePreset, setDatePreset] = useState('current'); // 'current', 'last', 'custom'
  const [fromDate, setFromDate] = useState('2026-04-01');
  const [toDate, setToDate] = useState('2027-03-31');

  // Load all active students on mount for search selection
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.students.getAll('', false); // include inactive to check past details
        setStudents(res);
      } catch (err) {
        setError('Failed to fetch student database.');
      }
    };
    fetchStudents();
  }, []);

  // Update dates based on presets
  useEffect(() => {
    if (datePreset === 'current') {
      setFromDate('2026-04-01');
      setToDate('2027-03-31');
    } else if (datePreset === 'last') {
      setFromDate('2025-04-01');
      setToDate('2026-03-31');
    }
  }, [datePreset]);

  // Fetch report details when selected student or date range changes
  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedStudent) return;
      try {
        setLoading(true);
        setError('');
        const data = await api.attendance.getStudent(selectedStudent.id, fromDate, toDate);
        setReportData(data);
      } catch (err) {
        setError('Failed to load attendance report.');
        setReportData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedStudent, fromDate, toDate]);

  // ✅ FIXED: Added null checks for name and class_name
  const filteredStudents = students.filter(s => {
    const name = s?.name || '';
    const className = s?.class_name || '';
    const search = searchTerm?.toLowerCase() || '';
    return name.toLowerCase().includes(search) || className.toLowerCase().includes(search);
  });

  const handleExportPDF = async () => {
    if (!selectedStudent) return;
    try {
      setPdfLoading(true);
      await api.reports.downloadStudent(selectedStudent.id, fromDate, toDate, selectedStudent.name);
    } catch (err) {
      alert('Failed to generate PDF report.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Student Attendance Reports</h1>
          <p className="text-xs text-slate-500 mt-1">Search student and select date ranges to generate report card files.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Search Student</label>
            <input
              type="text"
              placeholder="Type student name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
            />
            {/* Auto-suggest dropdown */}
            {searchTerm && (
              <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg text-xs divide-y divide-slate-100">
                {filteredStudents.slice(0, 10).map(s => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedStudent(s);
                      setSearchTerm('');
                    }}
                    className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                  >
                    <span className="font-semibold text-slate-800">{s.name}</span>
                    <span className="text-slate-400 font-medium">Class {s.class_name}</span>
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <div className="p-3 text-center text-slate-400">No students found.</div>
                )}
              </div>
            )}
          </div>

          {/* Date Presets */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date Preset</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none"
            >
              <option value="current">Academic Year 2026-27 (Current)</option>
              <option value="last">Academic Year 2025-26 (Last)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Bounds */}
          {datePreset === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-200 py-1.5 px-3 text-xs bg-slate-50 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-200 py-1.5 px-3 text-xs bg-slate-50 outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Student Display */}
      {selectedStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info Card & Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-6 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white font-extrabold text-lg">
                {selectedStudent.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">{selectedStudent.name || 'Unknown Student'}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Class {selectedStudent.class_name || 'N/A'} {selectedStudent.section || ''}
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Parent Name</span>
                <span className="font-semibold text-slate-700">{selectedStudent.parent_name || 'N/A'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Parent Phone</span>
                <span className="font-semibold text-slate-700">{selectedStudent.parent_phone || 'N/A'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Admission Date</span>
                <span className="font-semibold text-slate-700">{selectedStudent.admission_date || 'N/A'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  selectedStudent.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {selectedStudent.is_active ? 'Active' : 'Inactive (Transferred)'}
                </span>
              </div>
            </div>

            {reportData && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Attendance Data</h3>
                
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Working Days</span>
                    <span className="text-base font-bold text-slate-900">{reportData.summary.total_days}</span>
                  </div>
                  <div className="bg-emerald-50/30 p-2.5 rounded-lg border border-emerald-100/50">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block">Present</span>
                    <span className="text-base font-bold text-emerald-700">{reportData.summary.present}</span>
                  </div>
                  <div className="bg-rose-50/30 p-2.5 rounded-lg border border-rose-100/50">
                    <span className="text-[10px] text-rose-600 font-bold uppercase block">Absent</span>
                    <span className="text-base font-bold text-rose-700">{reportData.summary.absent}</span>
                  </div>
                  <div className="bg-slate-900 text-white p-2.5 rounded-lg">
                    <span className="text-[10px] text-slate-300 font-bold uppercase block">Percentage</span>
                    <span className="text-base font-bold">{reportData.summary.percentage}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleExportPDF}
                    disabled={pdfLoading}
                    className="flex-1 inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {pdfLoading ? 'Generating...' : 'Export PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Monthly Breakdown Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-800">Monthly Attendance Breakdown</h3>
            
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
              </div>
            ) : reportData?.summary?.monthly_breakdown?.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.summary.monthly_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Bar dataKey="present" name="Present Days" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="absent" name="Absent Days" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-400">No working days recorded for the selected period.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <h3 className="mt-4 text-xs font-semibold text-slate-900">No Student Selected</h3>
          <p className="mt-1 text-[11px] text-slate-500">Please use the search bar above to select a student.</p>
        </div>
      )}
    </div>
  );
}