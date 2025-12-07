import { useState } from 'react';

function QuizSection({ quiz }) {
  const [showAnswers, setShowAnswers] = useState({});

  const toggleAnswer = (index) => {
    setShowAnswers(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="quiz-section">
      {quiz?.map((item, index) => (
        <div key={index} className="quiz-item">
          <div className="question">
            <strong>Q{index + 1}:</strong> {item.question}
          </div>
          <button 
            className="show-answer-btn"
            onClick={() => toggleAnswer(index)}
          >
            {showAnswers[index] ? 'Hide Answer' : 'Show Answer'}
          </button>
          {showAnswers[index] && (
            <div className="answer">
              <strong>Answer:</strong> {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default QuizSection;