import { useState, useEffect } from 'react';
// Axios - biblioteca pentru a face cereri HTTP catre backend
import axios from 'axios';

import FileUpload from './components/FileUpload';
import NoteCard from './components/NoteCard';
import AuthModal from './components/AuthModal';
import { useAuth } from './context/AuthContext';

const API_URL = 'http://localhost:5000/api/notes';

function App() {
  // AUTH STATE
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // STATE-URI (variabile care cand se schimba, re-randeaza pagina) 
  
  // Lista de notite primite de la server
  const [notes, setNotes] = useState([]);
  
  // True cand se proceseaza un fisier (afisam spinner)
  const [loading, setLoading] = useState(false);
  
  // eroare 
  const [error, setError] = useState('');
  
  // Dark mode - citim din localStorage daca exista, altfel false
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // === EFECTE (actiuni care se executa automat) ===

  // Cand se schimba darkMode: adauga/scoate clasa pe body si salveaza in localStorage
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Fetch notes when auth state changes (logged in/out)
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        fetchNotes();
      } else {
        // When logged out, clear notes (guest mode shows only session notes)
        setNotes([]);
      }
    }
  }, [isAuthenticated, authLoading]);


  // Ia toate notitele de la server (only for logged in users)
  const fetchNotes = async () => {
    try {
      const response = await axios.get(API_URL);
      setNotes(response.data);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  };

  // Cand utilizatorul incarca un fisier
  const handleFileUpload = async (file, difficulty = 'medium') => {
    setLoading(true);  // Porneste loading
    setError('');      // Sterge erori vechi

    // Pregateste fisierul pentru trimitere
    const formData = new FormData();
    formData.append('file', file);
    formData.append('difficulty', difficulty);

    try {
      // Trimite fisierul la server
      // Note: Don't set Content-Type manually for FormData - axios handles it automatically
      // This also ensures the Authorization header from defaults is included
      const response = await axios.post(`${API_URL}/upload`, formData);

      // Adauga notita noua la inceputul listei
      setNotes([response.data.note, ...notes]);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process file');
      setLoading(false);
    }
  };

  // Sterge o notita dupa ID
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      // Scoate notita din lista locala
      setNotes(notes.filter(note => note._id !== id));
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // Update a note locally (e.g., after regenerating quiz)
  const handleNoteUpdate = (id, updates) => {
    setNotes(notes.map(note => 
      note._id === id ? { ...note, ...updates } : note
    ));
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setNotes([]);  // Clear notes when logging out
  };

  // === RENDER (ce se afiseaza pe ecran) ===
  return (
    <div className="app">
      <header className="header">
        <h1>EzLearnAI</h1>
        
        <div className="header-actions">
          {/* Auth buttons */}
          {isAuthenticated ? (
            <div className="user-menu">
              <span className="user-greeting">👋 Hi, {user?.name}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button 
              className="login-btn"
              onClick={() => setShowAuthModal(true)}
            >
              Sign In
            </button>
          )}
          
          <button 
            className="theme-toggle" 
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Guest mode notice */}
        {!isAuthenticated && (
          <div className="guest-notice">
            <span className="guest-icon">💡</span>
            <p>
              You're using EzLearnAI as a guest. Your notes will only be saved for this session.
              <button 
                className="guest-signup-btn"
                onClick={() => setShowAuthModal(true)}
              >
                Sign in to save your notes permanently!
              </button>
            </p>
          </div>
        )}

        {/* Zona de upload fisiere */}
        <FileUpload onUpload={handleFileUpload} loading={loading} />
        
        {/* Mesaj de eroare - apare doar daca error nu e gol */}
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {/* Spinner - apare doar cand loading e true */}
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Processing your notes with EzLearnAI</p>
          </div>
        )}

        {/* Grid cu toate notitele - parcurge lista si creeaza cate un NoteCard */}
        <div className="notes-grid">
          {notes.map(note => (
            <NoteCard 
              key={note._id} 
              note={note} 
              onDelete={handleDelete}
              onUpdate={handleNoteUpdate}
            />
          ))}
        </div>

        {/* Mesaj cand nu ai notite - apare doar daca lista e goala si nu se incarca */}
        {notes.length === 0 && !loading && (
          <div className="empty-state">
            <p>
              {isAuthenticated 
                ? 'No notes yet. Upload your first file to get started!'
                : 'Upload a file to create your first study note!'
              }
            </p>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}

export default App;
