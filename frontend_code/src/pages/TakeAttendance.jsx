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
    setMessage(`Attendance saved for ${students.length} students. (${students.length - absentStudentIds.length} Present, ${absentStudentIds.length} Absent)`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('Save error:', err);
    setError(err.response?.data?.detail || 'Failed to submit attendance. Check for holiday conflicts.');
  } finally {
    // ✅ THIS IS THE KEY — loading always resets
    setLoading(false);
  }
};