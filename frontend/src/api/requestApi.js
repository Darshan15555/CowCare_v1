import axiosClient from './axiosClient';

export const requestApi = {
  create: (formData) =>
    axiosClient.post('/requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll: (status) =>
    axiosClient.get('/requests', { params: { limit: 100, ...(status ? { status } : {}) } }),
  getById: (id) => axiosClient.get(`/requests/${id}`),
  updateStatus: (id, payload) => axiosClient.patch(`/requests/${id}/status`, payload),
  submitRating: (id, payload) => axiosClient.post(`/requests/${id}/rating`, payload),
  getVetRating: (vetId) => axiosClient.get(`/requests/vet-rating/${vetId}`),
};
