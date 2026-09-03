import axiosClient from './axiosClient';

export const notificationApi = {
  getMine: () => axiosClient.get('/notifications'),
  markAsRead: (id) => axiosClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => axiosClient.patch('/notifications/read-all'),
};
