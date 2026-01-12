import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalText: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  quiz: [{
    question: String,
    answer: String
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  // Optional user reference - null means guest/anonymous note
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient user-based queries
noteSchema.index({ userId: 1, uploadDate: -1 });

export default mongoose.model('Note', noteSchema);
