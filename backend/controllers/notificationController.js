const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @route GET /api/notifications
// @access Private
const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100);
  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });
  res.json({ success: true, notifications, unreadCount });
});

// @route PATCH /api/notifications/:id/read
// @access Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found.');
  }
  res.json({ success: true, notification });
});

// @route PATCH /api/notifications/read-all
// @access Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true });
});

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
