import axios from 'axios';

// ✅ HARCODED: Directly points to your Render backend
const API_BASE_URL = 'https://school-attendance-system-jgx2.onrender.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject Access Token Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for handling token refresh or unauthorized redirections
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login') {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        });
        const newToken = res.data.access_token;
        localStorage.setItem('access_token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Helper for trigger download of files
const downloadFile = (response, defaultFilename) => {
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const contentDisposition = response.headers['content-disposition'];
  let filename = defaultFilename;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename=(.+)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '');
    }
  }
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const api = {
  auth: {
    login: async (email, password) => {
      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      localStorage.setItem('access_token', access_token);
      
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.setItem('user', JSON.stringify({
          name: email.split('@')[0],
          email: email,
          is_admin: true
        }));
      }
      
      return { token: access_token, user };
    },
    logout: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    },
    getUser: () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        return JSON.parse(userStr);
      } catch (e) {
        console.log('Error parsing user data');
        return null;
      }
    },
    isAuthenticated: () => {
      return !!localStorage.getItem('access_token');
    }
  },
  attendance: {
    // ✅ FIXED: Matches backend schema exactly
    submitBulk: async (classId, date, absentStudentIds, reasons) => {
      // ✅ Send only what the backend expects
      const payload = {
        class_id: classId,
        date: date,
        absent_student_ids: absentStudentIds,
        reasons: reasons
      };

      console.log('📤 Sending attendance payload:', payload);
      const response = await apiClient.post('/attendance/bulk', payload);
      return response.data;
    },
    getStudent: async (studentId, fromDate, toDate) => {
      const response = await apiClient.get(`/attendance/student/${studentId}`, {
        params: { from_date: fromDate, to_date: toDate }
      });
      return response.data;
    },
    getClass: async (classId, fromDate, toDate) => {
      const response = await apiClient.get(`/attendance/class/${classId}`, {
        params: { from_date: fromDate, to_date: toDate }
      });
      return response.data;
    },
    getToday: async () => {
      const response = await apiClient.get('/attendance/today');
      return response.data;
    }
  },
  reports: {
    downloadStudent: async (studentId, fromDate, toDate, studentName) => {
      const response = await apiClient.get(`/reports/student/${studentId}`, {
        params: { from_date: fromDate, to_date: toDate },
        responseType: 'blob'
      });
      downloadFile(response, `report_${studentName.toLowerCase().replace(/ /g, '_')}.pdf`);
    },
    downloadClass: async (classId, fromDate, toDate) => {
      const response = await apiClient.get(`/reports/class/${classId}`, {
        params: { from_date: fromDate, to_date: toDate },
        responseType: 'blob'
      });
      downloadFile(response, `class_${classId}_report.pdf`);
    },
    downloadClassTc: async (classId, fromDate, toDate) => {
      const response = await apiClient.get(`/reports/class/${classId}/tc`, {
        params: { from_date: fromDate, to_date: toDate },
        responseType: 'blob'
      });
      downloadFile(response, `class_${classId}_tc_report.pdf`);
    }
  },
  students: {
    getAll: async (classId = '', activeOnly = true) => {
      const response = await apiClient.get('/students', {
        params: { class_name: classId, active_only: activeOnly }
      });
      return response.data;
    },
    get: async (studentId) => {
      const response = await apiClient.get(`/students/${studentId}`);
      return response.data;
    },
    create: async (data) => {
      const response = await apiClient.post('/students', data);
      return response.data;
    },
    update: async (studentId, data) => {
      const response = await apiClient.put(`/students/${studentId}`, data);
      return response.data;
    },
    delete: async (studentId, reason) => {
      const response = await apiClient.delete(`/students/${studentId}`, { data: { reason } });
      return response.data;
    },
    promote: async (fromClass, toClass) => {
      const response = await apiClient.post('/students/promote', { from_class: fromClass, to_class: toClass });
      return response.data;
    }
  },
  teachers: {
    getAll: async () => {
      const response = await apiClient.get('/teachers');
      return response.data;
    },
    create: async (data) => {
      const response = await apiClient.post('/teachers', data);
      return response.data;
    },
    update: async (teacherId, data) => {
      const response = await apiClient.put(`/teachers/${teacherId}`, data);
      return response.data;
    },
    delete: async (teacherId) => {
      const response = await apiClient.delete(`/teachers/${teacherId}`);
      return response.data;
    },
    assignClasses: async (teacherId, classes) => {
      const response = await apiClient.post(`/teachers/${teacherId}/classes`, { classes });
      return response.data;
    }
  },
  classes: {
    getAll: async () => {
      const response = await apiClient.get('/classes');
      return response.data;
    },
    create: async (className) => {
      const response = await apiClient.post('/classes', { class_name: className });
      return response.data;
    },
    delete: async (className) => {
      const response = await apiClient.delete(`/classes/${className}`);
      return response.data;
    }
  },
  academicYears: {
    getAll: async () => {
      const response = await apiClient.get('/academic-years');
      return response.data;
    },
    create: async (data) => {
      const response = await apiClient.post('/academic-years', data);
      return response.data;
    },
    update: async (yearId, data) => {
      const response = await apiClient.put(`/academic-years/${yearId}`, data);
      return response.data;
    },
    getHolidays: async (yearId = '') => {
      const response = await apiClient.get('/holidays', {
        params: { year_id: yearId }
      });
      return response.data;
    },
    createHoliday: async (data) => {
      const response = await apiClient.post('/holidays', data);
      return response.data;
    },
    deleteHoliday: async (holidayId) => {
      const response = await apiClient.delete(`/holidays/${holidayId}`);
      return response.data;
    }
  }
};

export default api;
export { apiClient };