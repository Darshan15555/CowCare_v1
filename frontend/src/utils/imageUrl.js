/**
 * Resolves a cattle image URL for display.
 *
 * - New images (Cloudinary): Already full HTTPS URLs → returned as-is.
 * - Legacy images: /uploads/filename.jpg → prefixed with backend URL.
 * - Null/empty → returns null (caller should render a fallback).
 *
 * @param {string|null} url - The image URL from MongoDB
 * @returns {string|null} Resolved URL safe for <img src={...}>
 */
export function resolveImageUrl(url) {
  if (!url) return null;
  // Blob preview URLs from browser file picker
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  // Already a full URL (Cloudinary or any CDN)
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Legacy /uploads/... path — resolve via backend origin
  const backendOrigin = import.meta.env.VITE_BACKEND_URL || '';
  return backendOrigin ? `${backendOrigin}${url}` : url;
}
