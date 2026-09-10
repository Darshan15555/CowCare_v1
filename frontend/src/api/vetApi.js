import axiosClient from './axiosClient';
export const vetApi = {
  list: (params) => axiosClient.get('/vets', { params }),
  favorites: () => axiosClient.get('/vets/favorites'),
  favorite: (id) => axiosClient.post(`/vets/${id}/favorite`),
  unfavorite: (id) => axiosClient.delete(`/vets/${id}/favorite`),
};
