import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TakeAttendance from './pages/TakeAttendance';
import StudentReports from './pages/StudentReports';
import ClassReports from './pages/ClassReports';
import ManageStudents from './pages/ManageStudents';
import ManageTeachers from './pages/ManageTeachers';
import ManageClasses from './pages/ManageClasses';
import AcademicYear from './pages/AcademicYear';
import Archive from './pages/Archive';  // ✅ ADD THIS IMPORT
import api from './lib/api';

// Route guards for Admin-only access
const AdminRoute = ({ children }) => {
  const user = api.auth.getUser();
  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes (Require Login) */}
      <Route path="/" element={<Layout />}>
        {/* Shared Routes */}
        <Route index element={<Dashboard />} />
        <Route path="attendance/take" element={<TakeAttendance />} />
        <Route path="reports/class" element={<ClassReports />} />

        {/* Admin Only Routes */}
        <Route
          path="reports/student"
          element={
            <AdminRoute>
              <StudentReports />
            </AdminRoute>
          }
        />
        <Route
          path="students"
          element={
            <AdminRoute>
              <ManageStudents />
            </AdminRoute>
          }
        />
        <Route
          path="teachers"
          element={
            <AdminRoute>
              <ManageTeachers />
            </AdminRoute>
          }
        />
        <Route
          path="classes"
          element={
            <AdminRoute>
              <ManageClasses />
            </AdminRoute>
          }
        />
        <Route
          path="academic-year"
          element={
            <AdminRoute>
              <AcademicYear />
            </AdminRoute>
          }
        />
        {/* ✅ NEW: Archive Route */}
        <Route
          path="archive"
          element={
            <AdminRoute>
              <Archive />
            </AdminRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}