import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newClass, setNewClass] = useState('');

  const fetchClasses = useCallback(async () => {
    try {
      console.log('🔄 Fetching classes...');
      const data = await api.classes.getAll();
      console.log('📚 Raw data from API:', data);
      
      // ✅ DEBUG: Log the classes array specifically
      console.log('🔍 data.classes:', data?.classes);
      console.log('🔍 data.classes length:', data?.classes?.length);
      
      let classList = [];
      
      // ✅ If data has a 'classes' property that's an array
      if (data && data.classes && Array.isArray(data.classes)) {
        console.log('✅ Found data.classes array, length:', data.classes.length);
        // Extract class_name from each object
        classList = data.classes.map(item => {
          console.log('🔍 Processing item:', item);
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            return item.class_name || item.name || String(item);
          }
          return String(item);
        });
        console.log('📋 Extracted classList:', classList);
      } 
      // If data is directly an array
      else if (Array.isArray(data)) {
        console.log('✅ Data is directly an array');
        classList = data.map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            return item.class_name || item.name || String(item);
          }
          return String(item);
        });
      }
      // Fallback: try to extract from object values
      else if (data && typeof data === 'object') {
        console.log('🔍 Trying to extract from object values');
        const values = Object.values(data);
        console.log('🔍 Object values:', values);
        const extracted = values
          .filter(v => Array.isArray(v))
          .flat()
          .map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              return item.class_name || item.name || String(item);
            }
            return String(item);
          });
        if (extracted.length > 0) {
          classList = extracted;
        }
      }
      
      // Remove duplicates and empty values
      const formattedClasses = [...new Set(classList)]
        .filter(cls => cls && cls.trim() !== '')
        .map(cls => cls.trim());
      
      console.log('✅ Formatted classes:', formattedClasses);
      setClasses(formattedClasses);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching classes:', err);
      setError('Failed to load classes');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClass.trim()) return;

    try {
      console.log(`➕ Adding class: "${newClass.trim()}"`);
      const response = await api.classes.create(newClass.trim());
      console.log('✅ Add response:', response);
      
      setSuccess(`✅ Class "${newClass}" added!`);
      setNewClass('');
      
      setTimeout(() => {
        fetchClasses();
      }, 500);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('❌ Add class error:', err);
      setError(err.response?.data?.detail || 'Failed to add class');
    }
  };

  const handleDeleteClass = async (className) => {
    if (!window.confirm(`Delete class "${className}"?`)) return;

    try {
      console.log(`🗑️ Deleting class: "${className}"`);
      await api.classes.delete(className);
      setSuccess(`✅ Class "${className}" deleted!`);
      
      setTimeout(() => {
        fetchClasses();
      }, 500);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('❌ Delete class error:', err);
      setError(err.response?.data?.detail || 'Failed to delete class');
    }
  };

  if (loading) {
    return <div className="p-6 text-white bg-slate-900 min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-6">📚 Manage Classes</h1>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-200 p-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Class</h2>
        <form onSubmit={handleAddClass} className="flex gap-4 flex-wrap">
          <input
            type="text"
            id="newClassInput"
            name="newClassInput"
            value={newClass}
            onChange={(e) => setNewClass(e.target.value)}
            placeholder="e.g., 1A, 2B, 3C"
            className="flex-1 min-w-[200px] rounded-lg border-0 bg-white/10 py-2.5 px-3.5 text-white placeholder:text-slate-400 shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm focus:outline-none"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg"
          >
            Add Class
          </button>
        </form>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-semibold text-white mb-4">Existing Classes</h2>
        {classes.length === 0 ? (
          <p className="text-slate-400">No classes created yet.</p>
        ) : (
          <ul className="space-y-2">
            {classes.map((cls, index) => {
              return (
                <li key={index} className="flex justify-between items-center bg-white/5 hover:bg-white/10 p-3 rounded-lg transition">
                  <span className="text-white font-medium">{cls}</span>
                  <button
                    onClick={() => handleDeleteClass(cls)}
                    className="text-red-400 hover:text-red-300 text-sm font-medium transition"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}