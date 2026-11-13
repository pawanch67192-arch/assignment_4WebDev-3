const Note = require('../models/Note');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { emitter, EVENTS } = require('../events/appEvents');

// Every query is scoped to { owner: req.user.id } so users can only touch their own notes.
// A note that belongs to someone else is reported as 404 (does not reveal that it exists).

exports.createNote = asyncHandler(async (req, res) => {
  const note = await Note.create({ ...req.body, owner: req.user.id });
  emitter.emit(EVENTS.NOTE_CREATED, { noteId: note.id, owner: req.user.id });
  res.status(201).json(note);
});

exports.getNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ owner: req.user.id }).sort({ createdAt: 1 });
  res.json(notes);
});

exports.getNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, owner: req.user.id });
  if (!note) throw new AppError('Note not found', 404);
  res.json(note);
});

exports.updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!note) throw new AppError('Note not found', 404);
  emitter.emit(EVENTS.NOTE_UPDATED, { noteId: note.id, owner: req.user.id });
  res.json(note);
});

exports.deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!note) throw new AppError('Note not found', 404);
  emitter.emit(EVENTS.NOTE_DELETED, { noteId: note.id, owner: req.user.id });
  res.json({ message: 'Note deleted', id: note.id });
});
