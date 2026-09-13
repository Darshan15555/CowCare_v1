const multer = require('multer');

// Use memoryStorage so file buffers can be streamed directly to Cloudinary
// instead of being written to ephemeral Render disk.
const storage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'];

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'voiceNote') {
    if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Voice note must be a supported audio format.'), false);
  }

  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Only JPG, PNG, or WEBP images are allowed.'), false);
};

const maxSizeMb = Number(process.env.MAX_UPLOAD_MB) || 5;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
});

module.exports = upload;
