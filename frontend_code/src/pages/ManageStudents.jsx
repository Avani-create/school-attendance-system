import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  
  // Modals Toggles
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);

  // Active records
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [classVal, setClassVal] = useState('1A');
  const [section, setSection] = useState('A');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [address, setAddress] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [is_active, setIsActive] = useState(true);

  // Soft Delete reason
  const [deleteReason, setDeleteReason] = useState('transferred');

  // Promote states
  const [fromClass, setFromClass] = useState('1A');
  const [toClass, setToClass] = useState('2A');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await api.students.getAll(classFilter, false);
      console.log('📚 Fetched students:', data);
      setStudents(Array.isArray(data) ? data : data.students || []);
      setError('');
    } catch (err) {
      console.error('Fetch students error:', err);
      setError('Failed to fetch students database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [classFilter]);

  const resetForm = () => {
    setName('');
    setClassVal('1A');
    setSection('A');
    setParentName('');
    setParentPhone('');
    setAddress('');
    setAdmissionDate(new Date().toISOString().split('T')[0]);
    setIsActive(true);
    setError('');
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name || !classVal) {
      setError('Name and Class are required');
      return;
    }
    try {
      await api.students.create({
        name,
        class: classVal,
        section,
        parent_name: parentName,
        parent_phone: parentPhone,
        address,
        admission_date: admissionDate
      });
      setSuccess('✅ Student created successfully');
      setAddModalOpen(false);
      resetForm();
      fetchStudents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Add error:', err);
      setError(err.response?.data?.detail || 'Failed to create student');
    }
  };

  const openEditModal = (student) => {
    console.log('📝 Editing student:', student);
    setSelectedStudent(student);
    setName(student.name || '');
    setClassVal(student.class || '');
    setSection(student.section || '');
    setParentName(student.parent_name || '');
    setParentPhone(student.parent_phone || '');
    setAddress(student.address || '');
    setAdmissionDate(student.admission_date || new Date().toISOString().split('T')[0]);
    setIsActive(student.is_active !== undefined ? student.is_active : true);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!name || !classVal) {
      setError('Name and Class are required');
      return;
    }
    try {
      await api.students.update(selectedStudent.id, {
        name,
        class: classVal,
        section,
        parent_name: parentName,
        parent_phone: parentPhone,
        address,
        admission_date: admissionDate,
        is_active: is_active
      });
      setSuccess('✅ Student details updated successfully');
      setEditModalOpen(false);
      resetForm();
      fetchStudents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Edit error:', err);
      setError(err.response?.data?.detail || 'Failed to update student');
    }
  };

  const openDeleteModal = (student) => {
    setSelectedStudent(student);
    setDeleteReason('transferred');
    setDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.students.delete(selectedStudent.id, deleteReason);
      setSuccess('✅ Student soft-deleted successfully');
      setDeleteModalOpen(false);
      fetchStudents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.detail || 'Failed to soft delete student');
    }
  };

  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.students.promote(fromClass, toClass);
      setSuccess(`✅ Successfully promoted ${res.promoted_count} students from ${fromClass} to ${toClass}`);
      setPromoteModalOpen(false);
      fetchStudents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Promote error:', err);
      setError(err.response?.data?.detail || 'Failed to promote class');
    }
  };

  // Filter logic for search (client-side)
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          (s.parent_name && s.parent_name.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  // ✅ FIXED: Combine class + section to get full class name (e.g., "1A", "3C")
  const classesList = [...new Set(students
    .filter(s => s.class || s.class_name)
    .map(s => {
      const cls = s.class || s.class_name || '';
      const sec = s.section || '';
      return sec ? `${cls}${sec}` : cls;
    })
  )].sort();

  // ✅ Helper to display full class name
  const getFullClassName = (student) => {
    const cls = student.class || student.class_name || '';
    const sec = student.section || '';
    return sec ? `${cls}${sec}` : cls;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Student Database</h1>
          <p className="text-xs text-slate-500 mt-1">Manage enrollments, edit information, and promote cohorts at year-end.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setFromClass('1A'); setToClass('2A'); setPromoteModalOpen(true); }}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
          >
            Bulk Promote
          </button>
          
          <button
            onClick={() => { resetForm(); setAddModalOpen(true); }}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
          >
            Add Student
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 animate-slide-in-right">
          {success}
          <button onClick={() => setSuccess('')} className="float-right font-bold hover:text-emerald-950">×</button>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 animate-slide-in-right">
          ❌ {error}
          <button onClick={() => setError('')} className="float-right font-bold hover:text-red-950">×</button>
        </div>
      )}

      {/* Search and Filters panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative col-span-2">
          <input
            type="text"
            placeholder="Search students by name or parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white"
          />
        </div>

        <div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 py-2.5 px-3 text-xs bg-slate-50 outline-none focus:ring-1 focus:ring-slate-950"
          >
            <option value="">All Classes</option>
            {classesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-xs text-slate-400">No students matching criteria found.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Class / Sec</th>
                  <th className="py-4 px-6">Parent Info</th>
                  <th className="py-4 px-6">Admission</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      <div>{s.name}</div>
                      {!s.is_active && (
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                          Left: {s.leaving_date} ({s.leaving_reason})
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-6">{getFullClassName(s)}</td>
                    <td className="py-3.5 px-6">
                      <div>{s.parent_name || '—'}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{s.parent_phone || '—'}</div>
                    </td>
                    <td className="py-3.5 px-6">{s.admission_date}</td>
                    <td className="py-3.5 px-6">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="text-xs font-semibold text-slate-900 hover:underline"
                      >
                        Edit
                      </button>
                      {s.is_active && (
                        <button
                          onClick={() => openDeleteModal(s)}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Add New Student</h2>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-lg">×</button>
            </div>
            
            {error && <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class</label>
                  <input type="text" required value={classVal} onChange={e => setClassVal(e.target.value)} placeholder="e.g. 1A" className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Section</label>
                  <input type="text" value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. A" className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent Name</label>
                  <input type="text" value={parentName} onChange={e => setParentName(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent Phone</label>
                  <input type="text" value={parentPhone} onChange={e => setParentPhone(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none h-16" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admission Date</label>
                  <input type="date" required value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setAddModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Edit Student Details</h2>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-lg">×</button>
            </div>
            
            {error && <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class</label>
                  <input type="text" required value={classVal} onChange={e => setClassVal(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Section</label>
                  <input type="text" value={section} onChange={e => setSection(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent Name</label>
                  <input type="text" value={parentName} onChange={e => setParentName(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent Phone</label>
                  <input type="text" value={parentPhone} onChange={e => setParentPhone(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none h-16" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admission Date</label>
                  <input type="date" required value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Enrollment Status</label>
                  <select value={is_active ? "true" : "false"} onChange={e => setIsActive(e.target.value === "true")} className="mt-1 block w-full rounded border border-slate-200 p-2.5 text-xs bg-slate-50 outline-none">
                    <option value="true">Active / Enrolled</option>
                    <option value="false">Inactive / Left School</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded">Update Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Soft Delete Student</h2>
            <p className="text-xs text-slate-500">
              You are marking <strong className="text-slate-900">{selectedStudent?.name}</strong> as inactive. Please supply a reason.
            </p>
            
            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reason for leaving</label>
                <select value={deleteReason} onChange={e => setDeleteReason(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none">
                  <option value="transferred">Transferred to another school (TC issued)</option>
                  <option value="graduated">Graduated / Completed 5th Standard</option>
                  <option value="dropped">Dropped out</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setDeleteModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded">Confirm Deletion</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK PROMOTE MODAL */}
      {promoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Bulk Promote Cohort</h2>
            <p className="text-xs text-slate-500">
              Bulk shift all active students from a source class to a destination class. This operation will be recorded in the audit log.
            </p>
            
            <form onSubmit={handlePromoteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">From Class</label>
                  <input type="text" required value={fromClass} onChange={e => setFromClass(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">To Class</label>
                  <input type="text" required value={toClass} onChange={e => setToClass(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setPromoteModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded">Run Promotion</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}