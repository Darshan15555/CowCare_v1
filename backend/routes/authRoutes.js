const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getMe, updateMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  registerValidators,
  loginValidators,
  updateMeValidators,
  changePasswordValidators,
} = require('../validators/authValidators');

router.post('/register', registerValidators, validate, register);
router.post('/login', loginValidators, validate, login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMeValidators, validate, updateMe);
router.patch('/change-password', protect, changePasswordValidators, validate, changePassword);

module.exports = router;
