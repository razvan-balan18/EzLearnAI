import { useState, useEffect } from 'react';
// Axios - biblioteca pentru a face cereri HTTP catre backend
import axios from 'axios';

import FileUpload from './components/FileUpload';
import NoteCard from './components/NoteCard';

const API_URL = 'http://localhost:5000/api/notes';

function App() {
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

  // La prima incarcare a paginii: ia notitele de pe server
  useEffect(() => {
    fetchNotes();
  }, []);


  // Ia toate notitele de la server
  const fetchNotes = async () => {
    try {
      const response = await axios.get(API_URL);
      setNotes(response.data);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  };

  // Cand utilizatorul incarca un fisier
  const handleFileUpload = async (file) => {
    setLoading(true);  // Porneste loading
    setError('');      // Sterge erori vechi

    // Pregateste fisierul pentru trimitere
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Trimite fisierul la server
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

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

  // === RENDER (ce se afiseaza pe ecran) ===
  return (
    <div className="app">
      <header className="header">
        <h1>EzLearnAI</h1>
        <button 
          className="theme-toggle" 
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="main-content">
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
            />
          ))}
        </div>

        {/* Mesaj cand nu ai notite - apare doar daca lista e goala si nu se incarca */}
        {notes.length === 0 && !loading && (
          <div className="empty-state">
            <p>No notes yet. Upload your first file to get started!</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
