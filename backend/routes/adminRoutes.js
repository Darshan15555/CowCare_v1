const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  setUserActiveStatus,
  getEscalatedRequests,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleCheck');

router.use(protect, restrictTo('ADMIN'));

router.get('/dashboard', getDashboardStats);
router.get('/escalated-requests', getEscalatedRequests);
router.get('/users', getUsers);
router.patch('/users/:id/status', setUserActiveStatus);

module.exports = router;
