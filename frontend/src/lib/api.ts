import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE_URL;

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor - attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get('refreshToken');
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        Cookies.set('accessToken', accessToken, { expires: 1 });
        Cookies.set('refreshToken', newRefreshToken, { expires: 7 });

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
};

// Tickets endpoints
export const ticketsApi = {
  getAll: (params?: Record<string, any>) => api.get('/tickets', { params }),
  getById: (id: string) => api.get(`/tickets/${id}`),
  create: (data: any) => api.post('/tickets', data),
  update: (id: string, data: any) => api.patch(`/tickets/${id}`, data),
  delete: (id: string) => api.delete(`/tickets/${id}`),
  getMyTickets: () => api.get('/tickets/my-tickets'),
  uploadAttachments: (ticketId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    return api.post(`/tickets/${ticketId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Comments endpoints
export const commentsApi = {
  getByTicket: (ticketId: string) => api.get(`/tickets/${ticketId}/comments`),
  create: (ticketId: string, data: any) => api.post(`/tickets/${ticketId}/comments`, data),
  update: (ticketId: string, commentId: string, content: string) =>
    api.patch(`/tickets/${ticketId}/comments/${commentId}`, { content }),
  delete: (ticketId: string, commentId: string) =>
    api.delete(`/tickets/${ticketId}/comments/${commentId}`),
  uploadAttachments: (ticketId: string, commentId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    return api.post(`/tickets/${ticketId}/comments/${commentId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Users endpoints
export const usersApi = {
  getAll: (params?: Record<string, any>) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  getTechnicians: (companyId?: string) => api.get('/users/technicians', { params: { companyId } }),
  changePassword: (id: string, data: { currentPassword: string; newPassword: string }) =>
    api.patch(`/users/${id}/change-password`, data),
};

// Companies endpoints
export const companiesApi = {
  getAll: () => api.get('/companies'),
  getById: (id: string) => api.get(`/companies/${id}`),
  create: (data: any) => api.post('/companies', data),
  update: (id: string, data: any) => api.patch(`/companies/${id}`, data),
  delete: (id: string) => api.delete(`/companies/${id}`),
  getStats: () => api.get('/companies/stats'),
};

// Dashboard endpoints
export const dashboardApi = {
  getMetrics: () => api.get('/dashboard/metrics'),
};

// Notifications endpoints
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};
