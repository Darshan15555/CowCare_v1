import axiosClient from './axiosClient';

export const cattleApi = {
  add: (formData) =>
    axiosClient.post('/cattle', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMine: () => axiosClient.get('/cattle/mine'),
  getProfile: (id) => axiosClient.get(`/cattle/${id}`),
  scanQr: (cattleId) => axiosClient.get(`/cattle/scan/${cattleId}`),
  update: (id, formData) =>
    axiosClient.patch(`/cattle/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  initiateTransfer: (cattleId, toPhone) => axiosClient.post(`/cattle/${cattleId}/transfer`, { toPhone }),
  getMyTransfers: () => axiosClient.get('/cattle/transfers'),
  respondToTransfer: (transferId, action) =>
    axiosClient.patch(`/cattle/transfers/${transferId}`, { action }),
};
