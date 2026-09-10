import axiosClient from './axiosClient';

export const marketplaceApi = {
  // Browse marketplace cattle with filters (breed, gender, minPrice, maxPrice, status, search, page, limit, sortBy, etc.)
  getMarketplaceCattle: (params) => axiosClient.get('/marketplace/cows', { params }),

  // Live real aggregations & overview metrics
  getMarketplaceStats: () => axiosClient.get('/marketplace/stats'),

  // Get specific marketplace passport & canonical medical timeline
  getMarketplaceCowProfile: (id) => axiosClient.get(`/marketplace/cows/${id}`),

  // Toggle favorite / wishlist status for a cow listing
  toggleFavorite: (cattleId) => axiosClient.post(`/marketplace/cows/${cattleId}/favorite`),

  // Retrieve user's saved favorites
  getFavorites: () => axiosClient.get('/marketplace/favorites'),

  // Mark cow open for sale
  listCowForSale: (cattleId, data) =>
    axiosClient.post(`/marketplace/cows/${cattleId}/sale`, data),

  // Update sale price, description, status (e.g. SALE_PENDING, SOLD)
  updateSaleListing: (cattleId, data) =>
    axiosClient.patch(`/marketplace/cows/${cattleId}/sale`, data),

  // Remove cow from marketplace
  removeCowFromSale: (cattleId) =>
    axiosClient.delete(`/marketplace/cows/${cattleId}/sale`),

  // Buyer requests ownership after offline deal agreed
  requestOwnership: (cattleId) =>
    axiosClient.post(`/marketplace/cows/${cattleId}/request-ownership`),
};
