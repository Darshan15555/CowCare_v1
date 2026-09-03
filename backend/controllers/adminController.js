const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Cattle = require('../models/Cattle');
const VetRequest = require('../models/VetRequest');

// @route GET /api/admin/dashboard
// @access Private (ADMIN)
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalFarmers,
    totalVeterinarians,
    totalCattle,
    activeCases,
    completedVisits,
    emergencyCases,
    escalatedCases,
  ] = await Promise.all([
    User.countDocuments({ role: 'FARMER' }),
    User.countDocuments({ role: 'VETERINARIAN' }),
    Cattle.countDocuments({ isActive: true }),
    VetRequest.countDocuments({ status: { $nin: ['COMPLETED', 'REJECTED', 'CANCELLED'] } }),
    VetRequest.countDocuments({ status: 'COMPLETED' }),
    VetRequest.countDocuments({
      priority: 'EMERGENCY',
      status: { $nin: ['COMPLETED', 'REJECTED', 'CANCELLED'] },
    }),
    VetRequest.countDocuments({ escalatedAt: { $ne: null }, status: 'REQUESTED' }),
  ]);

  res.json({
    success: true,
    stats: {
      totalFarmers,
      totalVeterinarians,
      totalCattle,
      activeCases,
      completedVisits,
      emergencyCases,
      escalatedCases,
    },
  });
});

// @route GET /api/admin/escalated-requests
// @access Private (ADMIN) — surfaces emergencies that are still unaccepted
// after being escalated, so admin can intervene manually if needed.
const getEscalatedRequests = asyncHandler(async (req, res) => {
  const requests = await VetRequest.find({ escalatedAt: { $ne: null }, status: 'REQUESTED' })
    .sort({ escalatedAt: -1 })
    .populate('farmerId', 'name phone');
  res.json({ success: true, count: requests.length, requests });
});

// @route GET /api/admin/users
// @access Private (ADMIN)
const getUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: users.length,
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// @route PATCH /api/admin/users/:id/status
// @access Private (ADMIN)
const setUserActiveStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }
  res.json({ success: true, user: user.toSafeObject() });
});

// @route GET /api/admin/cattle
// @access Private (ADMIN)
const getAllCattle = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const filter = { isActive: true };

  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { cattleId: { $regex: search, $options: 'i' } },
    ];
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [cattle, total] = await Promise.all([
    Cattle.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ownerId', 'name phone farmName'),
    Cattle.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: cattle.length,
    cattle,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// @route GET /api/admin/requests
// @access Private (ADMIN)
const getAllRequests = asyncHandler(async (req, res) => {
  const { status, priority } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    VetRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('farmerId', 'name phone')
      .populate('veterinarianId', 'name specialization')
      .populate('cattleId', 'name cattleId'),
    VetRequest.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: requests.length,
    requests,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// @route GET /api/admin/analytics
// @access Private (ADMIN)
const getAnalytics = asyncHandler(async (req, res) => {
  // Cattle health status distribution
  const cattleStatusDistribution = await Cattle.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Requests by priority
  const requestsByPriority = await VetRequest.aggregate([
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  // Requests by status
  const requestsByStatus = await VetRequest.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Requests created per week (last 12 weeks)
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
  const requestsOverTime = await VetRequest.aggregate([
    { $match: { createdAt: { $gte: twelveWeeksAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%U', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    analytics: {
      cattleStatusDistribution,
      requestsByPriority,
      requestsByStatus,
      requestsOverTime,
    },
  });
});

module.exports = {
  getDashboardStats,
  getUsers,
  setUserActiveStatus,
  getEscalatedRequests,
  getAllCattle,
  getAllRequests,
  getAnalytics,
};
