import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function TakeAttendance() {
  const [searchParams] = useSearchParams();
  const classParam = searchParams.get('class');
  const navigate = useNavigate();
  const user = api.auth.getUser();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(classParam || '');
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  
  // Selection states
  // We track ABSENT student IDs. Default is empty array (meaning everyone is present).
  const [absentStudentIds, setAbsentStudentIds] = useState([]);
  const [reasons, setReasons] = useState({});

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch available classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        if (user.is_admin) {
          const res = await api.classes.getAll();
          const names = res.classes.map(c => c.class_name);
          setClasses(names);
          if (!selectedClass && names.length > 0) {
            setSelectedClass(names[0]);
          }
        } else {
          setClasses(user.classes);
          if (!selectedClass && user.classes.length > 0) {
            setSelectedClass(user.classes[0]);
          }
        }
      } catch (err) {
        setError('Failed to load class configuration');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [user, selectedClass]);

  // Fetch students whenever the selected class changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) return;
      try {
        setStudentsLoading(true);
        setError('');
        setMessage('');
        const data = await api.students.getAll(selectedClass, true); // Get active only
        setStudents(data);
        // Reset check states when class shifts
        setAbsentStudentIds([]);
        setReasons({});
      } catch (err) {
        setError('Failed to load student roster for class ' + selectedClass);
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  const toggleStudentStatus = (studentId) => {
    setAbsentStudentIds((prev) => {
      if (prev.includes(studentId)) {
        // Mark present (remove from absent list)
        const updated = prev.filter((id) => id !== studentId);
        // Clear reason
        const newReasons = { ...reasons };
        delete newReasons[studentId];
        setReasons(newReasons);
        return updated;
      } else {
        // Mark absent (add to absent list)
        return [...prev, studentId];
      }
    });
  };

  const handleReasonChange = (studentId, reasonText) => {
    setReasons((prev) => ({
      ...prev,
      [studentId]: reasonText,
    }));
  };

  // ✅ FIXED: handleSave now passes all students to the API with proper error handling
  const handleSave = async () => {
    if (students.length === 0) {
      setError('Cannot submit empty attendance');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      // ✅ This is the correct API call with allStudents
      await api.attendance.submitBulk(
        selectedClass, 
        date, 
        absentStudentIds, 
        reasons, 
        students  // ← Passing all students for present/absent
      );
      setMessage(`✅ Attendance saved for ${students.length} students. (${students.length - absentStudentIds.length} Present, ${absentStudentIds.length} Absent)`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.detail || 'Failed to submit attendance. Check for holiday conflicts.');
    } finally {
      // ✅ THIS IS THE KEY — loading always resets
      setLoading(false);
    }
  };

  const presentCount = students.length - absentStudentIds.length;
  const absentCount = absentStudentIds.length;

  return (
    <div className="space-y-6">
      {/* Header and selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Take Attendance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tap or click a student's card to toggle their status between Present and Absent.
          </p>
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
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 py-1.5 px-3 text-xs bg-slate-50 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 animate-slide-in-right">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Today's Status Banner */}
      {students.length > 0 && !studentsLoading && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-900 text-white p-4 shadow-md">
          <div className="text-xs font-semibold">
            Today: {new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} | Class: {selectedClass}
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-slate-300">Roster: {students.length}</span>
            <span className="text-emerald-400">Present: {presentCount}</span>
            <span className="text-rose-400">Absent: {absentCount}</span>
          </div>
        </div>
      )}

      {/* Student Roster Grid */}
      {studentsLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-xs text-slate-500 font-medium">No students registered in this class.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {students.map((student) => {
              const isAbsent = absentStudentIds.includes(student.id);
              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudentStatus(student.id)}
                  className={`relative cursor-pointer select-none rounded-xl p-4 border transition-all duration-200 shadow-sm flex flex-col justify-between h-32 ${
                    isAbsent
                      ? 'border-red-200 bg-red-50/50 hover:bg-red-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{student.name}</h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                        Admission Date: {student.admission_date}
                      </p>
                    </div>
                    
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      isAbsent ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isAbsent ? 'Absent' : 'Present'}
                    </span>
                  </div>

                  {/* Absent Reason Text field */}
                  {isAbsent && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        placeholder="Reason (e.g. sick, travel)"
                        value={reasons[student.id] || ''}
                        onChange={(e) => handleReasonChange(student.id, e.target.value)}
                        className="w-full text-xs bg-white border border-red-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-red-400"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ✅ FIXED: Submit action — button is now always clickable */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-6 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 transition-all cursor-pointer"
            >
              {loading ? 'Saving Attendance...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}