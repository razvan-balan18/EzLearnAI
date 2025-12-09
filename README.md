# EzLearnAI

Aplicatie web pentru invatare care transforma notitele in rezumate si quiz-uri folosind inteligenta artificiala.

## Ce face aplicatia

Incarci un PDF sau o imagine cu notite, iar aplicatia:
- Extrage textul automat (OCR pentru imagini)
- Genereaza un rezumat detaliat
- Creeaza 5 intrebari de quiz cu raspunsuri

Notitele sunt salvate si le poti accesa oricand.

## Tehnologii folosite

**Backend:**
- Node.js + Express
- MongoDB cu Mongoose
- Groq API (LLaMA 3.3 70B) pentru generare AI
- Tesseract.js pentru OCR
- pdf-parse pentru citire PDF
- Multer pentru upload fisiere

**Frontend:**
- React 19 cu Vite
- Axios pentru request-uri HTTP
- CSS custom cu suport dark mode

## Structura proiectului

```
proiect_TW/
├── backend/
│   ├── models/
│   │   └── Note.js          # Model baza de date
│   ├── routes/
│   │   └── notes.js         # API endpoints
│   ├── uploads/             # Fisiere temporare
│   ├── server.js            # Server principal
│   └── .env                 # Configurari
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.jsx
│   │   │   ├── NoteCard.jsx
│   │   │   └── QuizSection.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   └── index.html
│
└── README.md
```

## Instalare

### 1. Cloneaza proiectul

```bash
git clone <repository-url>
cd proiect_TW
```

### 2. Instaleaza dependentele

Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd frontend
npm install
```

### 3. Configureaza variabilele de mediu

Creeaza fisierul `backend/.env`:

```
MONGODB_URI=mongodb://localhost:27017/ezlearnai
GROQ_API_KEY=your_api_key_here
PORT=5000
```

Pentru API key de la Groq:
1. Mergi pe https://console.groq.com
2. Creeaza cont si genereaza un API key
3. Copiaza key-ul in fisierul .env

## Rulare

Deschide doua terminale:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Aplicatia va fi disponibila la `http://localhost:5173`

## API Endpoints

| Metoda | Endpoint | Descriere |
|--------|----------|-----------|
| GET | /api/notes | Lista toate notitele |
| GET | /api/notes/:id | O singura notita |
| POST | /api/notes/upload | Upload fisier nou |
| DELETE | /api/notes/:id | Sterge o notita |

### Exemplu upload:

```bash
curl -X POST http://localhost:5000/api/notes/upload -F "file=@document.pdf"
```

## Model baza de date

```javascript
{
  filename: String,      // Numele fisierului
  originalText: String,  // Textul extras
  summary: String,       // Rezumatul AI
  quiz: [{
    question: String,
    answer: String
  }],
  uploadDate: Date
}
```

## Limite

- Dimensiune maxima fisier: 10MB
- Tipuri acceptate: PDF, PNG, JPG, JPEG
- Textul trimis la AI: max 15000 caractere

## Functionalitati

- Upload drag & drop
- Mod luminos / intunecat (salvat in browser)
- Design responsive
- Afisare/ascundere raspunsuri quiz

## Probleme frecvente

**MongoDB nu se conecteaza:**
- Verifica daca MongoDB ruleaza local sau daca URI-ul Atlas e corect

**Eroare la upload:**
- Verifica daca fisierul e sub 10MB
- Verifica daca formatul e acceptat

**Quiz-ul nu se genereaza:**
- Verifica API key-ul Groq in .env
- Textul din document trebuie sa aiba minim 10 caractere

---

Proiect pentru cursul de Tehnologii Web
