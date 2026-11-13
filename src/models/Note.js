const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    content: { type: String, default: '', maxlength: 5000 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Note', noteSchema);
