const User = require('../models/User');
const Note = require('../models/Note');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getStats } = require('../events/listeners');

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.json({ count: users.length, users });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new AppError('Admins cannot delete their own account', 400);
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  await Note.deleteMany({ owner: user.id });
  res.json({ message: 'User and their notes deleted', id: user.id });
});

exports.listAllNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find().populate('owner', 'username email').sort({ createdAt: -1 });
  res.json({ count: notes.length, notes });
});

// Counters collected by the EventEmitter listeners
exports.eventStats = (req, res) => res.json(getStats());
