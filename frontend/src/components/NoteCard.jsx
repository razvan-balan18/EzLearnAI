import { useState } from 'react';
import QuizSection from './QuizSection';

function NoteCard({ note, onDelete }) {
  const [showQuiz, setShowQuiz] = useState(false);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="note-card">
      <div className="note-header">
        <h3>{note.filename}</h3>
        <button 
          className="delete-btn" 
          onClick={() => onDelete(note._id)}
          title="Delete note"
        >
          🗑️
        </button>
      </div>

      <p className="note-date">{formatDate(note.uploadDate)}</p>

      <div className="note-section">
        <h4>📝 Summary</h4>
        <p className="summary-text">{note.summary}</p>
      </div>

      <div className="note-section">
        <div className="quiz-header">
          <h4>🎯 Quiz ({note.quiz?.length || 0} questions)</h4>
          <button 
            className="toggle-quiz-btn"
            onClick={() => setShowQuiz(!showQuiz)}
          >
            {showQuiz ? 'Hide Quiz' : 'Show Quiz'}
          </button>
        </div>
        
        {showQuiz && <QuizSection quiz={note.quiz} />}
      </div>
    </div>
  );
}

export default NoteCard;