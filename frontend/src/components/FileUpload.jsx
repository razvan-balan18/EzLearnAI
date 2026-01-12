import { useState, useRef } from 'react';

function FileUpload({ onUpload, loading }) {
  const [dragActive, setDragActive] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, PNG, JPG, or JPEG file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    onUpload(file, difficulty);
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleDifficultyChange = (e) => {
    e.stopPropagation(); // Prevent triggering file dialog
    setDifficulty(e.target.value);
  };

  return (
    <div className="file-upload-container">
      {/* Difficulty selector */}
      <div className="difficulty-selector">
        <label className="difficulty-label">
          <span className="difficulty-icon">🎯</span>
          Quiz Difficulty:
        </label>
        <div className="difficulty-options">
          <button 
            type="button"
            className={`difficulty-btn ${difficulty === 'easy' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setDifficulty('easy'); }}
          >
            😊 Easy
          </button>
          <button 
            type="button"
            className={`difficulty-btn ${difficulty === 'medium' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setDifficulty('medium'); }}
          >
            🧠 Medium
          </button>
          <button 
            type="button"
            className={`difficulty-btn ${difficulty === 'hard' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setDifficulty('hard'); }}
          >
            🔥 Hard
          </button>
        </div>
      </div>

      <div 
        className={`file-upload ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleChange}
          style={{ display: 'none' }}
          disabled={loading}
        />
        
        <div className="upload-content">
          <div className="upload-icon">📎</div>
          <h3>Drag & Drop Your Notes</h3>
          <p>or click to browse</p>
          <span className="file-types">PDF, PNG, JPG, JPEG (Max 10MB)</span>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;