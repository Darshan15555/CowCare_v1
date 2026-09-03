const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  setUserActiveStatus,
  getEscalatedRequests,
  getAllCattle,
  getAllRequests,
  getAnalytics,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleCheck');

router.use(protect, restrictTo('ADMIN'));

router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/escalated-requests', getEscalatedRequests);
router.get('/cattle', getAllCattle);
router.get('/requests', getAllRequests);
router.get('/users', getUsers);
router.patch('/users/:id/status', setUserActiveStatus);

module.exports = router;
