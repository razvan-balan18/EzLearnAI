import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Tesseract from 'tesseract.js';
import Groq from 'groq-sdk';
import PDFDocument from 'pdfkit';
import Note from '../models/Note.js';
import { optionalAuth, protect } from '../middleware/auth.js';

const router = express.Router();

const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// configurare multer pentru incarcarea fisierelor
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|png|jpg|jpeg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, PNG, JPG, and JPEG files are allowed'));
    }
  }
});

// initializare client grok
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// extragere text din pdf-uri
async function extractTextFromPDF(filePath) {
  const { PDFParse } = await import('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

// extragere text din imagini
async function extractTextFromImage(filePath) {
  const result = await Tesseract.recognize(filePath, 'eng');
  return result.data.text;
}

// Difficulty level descriptions for quiz generation
const difficultyPrompts = {
  easy: "Generate EASY questions that test basic recall and understanding. Questions should be straightforward, focusing on definitions, simple facts, and direct concepts from the text.",
  medium: "Generate MEDIUM difficulty questions that require understanding and application. Questions should require connecting concepts, explaining relationships, and applying knowledge.",
  hard: "Generate HARD questions that require critical thinking and analysis. Questions should involve synthesis, evaluation, comparing concepts, analyzing implications, and deeper reasoning."
};

// generare rezumat si quiz-uri
async function generateSummaryAndQuiz(text, difficulty = 'medium') {
  try {
    const difficultyInstruction = difficultyPrompts[difficulty] || difficultyPrompts.medium;
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful study assistant. You analyze notes and provide summaries and quiz questions. Always respond with valid JSON only, no markdown formatting."
        },
        {
          role: "user",
          content: `Analyze these study notes and provide:

1. A comprehensive summary (7-8 paragraphs)
2. 5 quiz questions with answers

IMPORTANT: ${difficultyInstruction}

Notes:
${text.substring(0, 15000)}

Respond with ONLY valid JSON in this exact format, no markdown, no backticks:
{
  "summary": "your summary here",
  "quiz": [
    {"question": "question 1", "answer": "answer 1"},
    {"question": "question 2", "answer": "answer 2"},
    {"question": "question 3", "answer": "answer 3"},
    {"question": "question 4", "answer": "answer 4"},
    {"question": "question 5", "answer": "answer 5"}
  ]
}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000
    });

    let responseText = completion.choices[0]?.message?.content || '';
    
    responseText = responseText.trim();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
    
    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('Groq API error:', error);
    throw error;
  }
}

// Chat with notes - AI responds based on note content
async function chatWithNote(noteContent, userMessage, chatHistory = []) {
  try {
    const messages = [
      {
        role: "system",
        content: `You are a helpful study assistant. You have access to the following study notes and should answer questions based on them. Be helpful, accurate, and educational. If the question is not related to the notes, politely mention that and try to help anyway.

STUDY NOTES:
${noteContent.substring(0, 12000)}`
      },
      ...chatHistory.slice(-10), // Keep last 10 messages for context
      {
        role: "user",
        content: userMessage
      }
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1000
    });

    return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
}

// incarcare fisier - optionalAuth allows both guests and logged-in users
router.post('/upload', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    let extractedText = '';

    // extragere text in functie de tipul fisierului
    if (fileExtension === '.pdf') {
      extractedText = await extractTextFromPDF(filePath);
    } else if (['.png', '.jpg', '.jpeg'].includes(fileExtension)) {
      extractedText = await extractTextFromImage(filePath);
    }

    if (!extractedText || extractedText.trim().length < 10) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Could not extract text from file' });
    }

    // Get difficulty from request body (default to medium)
    const difficulty = req.body.difficulty || 'medium';
    
    // generare rezumat
    const aiResponse = await generateSummaryAndQuiz(extractedText, difficulty);

    // salvare in baza de date - associate with user if logged in
    const note = new Note({
      filename: req.file.originalname,
      originalText: extractedText,
      summary: aiResponse.summary,
      quiz: aiResponse.quiz,
      difficulty: difficulty,
      userId: req.user ? req.user._id : null  // null for guests
    });

    await note.save();

    // stergere fisiere
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      note: {
        _id: note._id,
        filename: note.filename,
        summary: note.summary,
        quiz: note.quiz,
        difficulty: note.difficulty,
        uploadDate: note.uploadDate,
        userId: note.userId
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message || 'Failed to process file' });
  }
});

// GET - user's notes (logged in) or empty for guests
router.get('/', optionalAuth, async (req, res) => {
  try {
    let notes;
    
    if (req.user) {
      // Logged in user - get only their notes
      notes = await Note.find({ userId: req.user._id }).sort({ uploadDate: -1 });
    } else {
      // Guest user - return empty array (they manage notes client-side in current session)
      notes = [];
    }
    
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// GET - o notita
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check if user owns this note (if note has userId)
    if (note.userId && req.user && note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// DELETE - notita
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check if user owns this note (if note has userId)
    if (note.userId && req.user && note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Note.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// EXPORT PDF - generate and download PDF
router.get('/:id/export-pdf', optionalAuth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check if user owns this note (if note has userId)
    if (note.userId && req.user && note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${note.filename.replace(/\.[^/.]+$/, '')}_notes.pdf"`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Title
    doc.fontSize(24).fillColor('#667eea').text('EzLearnAI Study Notes', { align: 'center' });
    doc.moveDown();
    
    // File info
    doc.fontSize(16).fillColor('#333').text(note.filename, { align: 'center' });
    doc.fontSize(10).fillColor('#666').text(`Generated on: ${new Date(note.uploadDate).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}`, { align: 'center' });
    doc.fontSize(10).text(`Difficulty: ${note.difficulty?.toUpperCase() || 'MEDIUM'}`, { align: 'center' });
    doc.moveDown(2);
    
    // Summary section
    doc.fontSize(18).fillColor('#667eea').text('📝 Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333').text(note.summary, { align: 'justify', lineGap: 4 });
    doc.moveDown(2);
    
    // Quiz section
    doc.fontSize(18).fillColor('#667eea').text('🎯 Quiz Questions');
    doc.moveDown(0.5);
    
    note.quiz?.forEach((item, index) => {
      doc.fontSize(12).fillColor('#333').text(`Q${index + 1}: ${item.question}`, { continued: false });
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#2e7d32').text(`Answer: ${item.answer}`);
      doc.moveDown(1);
    });
    
    // Footer
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999').text('Generated by EzLearnAI - Your AI Study Assistant', { align: 'center' });
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// CHAT - chat with note content
router.post('/:id/chat', optionalAuth, async (req, res) => {
  try {
    const { message, chatHistory } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check if user owns this note (if note has userId)
    if (note.userId && req.user && note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Generate AI response based on note content
    const response = await chatWithNote(note.originalText, message, chatHistory || []);
    
    res.json({
      success: true,
      response: response
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// REGENERATE QUIZ - regenerate quiz with different difficulty
router.post('/:id/regenerate-quiz', optionalAuth, async (req, res) => {
  try {
    const { difficulty } = req.body;
    
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }
    
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check if user owns this note (if note has userId)
    if (note.userId && req.user && note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Generate new quiz with selected difficulty
    const aiResponse = await generateSummaryAndQuiz(note.originalText, difficulty);
    
    // Update note with new quiz
    note.quiz = aiResponse.quiz;
    note.difficulty = difficulty;
    await note.save();
    
    res.json({
      success: true,
      quiz: note.quiz,
      difficulty: note.difficulty
    });
    
  } catch (error) {
    console.error('Regenerate quiz error:', error);
    res.status(500).json({ error: 'Failed to regenerate quiz' });
  }
});

export default router;
