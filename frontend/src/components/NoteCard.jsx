import { useState } from 'react';
import axios from 'axios';
import QuizSection from './QuizSection';
import ChatSection from './ChatSection';

const API_URL = 'http://localhost:5000/api/notes';

function NoteCard({ note, onDelete, onUpdate }) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentNote, setCurrentNote] = useState(note);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifficultyEmoji = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '😊';
      case 'hard': return '🔥';
      default: return '🧠';
    }
  };

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'Easy';
      case 'hard': return 'Hard';
      default: return 'Medium';
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await axios.get(`${API_URL}/${currentNote._id}/export-pdf`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${currentNote.filename.replace(/\.[^/.]+$/, '')}_notes.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleRegenerateQuiz = async (difficulty) => {
    if (regenerating) return;
    
    setRegenerating(true);
    try {
      const response = await axios.post(`${API_URL}/${currentNote._id}/regenerate-quiz`, {
        difficulty
      });
      
      setCurrentNote({
        ...currentNote,
        quiz: response.data.quiz,
        difficulty: response.data.difficulty
      });
      
      if (onUpdate) {
        onUpdate(currentNote._id, {
          quiz: response.data.quiz,
          difficulty: response.data.difficulty
        });
      }
    } catch (err) {
      console.error('Failed to regenerate quiz:', err);
      alert('Failed to regenerate quiz. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="note-card">
      <div className="note-header">
        <h3>{currentNote.filename}</h3>
        <div className="note-actions">
          <button 
            className="export-btn" 
            onClick={handleExportPDF}
            title="Export as PDF"
          >
            📄 PDF
          </button>
          <button 
            className="delete-btn" 
            onClick={() => onDelete(currentNote._id)}
            title="Delete note"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="note-meta">
        <span className="note-date">{formatDate(currentNote.uploadDate)}</span>
        <span className={`difficulty-badge ${currentNote.difficulty || 'medium'}`}>
          {getDifficultyEmoji(currentNote.difficulty)} {getDifficultyLabel(currentNote.difficulty)}
        </span>
      </div>

      <div className="note-section">
        <h4>📝 Summary</h4>
        <p className="summary-text">{currentNote.summary}</p>
      </div>

      {/* Quiz Section */}
      <div className="note-section">
        <div className="quiz-header">
          <h4>🎯 Quiz ({currentNote.quiz?.length || 0} questions)</h4>
          <button 
            className="toggle-quiz-btn"
            onClick={() => setShowQuiz(!showQuiz)}
          >
            {showQuiz ? 'Hide Quiz' : 'Show Quiz'}
          </button>
        </div>
        
        {showQuiz && (
          <>
            <div className="regenerate-quiz">
              <span className="regenerate-label">Regenerate with different difficulty:</span>
              <div className="regenerate-buttons">
                <button 
                  className={`regen-btn easy ${currentNote.difficulty === 'easy' ? 'active' : ''}`}
                  onClick={() => handleRegenerateQuiz('easy')}
                  disabled={regenerating}
                >
                  😊 Easy
                </button>
                <button 
                  className={`regen-btn medium ${currentNote.difficulty === 'medium' || !currentNote.difficulty ? 'active' : ''}`}
                  onClick={() => handleRegenerateQuiz('medium')}
                  disabled={regenerating}
                >
                  🧠 Medium
                </button>
                <button 
                  className={`regen-btn hard ${currentNote.difficulty === 'hard' ? 'active' : ''}`}
                  onClick={() => handleRegenerateQuiz('hard')}
                  disabled={regenerating}
                >
                  🔥 Hard
                </button>
              </div>
              {regenerating && <span className="regenerating-text">Regenerating quiz...</span>}
            </div>
            <QuizSection quiz={currentNote.quiz} />
          </>
        )}
      </div>

      {/* Chat Section */}
      <div className="note-section">
        <div className="chat-toggle-header">
          <h4>💬 Chat with Notes</h4>
          <button 
            className="toggle-chat-btn"
            onClick={() => setShowChat(!showChat)}
          >
            {showChat ? 'Hide Chat' : 'Ask Questions'}
          </button>
        </div>
        
        {showChat && <ChatSection noteId={currentNote._id} />}
      </div>
    </div>
  );
}

export default NoteCard;