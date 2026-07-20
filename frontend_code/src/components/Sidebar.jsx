import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../lib/api';

// ✅ Prevent re-renders from parent (Layout)
const Sidebar = React.memo(({ isOpen, onClose }) => {
  const navigate = useNavigate();
  
  // ✅ MEMOIZED: Only runs once, prevents infinite loops
  const user = useMemo(() => {
    try {
      return api.auth.getUser();
    } catch (e) {
      console.log('User not found in localStorage');
      return null;
    }
  }, []);

  const isAdmin = user?.is_admin || false;

  const handleLogout = () => {
    api.auth.logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-slate-900 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const commonLinks = [
    {
      to: '/',
      label: 'Dashboard',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      )
    },
    {
      to: '/attendance/take',
      label: 'Take Attendance',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      to: '/reports/class',
      label: 'Class Reports',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      to: '/reports/student',
      label: 'Student Reports',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  const adminLinks = [
    {
      to: '/students',
      label: 'Manage Students',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      to: '/teachers',
      label: 'Manage Teachers',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      to: '/classes',
      label: 'Manage Classes',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      to: '/academic-year',
      label: 'Academic Year',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    // ✅ NEW: Archive Link added to admin section
    {
      to: '/archive',
      label: '📦 Archive',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    }
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between py-6">
      <div className="px-4">
        <div className="flex items-center gap-3 px-3 py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-lg shadow-md">
            VV
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-none">VVLPS</h2>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">Attendance portal</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Navigation</p>
          <div className="space-y-1 mt-2">
            {commonLinks.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={onClose} className={linkClass}>
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>

          {isAdmin && (
            <div className="mt-6">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Administration</p>
              <div className="space-y-1 mt-2">
                {adminLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} onClick={onClose} className={linkClass}>
                    {link.icon}
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>

      {user && (
        <div className="border-t border-slate-100 px-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-800">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-700 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[130px]">{user.email}</p>
            </div>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700 text-xs font-medium">
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden" />
      )}
      <aside className="fixed bottom-0 top-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {sidebarContent}
      </aside>
      <aside className={`fixed bottom-0 top-0 left-0 z-50 w-64 bg-white transition-transform duration-300 ease-in-out lg:hidden shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;