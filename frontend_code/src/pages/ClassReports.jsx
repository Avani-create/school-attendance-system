import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function ClassReports() {
  const user = api.auth.getUser();
  const isAdmin = user?.is_admin || false;

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [tcLoading, setTcLoading] = useState(false);
  const [error, setError] = useState('');

  // Date Presets
  const [datePreset, setDatePreset] = useState('current');
  const [fromDate, setFromDate] = useState('2026-04-01');
  const [toDate, setToDate] = useState('2027-03-31');

  // Load available classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        if (isAdmin) {
          const res = await api.classes.getAll();
          const names = res.classes.map(c => c.class_name);
          setClasses(names);
          if (names.length > 0) setSelectedClass(names[0]);
        } else {
          setClasses(user.classes);
          if (user.classes.length > 0) setSelectedClass(user.classes[0]);
        }
      } catch (err) {
        setError('Failed to fetch class configurations');
      }
    };
    fetchClasses();
  }, [user, isAdmin]);

  // Adjust dates based on preset selection
  useEffect(() => {
    if (datePreset === 'current') {
      setFromDate('2026-04-01');
      setToDate('2027-03-31');
    } else if (datePreset === 'last') {
      setFromDate('2025-04-01');
      setToDate('2026-03-31');
    }
  }, [datePreset]);

  // Fetch report when filters change
  useEffect(() => {
    const fetchClassReport = async () => {
      if (!selectedClass) return;
      try {
        setLoading(true);
        setError('');
        const res = await api.attendance.getClass(selectedClass, fromDate, toDate);
        setStudents(res.students);
      } catch (err) {
        setError('Failed to load class attendance sheet.');
      } finally {
        setLoading(false);
      }
    };
    fetchClassReport();
  }, [selectedClass, fromDate, toDate]);

  const handleExportPDF = async () => {
    if (!selectedClass) return;
    try {
      setPdfLoading(true);
      await api.reports.downloadClass(selectedClass, fromDate, toDate);
    } catch (err) {
      alert('Failed to generate class PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportTC = async () => {
    if (!selectedClass) return;
    try {
      setTcLoading(true);
      await api.reports.downloadClassTc(selectedClass, fromDate, toDate);
    } catch (err) {
      alert('Failed to generate TC Ready PDF.');
    } finally {
      setTcLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Class Attendance Summary</h1>
          <p className="text-xs text-slate-500 mt-1">Review student performance metrics across date periods.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none"
            >
              {classes.map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Date Preset</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none"
            >
              <option value="current">Academic Year 2026-27 (Current)</option>
              <option value="last">Academic Year 2025-26 (Last)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {datePreset === 'custom' && (
            <div className="flex gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-200 py-1.5 px-3 text-xs bg-slate-50 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-200 py-1.5 px-3 text-xs bg-slate-50 outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Reports Actions */}
      {students.length > 0 && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleExportPDF}
            disabled={pdfLoading}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {pdfLoading ? 'Generating...' : 'Export Class PDF'}
          </button>
          
          <button
            onClick={handleExportTC}
            disabled={tcLoading}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {tcLoading ? 'Generating...' : 'Bulk TC Format'}
          </button>
        </div>
      )}

      {/* Class Statistics Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-xs text-slate-400">No student records found for the selected configuration.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Student Name</th>
                  <th className="py-4 px-6 text-center">Days Present</th>
                  <th className="py-4 px-6 text-center">Days Absent</th>
                  <th className="py-4 px-6 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-3.5 px-6 text-center">{s.present}</td>
                    <td className="py-3.5 px-6 text-center">{s.absent}</td>
                    <td className="py-3.5 px-6 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        s.percentage >= 85 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {s.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
