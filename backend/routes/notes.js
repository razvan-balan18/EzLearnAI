import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Tesseract from 'tesseract.js';
import Groq from 'groq-sdk';
import Note from '../models/Note.js';

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

// generare rezumat si quiz-uri
async function generateSummaryAndQuiz(text) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful study assistant. You analyze notes and provide summaries and quiz questions. Always respond with valid JSON only, no markdown formatting."
        },
        {
          role: "user",
          content: `Analyze these study notes and provide:

1. A comprehensive summary (2-3 paragraphs)
2. 5 quiz questions with answers

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

// incarcare fisier
router.post('/upload', upload.single('file'), async (req, res) => {
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

    // generare rezumat
    const aiResponse = await generateSummaryAndQuiz(extractedText);

    // salvare in baza de date
    const note = new Note({
      filename: req.file.originalname,
      originalText: extractedText,
      summary: aiResponse.summary,
      quiz: aiResponse.quiz
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
        uploadDate: note.uploadDate
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

// GET - toate notitele
router.get('/', async (req, res) => {
  try {
    const notes = await Note.find().sort({ uploadDate: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// GET - o notita
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// DELETE - notita
router.delete('/:id', async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;