import axiosClient from './axiosClient';

export const adminApi = {
  getDashboardStats: () => axiosClient.get('/admin/dashboard'),
  getEscalatedRequests: () => axiosClient.get('/admin/escalated-requests'),
  getUsers: (role) => axiosClient.get('/admin/users', { params: { limit: 100, ...(role ? { role } : {}) } }),
  setUserActiveStatus: (id, isActive) =>
    axiosClient.patch(`/admin/users/${id}/status`, { isActive }),
};
