const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require('../utils/tokenUtils');
const jwt = require('jsonwebtoken');
const { normalizePhone } = require('../utils/normalizePhone');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const issueTokens = async (res, user) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  return accessToken;
};

// @route POST /api/auth/register
// @access Public
const register = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    email,
    password,
    role,
    farmName,
    defaultLocation,
    specialization,
    licenseNumber,
    yearsOfExperience,
  } = req.body;

  if (!name || !phone || !password || !role) {
    res.status(400);
    throw new Error('Name, phone, password, and role are required.');
  }

  if (!['FARMER', 'VETERINARIAN'].includes(role)) {
    // Admin accounts are provisioned separately, not via public self-registration.
    res.status(400);
    throw new Error('Role must be FARMER or VETERINARIAN.');
  }

  const existing = await User.findOne({ phone: normalizePhone(phone) });
  if (existing) {
    res.status(409);
    throw new Error('An account with this phone number already exists.');
  }

  const userData = { name, phone, email, password, role };

  if (role === 'FARMER') {
    userData.farmName = farmName;
    userData.defaultLocation = defaultLocation;
  } else if (role === 'VETERINARIAN') {
    userData.specialization = specialization;
    userData.licenseNumber = licenseNumber;
    userData.yearsOfExperience = yearsOfExperience || 0;
  }

  const user = await User.create(userData);
  const accessToken = await issueTokens(res, user);

  res.status(201).json({
    success: true,
    accessToken,
    user: user.toSafeObject(),
  });
});

// @route POST /api/auth/login
// @access Public
const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    res.status(400);
    throw new Error('Phone and password are required.');
  }

  const user = await User.findOne({ phone: normalizePhone(phone) }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid phone number or password.');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated.');
  }

  const accessToken = await issueTokens(res, user);

  res.json({
    success: true,
    accessToken,
    user: user.toSafeObject(),
  });
});

// @route POST /api/auth/refresh
// @access Public (requires valid refresh cookie)
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401);
    throw new Error('No refresh token provided.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    res.status(401);
    throw new Error('Invalid or expired refresh token.');
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || user.refreshTokenHash !== hashToken(token)) {
    res.status(401);
    throw new Error('Refresh token does not match any active session.');
  }

  const accessToken = await issueTokens(res, user);
  res.json({ success: true, accessToken });
});

// @route POST /api/auth/logout
// @access Private
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshTokenHash: null });
  res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// @route GET /api/auth/me
// @access Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

// @route PATCH /api/auth/me
// @access Private
// Lets a user edit their own profile fields. Role-specific fields are only
// applied for the matching role so a farmer can't set vet-only fields and
// vice versa.
const updateMe = asyncHandler(async (req, res) => {
  const user = req.user;
  const {
    name,
    email,
    avatarUrl,
    farmName,
    defaultLocation,
    preferredLanguage,
    specialization,
    licenseNumber,
    yearsOfExperience,
    isAvailable,
    serviceAreaRadiusKm,
    weeklySchedule,
    acceptsEmergencyOverride,
  } = req.body;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

  if (user.role === 'FARMER') {
    if (farmName !== undefined) user.farmName = farmName;
    if (defaultLocation !== undefined) user.defaultLocation = defaultLocation;
    if (preferredLanguage !== undefined) user.preferredLanguage = preferredLanguage;
  }

  if (user.role === 'VETERINARIAN') {
    if (specialization !== undefined) user.specialization = specialization;
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
    if (yearsOfExperience !== undefined) user.yearsOfExperience = yearsOfExperience;
    if (isAvailable !== undefined) user.isAvailable = isAvailable;
    if (serviceAreaRadiusKm !== undefined) user.serviceAreaRadiusKm = serviceAreaRadiusKm;
    if (weeklySchedule !== undefined) user.weeklySchedule = weeklySchedule;
    if (acceptsEmergencyOverride !== undefined) user.acceptsEmergencyOverride = acceptsEmergencyOverride;
  }

  await user.save();
  res.json({ success: true, user: user.toSafeObject() });
});

// @route PATCH /api/auth/change-password
// @access Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Current password and new password are required.');
  }

  // Need to explicitly select the password field since it's select: false on the schema.
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    res.status(401);
    throw new Error('Current password is incorrect.');
  }

  user.password = newPassword;
  // Invalidate the refresh token so other sessions are forced to re-authenticate
  // with the new password.
  user.refreshTokenHash = null;
  await user.save();

  // Re-issue tokens for the current session so the user isn't logged out.
  const accessToken = await issueTokens(res, user);

  res.json({ success: true, message: 'Password changed successfully.', accessToken });
});

module.exports = { register, login, refresh, logout, getMe, updateMe, changePassword };
