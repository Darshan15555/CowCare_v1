const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary from environment variables.
// These must be set on Render (production) and optionally in .env (local dev).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary.
 *
 * @param {Buffer} fileBuffer - The image file buffer from Multer memoryStorage
 * @param {object} [options] - Cloudinary upload options
 * @param {string} [options.folder] - Cloudinary folder path (e.g. 'cowcare/cattle')
 * @param {string} [options.public_id] - Custom public ID
 * @returns {Promise<{ secure_url: string, public_id: string, width: number, height: number }>}
 */
async function uploadToCloudinary(fileBuffer, options = {}) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.'
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'cowcare',
        resource_type: 'image',
        // Optimize images automatically
        transformation: [
          { quality: 'auto:good', fetch_format: 'auto' },
        ],
        ...(options.public_id ? { public_id: options.public_id } : {}),
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary] Upload failed:', error.message);
          return reject(new Error(`Image upload failed: ${error.message}`));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete an image from Cloudinary by its public ID.
 *
 * @param {string} publicId - The Cloudinary public_id to delete
 * @returns {Promise<void>}
 */
async function deleteFromCloudinary(publicId) {
  if (!publicId || !process.env.CLOUDINARY_CLOUD_NAME) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('[Cloudinary] Delete failed (non-critical):', err.message);
  }
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };
