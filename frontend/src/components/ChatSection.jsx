import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/notes';

function ChatSection({ noteId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Prepare chat history for API (only role and content)
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await axios.post(`${API_URL}/${noteId}/chat`, {
        message: userMessage,
        chatHistory: chatHistory
      });

      // Add AI response to chat
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: response.data.response 
      }]);
    } catch (err) {
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "Can you explain the main concepts?",
    "What are the key takeaways?",
    "Give me a simple example",
    "What should I focus on for an exam?"
  ];

  const handleSuggestion = (question) => {
    setInput(question);
  };

  return (
    <div className="chat-section">
      <div className="chat-header">
        <span className="chat-icon">💬</span>
        <span>Ask questions about your notes</span>
      </div>

      {/* Suggested questions when chat is empty */}
      {messages.length === 0 && (
        <div className="chat-suggestions">
          <p className="suggestions-label">Try asking:</p>
          <div className="suggestions-grid">
            {suggestedQuestions.map((q, index) => (
              <button 
                key={index}
                className="suggestion-btn"
                onClick={() => handleSuggestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="chat-message assistant loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your notes..."
          disabled={loading}
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          className="chat-send-btn"
        >
          {loading ? '...' : '➤'}
        </button>
      </form>
    </div>
  );
}

export default ChatSection;
