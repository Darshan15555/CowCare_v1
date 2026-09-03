const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

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
