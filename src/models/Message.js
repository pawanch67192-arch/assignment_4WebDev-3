const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
