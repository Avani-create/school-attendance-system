import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function AcademicYear() {
  const [academicYears, setAcademicYears] = useState([]);
  const [currentYear, setCurrentYear] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [addYearModalOpen, setAddYearModalOpen] = useState(false);
  const [addHolidayModalOpen, setAddHolidayModalOpen] = useState(false);

  // Form states - Academic Year
  const [yearName, setYearName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);

  // Form states - Holiday
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [isWorkingSaturday, setIsWorkingSaturday] = useState(false);

  const fetchAcademicData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const yearsRes = await api.academicYears.getAll();
      setAcademicYears(yearsRes);
      
      const curr = yearsRes.find(y => y.is_current);
      setCurrentYear(curr);

      if (curr) {
        const holidaysRes = await api.academicYears.getHolidays(curr.id);
        setHolidays(holidaysRes);
      } else if (yearsRes.length > 0) {
        const holidaysRes = await api.academicYears.getHolidays(yearsRes[0].id);
        setHolidays(holidaysRes);
      }
    } catch (err) {
      setError('Failed to fetch academic configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicData();
  }, []);

  const handleYearSubmit = async (e) => {
    e.preventDefault();
    if (!yearName || !startDate || !endDate) {
      setError('Please fill all year settings');
      return;
    }
    try {
      await api.academicYears.create({
        name: yearName,
        start_date: startDate,
        end_date: endDate,
        is_current: isCurrent
      });
      setSuccess('Academic year created successfully');
      setAddYearModalOpen(false);
      setYearName('');
      setStartDate('');
      setEndDate('');
      setIsCurrent(false);
      fetchAcademicData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create academic year');
    }
  };

  const handleSetCurrent = async (yearId) => {
    try {
      await api.academicYears.update(yearId, { is_current: true });
      setSuccess('Current academic year updated');
      fetchAcademicData();
    } catch (err) {
      setError('Failed to update current year');
    }
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    if (!holidayDate || !holidayName || !currentYear) {
      setError('Fill all parameters and ensure a year is set active');
      return;
    }
    try {
      await api.academicYears.createHoliday({
        date: holidayDate,
        name: holidayName,
        academic_year_id: currentYear.id,
        is_working_saturday: isWorkingSaturday
      });
      setSuccess(isWorkingSaturday ? 'Special working Saturday scheduled' : 'Holiday added successfully');
      setAddHolidayModalOpen(false);
      setHolidayDate('');
      setHolidayName('');
      setIsWorkingSaturday(false);
      fetchAcademicData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add holiday entry');
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!window.confirm('Delete this holiday entry?')) return;
    try {
      await api.academicYears.deleteHoliday(holidayId);
      setSuccess('Holiday entry removed');
      fetchAcademicData();
    } catch (err) {
      setError('Failed to delete holiday entry');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Academic Year & Calendar</h1>
          <p className="text-xs text-slate-500 mt-1">Configure school academic terms, define holidays, and authorize Saturday compensatory days.</p>
        </div>

        {currentYear ? (
          <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow">
            <div>
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">Active Academic Term</span>
              <span className="text-base font-bold">
                {currentYear.name} ({currentYear.start_date} to {currentYear.end_date})
              </span>
            </div>
            
            <button
              onClick={() => { setError(''); setAddYearModalOpen(true); }}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-slate-950 hover:bg-slate-100 cursor-pointer"
            >
              Add New Year
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center justify-between">
            <p className="text-xs font-medium">No current academic year defined. Please create one to initialize scheduling calculations.</p>
            <button onClick={() => setAddYearModalOpen(true)} className="bg-amber-600 text-white rounded px-3 py-1.5 text-xs font-semibold hover:bg-amber-500">Create</button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 animate-slide-in-right">
          {success}
          <button onClick={() => setSuccess('')} className="float-right font-bold hover:text-emerald-950">×</button>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold hover:text-red-950">×</button>
        </div>
      )}

      {/* Layout Split */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List Academic Years */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800">All Academic Years</h3>
            
            <div className="divide-y divide-slate-100 text-xs">
              {academicYears.map(y => (
                <div key={y.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{y.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{y.start_date} to {y.end_date}</p>
                  </div>
                  {y.is_current ? (
                    <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-white">Active</span>
                  ) : (
                    <button
                      onClick={() => handleSetCurrent(y.id)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Make Active
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Holiday List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                School Calendar & Holidays ({currentYear?.name || '—'})
              </h3>
              <button
                disabled={!currentYear}
                onClick={() => { setError(''); setAddHolidayModalOpen(true); }}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
              >
                Add Event
              </button>
            </div>

            <div className="overflow-x-auto divide-y divide-slate-100">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Event Name</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {holidays.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-semibold text-slate-900">{h.date}</td>
                      <td className="py-3">{h.name}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          h.is_working_saturday ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {h.is_working_saturday ? 'Working Saturday' : 'School Holiday'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {holidays.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-4 text-center text-slate-400">No holidays scheduled. All Mon-Fri are working.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD ACADEMIC YEAR MODAL */}
      {addYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Define Academic Year</h2>
              <button onClick={() => setAddYearModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-lg">×</button>
            </div>
            
            <form onSubmit={handleYearSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Year Name</label>
                <input type="text" required placeholder="e.g. 2026-27" value={yearName} onChange={e => setYearName(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</label>
                <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">End Date</label>
                <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="addYearCurrent" checked={isCurrent} onChange={e => setIsCurrent(e.target.checked)} className="rounded text-slate-900" />
                <label htmlFor="addYearCurrent" className="text-xs font-semibold text-slate-700 select-none">Set as current academic year</label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setAddYearModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded">Save Term</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD HOLIDAY / SATURDAY MODAL */}
      {addHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Add Calendar Event</h2>
              <button onClick={() => setAddHolidayModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-lg">×</button>
            </div>
            
            <form onSubmit={handleHolidaySubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Event Date</label>
                <input type="date" required value={holidayDate} onChange={e => setHolidayDate(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Event / Holiday Name</label>
                <input type="text" required placeholder="e.g. Independence Day or Compensatory Saturday" value={holidayName} onChange={e => setHolidayName(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="workingSat" checked={isWorkingSaturday} onChange={e => setIsWorkingSaturday(e.target.checked)} className="rounded text-slate-900" />
                <label htmlFor="workingSat" className="text-xs font-semibold text-slate-700 select-none">
                  Mark as Working Saturday (Compensatory Day)
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setAddHolidayModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded">Add to Calendar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
