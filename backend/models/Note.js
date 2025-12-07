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
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Note', noteSchema);