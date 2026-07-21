import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function Archive() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [years, setYears] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form state for adding a new record
  const [showAddForm, setShowAddForm] = useState(false);
  const [recordType, setRecordType] = useState('full'); // 'image', 'basic', 'full'
  const [newRecord, setNewRecord] = useState({
    student_name: '',
    year: '',
    class_name: '',
    tc_number: '',
    parent_name: '',
    admission_date: '',
    leaving_date: '',
    reason_for_leaving: '',
    book_name: '',
    page_number: '',
    date_of_birth: '',
    religion: '',
    caste_category: '',
    remarks: '',
    scanned_image: null // For image upload
  });

  // Fetch years list on load
  useEffect(() => {
    fetchYears();
    searchRecords();
  }, []);

  const fetchYears = async () => {
    try {
      const data = await api.archive.getYears();
      setYears(data.years || []);
    } catch (err) {
      console.error('Failed to fetch years:', err);
    }
  };

  const searchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchTerm) params.query = searchTerm;
      if (selectedYear) params.year = parseInt(selectedYear);
      if (selectedClass) params.class_name = selectedClass;

      const data = await api.archive.search(params);
      setRecords(data.records || []);
      setMessage(`Found ${data.count || 0} records`);
    } catch (err) {
      setError('Failed to search records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchRecords();
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // If image upload, handle differently
      if (recordType === 'image') {
        // For image upload, we need to create a record first then upload image
        const data = {
          student_name: newRecord.student_name || 'Scanned Page',
          year: parseInt(newRecord.year) || null,
          book_name: newRecord.book_name,
          page_number: parseInt(newRecord.page_number) || null,
          remarks: newRecord.remarks
        };
        
        const response = await api.archive.create(data);
        const recordId = response.record.id;
        
        // If there's an image, upload it
        if (newRecord.scanned_image) {
          await api.archive.uploadImage(recordId, newRecord.scanned_image);
        }
        
        setMessage(`✅ Image uploaded! Record ID: ${response.record.unique_id}`);
      } else {
        // Regular record creation (basic or full)
        const data = {
          student_name: newRecord.student_name,
          year: parseInt(newRecord.year) || null,
          class_name: newRecord.class_name,
          tc_number: newRecord.tc_number,
          parent_name: newRecord.parent_name,
          admission_date: newRecord.admission_date || null,
          leaving_date: newRecord.leaving_date || null,
          reason_for_leaving: newRecord.reason_for_leaving,
          book_name: newRecord.book_name,
          page_number: parseInt(newRecord.page_number) || null,
          date_of_birth: newRecord.date_of_birth || null,
          religion: newRecord.religion,
          caste_category: newRecord.caste_category,
          remarks: newRecord.remarks
        };

        const response = await api.archive.create(data);
        setMessage(`✅ Record added! Unique ID: ${response.record.unique_id}`);
      }
      
      setShowAddForm(false);
      
      setNewRecord({
        student_name: '',
        year: '',
        class_name: '',
        tc_number: '',
        parent_name: '',
        admission_date: '',
        leaving_date: '',
        reason_for_leaving: '',
        book_name: '',
        page_number: '',
        date_of_birth: '',
        religion: '',
        caste_category: '',
        remarks: '',
        scanned_image: null
      });
      
      searchRecords();
      fetchYears();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add record');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewRecord({
      ...newRecord,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setNewRecord({
      ...newRecord,
      scanned_image: e.target.files[0]
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to archive this record?')) return;
    
    try {
      await api.archive.delete(id);
      setMessage('✅ Record archived successfully');
      searchRecords();
      fetchYears();
    } catch (err) {
      setError('Failed to archive record');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">📦 Digital Archive</h1>
          <p className="text-xs text-slate-500 mt-1">
            Preserve and search student records from 1960 to present.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 transition-all"
        >
          {showAddForm ? '✕ Close Form' : '➕ Add New Record'}
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Add Record Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Add New Archive Record</h2>
          
          <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Record Type Selector */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">How do you want to add this record?</label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="image">📸 Upload Scanned Image (Before 2000)</option>
                <option value="basic">⌨️ Basic Details (2001–2020)</option>
                <option value="full">📝 Full Details (2021–Present)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {recordType === 'image' && '📸 Just upload a photo of the page — no typing needed!'}
                {recordType === 'basic' && '⌨️ Enter only the essential details: Name, Year, Class, and TC number.'}
                {recordType === 'full' && '📝 Enter all details for complete digital records.'}
              </p>
            </div>

            {/* Image Upload Section */}
            {recordType === 'image' && (
              <>
                <div className="md:col-span-2 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">📸 Upload Scanned Image</p>
                  <p className="text-xs text-slate-400 mt-1">Take a photo of the page and upload it here</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-2">The image will be saved along with basic details</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Book Name</label>
                  <input
                    type="text"
                    name="book_name"
                    value={newRecord.book_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Admission Register 1970-1975"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Page Number</label>
                  <input
                    type="number"
                    name="page_number"
                    value={newRecord.page_number}
                    onChange={handleInputChange}
                    placeholder="e.g., 12"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Year *</label>
                  <input
                    type="number"
                    name="year"
                    value={newRecord.year}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 1985"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Name (Optional)</label>
                  <input
                    type="text"
                    name="student_name"
                    value={newRecord.student_name}
                    onChange={handleInputChange}
                    placeholder="If known"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </>
            )}

            {/* Basic Details Section */}
            {recordType === 'basic' && (
              <>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Name *</label>
                  <input
                    type="text"
                    name="student_name"
                    value={newRecord.student_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Year *</label>
                  <input
                    type="number"
                    name="year"
                    value={newRecord.year}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 2005"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class</label>
                  <input
                    type="text"
                    name="class_name"
                    value={newRecord.class_name}
                    onChange={handleInputChange}
                    placeholder="e.g., 5A"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TC Number</label>
                  <input
                    type="text"
                    name="tc_number"
                    value={newRecord.tc_number}
                    onChange={handleInputChange}
                    placeholder="e.g., TC-001"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </>
            )}

            {/* Full Details Section */}
            {recordType === 'full' && (
              <>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Name *</label>
                  <input
                    type="text"
                    name="student_name"
                    value={newRecord.student_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Year *</label>
                  <input
                    type="number"
                    name="year"
                    value={newRecord.year}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 2025"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class</label>
                  <input
                    type="text"
                    name="class_name"
                    value={newRecord.class_name}
                    onChange={handleInputChange}
                    placeholder="e.g., 5A"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TC Number</label>
                  <input
                    type="text"
                    name="tc_number"
                    value={newRecord.tc_number}
                    onChange={handleInputChange}
                    placeholder="e.g., TC-001"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent Name</label>
                  <input
                    type="text"
                    name="parent_name"
                    value={newRecord.parent_name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={newRecord.date_of_birth}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admission Date</label>
                  <input
                    type="date"
                    name="admission_date"
                    value={newRecord.admission_date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Leaving Date</label>
                  <input
                    type="date"
                    name="leaving_date"
                    value={newRecord.leaving_date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reason for Leaving</label>
                  <input
                    type="text"
                    name="reason_for_leaving"
                    value={newRecord.reason_for_leaving}
                    onChange={handleInputChange}
                    placeholder="e.g., Completed, Transferred, etc."
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Additional Remarks</label>
                  <input
                    type="text"
                    name="remarks"
                    value={newRecord.remarks}
                    onChange={handleInputChange}
                    placeholder="Any additional notes"
                    className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all"
              >
                {loading ? 'Saving...' : '💾 Save Record'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-6 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Search</label>
            <input
              type="text"
              placeholder="Name, Parent, or TC number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="w-32">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All</option>
              {years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year} ({y.count})
                </option>
              ))}
            </select>
          </div>

          <div className="w-32">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class</label>
            <input
              type="text"
              placeholder="e.g., 5A"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 transition-all"
          >
            🔍 Search
          </button>
        </form>
      </div>

      {/* Results Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-slate-400 uppercase tracking-wider">ID</th>
                <th className="text-left py-3 px-4 font-bold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 font-bold text-slate-400 uppercase tracking-wider">Class</th>
                <th className="text-left py-3 px-4 font-bold text-slate-400 uppercase tracking-wider">Year</th>
                <th className="text-left py-3 px-4 font-bold text-slate-400 uppercase tracking-wider">TC Number</th>
                <th className="text-left py-3 px-4 font-bold text-slate-400 uppercase tracking-wider">Parent</th>
                <th className="text-left py-3 px-4 font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">Loading...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">No records found</td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{record.unique_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{record.student_name}</td>
                    <td className="py-3 px-4 text-slate-600">{record.class || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{record.year || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{record.tc_number || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{record.parent_name || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(`/archive/${record.id}`, '_blank')}
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-bold"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="text-red-600 hover:text-red-800 text-[10px] font-bold"
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}