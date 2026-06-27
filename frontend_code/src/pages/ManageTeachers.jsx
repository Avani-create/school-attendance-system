import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [classesInput, setClassesInput] = useState('');

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const data = await api.teachers.getAll();
      // ✅ Ensure data is an array
      setTeachers(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Fetch teachers error:', err);
      setError('Failed to fetch teachers database. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setIsAdmin(false);
    setIsActive(true);
    setClassesInput('');
    setError('');
    setSuccess('');
  };

  // ✅ Helper to extract error message from API response
  const getErrorMessage = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return 'An error occurred. Please try again.';
    
    if (typeof detail === 'string') return detail;
    
    if (Array.isArray(detail)) {
      const messages = detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
      return messages;
    }
    
    if (typeof detail === 'object') {
      try {
        return JSON.stringify(detail);
      } catch {
        return 'An error occurred. Please try again.';
      }
    }
    
    return 'An error occurred. Please try again.';
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password) {
      setError('Name, Email and Password are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      await api.teachers.create({
        name,
        email,
        password,
        phone,
        is_admin: isAdmin
      });
      setSuccess('✅ Teacher account created successfully!');
      setAddModalOpen(false);
      resetForm();
      await fetchTeachers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Add teacher error:', err);
      setError(getErrorMessage(err));
    }
  };

  const openEditModal = (teacher) => {
    setSelectedTeacher(teacher);
    setName(teacher.name || '');
    setEmail(teacher.email || '');
    setPassword('');
    setPhone(teacher.phone || '');
    setIsAdmin(teacher.is_admin || false);
    setIsActive(teacher.is_active !== undefined ? teacher.is_active : true);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email) {
      setError('Name and Email are required');
      return;
    }

    try {
      const updateData = {
        name,
        email,
        phone,
        is_admin: isAdmin,
        is_active: isActive
      };
      if (password) updateData.password = password;

      await api.teachers.update(selectedTeacher.id, updateData);
      setSuccess('✅ Teacher details updated successfully!');
      setEditModalOpen(false);
      resetForm();
      await fetchTeachers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Edit teacher error:', err);
      setError(getErrorMessage(err));
    }
  };

  const openAssignModal = (teacher) => {
    setSelectedTeacher(teacher);
    setClassesInput(teacher.classes && Array.isArray(teacher.classes) ? teacher.classes.join(', ') : '');
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const classesArray = classesInput
      .split(',')
      .map(c => c.trim().toUpperCase())
      .filter(c => c.length > 0);

    if (classesArray.length === 0) {
      setError('Please enter at least one class');
      return;
    }

    try {
      await api.teachers.assignClasses(selectedTeacher.id, classesArray);
      setSuccess('✅ Class assignments updated successfully!');
      setAssignModalOpen(false);
      resetForm();
      await fetchTeachers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Assign classes error:', err);
      setError(getErrorMessage(err));
    }
  };

  const openDeleteModal = (teacher) => {
    setSelectedTeacher(teacher);
    setDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.teachers.delete(selectedTeacher.id);
      setSuccess('✅ Teacher account deactivated successfully!');
      setDeleteModalOpen(false);
      await fetchTeachers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Delete teacher error:', err);
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Teacher Accounts</h1>
          <p className="text-xs text-slate-500 mt-1">Manage staff access permissions and route class mappings.</p>
        </div>

        <button
          onClick={() => { resetForm(); setAddModalOpen(true); }}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
        >
          Add Teacher
        </button>
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

      {/* Teachers Database Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-xs text-slate-400">No teacher records registered.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Email / Phone</th>
                  <th className="py-4 px-6">Assigned Classes</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{t.name}</td>
                    <td className="py-3.5 px-6">
                      <div>{t.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{t.phone || '—'}</div>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex flex-wrap gap-1">
                        {t.classes && t.classes.map(c => (
                          <span key={c} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800">
                            {c}
                          </span>
                        ))}
                        {(!t.classes || t.classes.length === 0) && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-semibold uppercase tracking-wider text-[10px]">
                      {t.is_admin ? 'Principal' : 'Teacher'}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-3">
                      <button
                        onClick={() => openAssignModal(t)}
                        className="text-xs font-semibold text-slate-900 hover:underline cursor-pointer"
                      >
                        Assign Classes
                      </button>
                      <button
                        onClick={() => openEditModal(t)}
                        className="text-xs font-semibold text-slate-900 hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      {t.is_active && (
                        <button
                          onClick={() => openDeleteModal(t)}
                          className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          Deactivate
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

      {/* ADD TEACHER MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Add Staff Account</h2>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-lg">×</button>
            </div>
            
            {error && <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
                <span className="text-[9px] text-slate-400">Password must be at least 8 characters</span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="addAdmin" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} className="rounded text-slate-900" />
                <label htmlFor="addAdmin" className="text-xs font-semibold text-slate-700 select-none">
                  Grant Administrator / Principal Privileges
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setAddModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEACHER MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Edit Staff Account</h2>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-lg">×</button>
            </div>
            
            {error && <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password (Leave blank to keep current)</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="editAdmin" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} className="rounded text-slate-900" />
                  <label htmlFor="editAdmin" className="text-xs font-semibold text-slate-700 select-none">Admin permissions</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="editActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded text-slate-900" />
                  <label htmlFor="editActive" className="text-xs font-semibold text-slate-700 select-none">Active status</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded">Update Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN CLASSES MODAL */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Assign Classes</h2>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-lg">×</button>
            </div>
            
            <p className="text-xs text-slate-500">
              Assign classes to <strong className="text-slate-900">{selectedTeacher?.name}</strong>. Input classes as a comma-separated list.
            </p>

            {error && <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Classes</label>
                <input
                  type="text"
                  required
                  value={classesInput}
                  onChange={e => setClassesInput(e.target.value)}
                  placeholder="e.g. 1A, 2A, LKG"
                  className="mt-1 block w-full rounded border border-slate-200 p-2.5 text-xs bg-slate-50 outline-none"
                />
                <span className="text-[9px] text-slate-400 font-medium mt-1.5 block">Use comma (,) to separate multiple classes.</span>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setAssignModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded">Save Assignments</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Deactivate Staff Account</h2>
            <p className="text-xs text-slate-500">
              Are you sure you want to deactivate <strong className="text-slate-900">{selectedTeacher?.name}</strong>? They will immediately lose login access.
            </p>

            <form onSubmit={handleDeleteSubmit} className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setDeleteModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
              <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded">Deactivate Account</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}