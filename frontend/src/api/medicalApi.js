import axiosClient from './axiosClient';

export const medicalApi = {
  completeVisit: (requestId, formData) =>
    axiosClient.post(`/medical/complete/${requestId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  recordVaccination: (cattleId, payload) =>
    axiosClient.post(`/medical/vaccination/${cattleId}`, payload),
  getCattleTimeline: (cattleId) => axiosClient.get(`/medical/cattle/${cattleId}/timeline`),
  getEventById: (eventId) => axiosClient.get(`/medical/${eventId}`),
  getReminders: (days) => axiosClient.get('/medical/reminders', { params: days ? { days } : {} }),
};
