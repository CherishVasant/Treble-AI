# TrebleAI — AI-Powered Music Theory & Practice Platform

TrebleAI is a premium, full-featured music theory learning and sheet music practice application. It bridges the gap between static notation and interactive study by converting uploaded sheet music scans, PDFs, or MusicXML files into interactive, audible, and theoretically analyzed formats. A context-aware AI tutor accompanies the musician, offering tailored practice routines, harmonic insights, and guidance rooted directly in the uploaded piece's musical qualities.

---

## 🎯 Project Narrative & Use Cases

Musicians and music students often face a disconnect between practicing their instrument and studying music theory. Learning a piece from sheet music is typically a silent, static process, while studying theory is done in isolation from textbooks. 

**TrebleAI solves this by providing:**
1. **An Interactive Practice Companion**: Instantly converts sheet music uploads into fully playable audio and interactive vector notation, allowing students to hear what they are practicing at adjustable tempos.
2. **Context-Aware AI Guidance**: Instead of a generic chatbot, TrebleAI’s AI tutor digests a deterministic music theory analysis of the uploaded sheet music (identifying keys, chords, modulations, and even voice-leading errors) to give the student personalized advice on fingerings, practice scales, and chord breakdowns.
3. **Structured Reference Learning**: A relational reference library containing scales, chords, intervals, and formulas, fully integrated into the tutor's knowledge base.

---

## 🚀 Key Platform Features

### 🎵 Practical Practice Studio
* **Multi-Format Sheet Music Uploader**: Drag-and-drop interface supporting image uploads, PDF pages, and native MusicXML/MXL files.
* **Dynamic Notation Rendering**: High-fidelity, vector-based sheet music rendering powered by OpenSheetMusicDisplay (OSMD).
* **Interactive Playback Controller**: Custom audio player with playback speed scaling ($0.5\times$ to $2.0\times$) and volume controls using synthesized audio.
* **Context-Aware Practice Coach**: An AI tutor that reads the exact details of the loaded sheet music (e.g., composer, tempo, key, chord analysis, and difficulty) to give contextualized practice advice.

### 🎓 General Theory Assistant
* **Immersive Study Interface**: A full-screen study environment with glassmorphic cards and floating CSS background animations.
* **Dynamic Study Summarization**: Large Language Models automatically summarize chat sessions into academic, concise study titles for easy search.
* **Suggested Study Prompts**: Quick-start templates to explore advanced topics like modal harmony, cadences, voice leading, and chord constructions.

### 📚 Relational Reference Library
* **Searchable Database**: Quickly query scales, chords, and musical definitions stored in a relational database.
* **Interactive Detail Cards**: Expandable layouts showing pitch spellings, mathematical scale formulas, interval configurations, and historical metadata.
* **Tutor Tool Binding**: The AI tutor is bound to this library, allowing it to retrieve exact local database records to answer queries with high accuracy.

---

## ⚙️ Sheet Music OMR & Synthesis Pipeline

TrebleAI features a robust processing pipeline that handles uploads, extracts music notation data, and synthesizes playable audio in the background:

```mermaid
graph TD
    A[User Uploads Image/PDF] --> B[OpenCV Image Enhancement & Deskewing]
    B --> C[Audiveris OMR Engine]
    C --> D[MusicXML Output]
    D --> E[music21 Parsing & Analysis]
    E --> F[MIDI Generation]
    E --> G[Deterministic Music Theory Report]
    F --> H[FluidSynth SoundFont Audio Synthesis]
    H --> I[WAV/MP3 Playback File]
    G --> J[AI Tutor Practice Context]
```

1. **Enhancement**: OpenCV preprocesses uploads (grayscale conversion, adaptive thresholding, and deskewing) to maximize readability. PyMuPDF extracts PDF pages and renders them as high-contrast images.
2. **Optical Music Recognition (OMR)**: The Audiveris engine processes enhanced images to recognize musical elements and outputs structural MusicXML (`.mxl`) files.
3. **Parsing & Analysis**: The `music21` library parses the MusicXML files to construct an internal stream representation. It extracts metadata (tempo, keys, accidentals) and executes the analysis engine.
4. **Synthesis & Playback**: The score stream is compiled into a MIDI file. FluidSynth synthesizes this MIDI file into standard WAV audio using a high-quality GeneralUser SoundFont, which is served to the frontend.

---

## 📊 Deterministic Music Theory Analysis Engine

When a score is parsed by the backend, it compiles a detailed JSON report covering several musical dimensions:
* **Key & Modulation Analysis**: Identifies the key signature, actual tonal center, relative keys, and tracks modulations across sliding 4-measure windows. It calculates Jaccard similarity indices to suggest modal interpretations (e.g., Dorian, Lydian).
* **Chord & Inversion Recognition**: Evaluates pitch classes against a formula registry to recognize triads, seventh chords, extensions, and suspensions. It computes the active bass note to identify inversions ($0$ to $3$).
* **Roman Numeral Analysis (RNA)**: Translates chords to Roman numerals relative to the key, identifying chromatic harmonies, secondary dominants, and borrowed chords.
* **Cadence Detection**: Recognizes Perfect/Imperfect Authentic, Plagal, Half, and Deceptive cadences from chord-transition patterns.
* **Melodic Interval & Rhythm Statistics**: Tracks melodic intervals, average movement, largest leaps, note duration distributions, syncopation occurrences, and tuplets.
* **Phrase & Motif Detection**: Estimates phrase boundaries using rests, slurs, cadences, and long note durations. It runs sequence-matching to find repeating melodic interval patterns (motifs).
* **Difficulty Profiling**: Computes a difficulty rating ($1.0$ to $10.0$) and categorizes the piece (Beginner, Intermediate, Advanced) based on polyphonic texture, hand span, speed (notes per second), accidentals, and rhythmic syncopation.
* **Fingering & Practice Recommendations**: Proposes scale fingerings (right/left hand) from a local registry and suggests key warm-ups.
* **Voice-Leading Error Detection**: Highlights parallel fifths and octaves by evaluating transitions between chordified voices.

---

## 🤖 Agentic AI & LangChain Architecture

The AI Tutor uses an agentic workflow implemented via LangChain and LangGraph:
* **ReAct Loop**: The agent utilizes a Reasoning-Action loop to decide whether to query local database databases or search the web to answer a question.
* **Tool Definitions**:
  * `search_local_reference_library`: Searches the SQLAlchemy database for scales, chords, keys, and definitions.
  * `search_web`: Queries external search engines (Tavily, Serper, Brave, or DuckDuckGo fallback) for historical facts, biographies, or advanced theory concepts.
* **Dual Persona Configurations**:
  * **Practice Coach** (Practice page): Receives the JSON analysis report as system context to answer questions about the active score.
  * **Theory Scholar** (Theory page): Configured to answer general, open-ended music theory queries.
* **JSON Output Formatting**: System prompts enforce output as structured JSON containing a detailed Markdown response, follow-up questions, related concepts, and citations.

---

## 🗄️ Database Schema & Models

The application uses SQLAlchemy 2.0 to define a relational database schema supporting users, chats, sheet music sessions, and reference materials:

| Table Name | Model Name | Description | Key Relationships |
|:---|:---|:---|:---|
| `users` | `User` | User accounts, credentials, and session state. | Has many `TheoryTutorChat`, `PracticeSession` |
| `practice_sessions` | `PracticeSession` | Practice files, original metadata, and storage directories. | Belongs to `User`, has one `PracticeChat`, `AnalysisReport` |
| `analysis_reports` | `AnalysisReport` | Caches the compiled JSON analysis output from `music21`. | Belongs to `PracticeSession` |
| `practice_chats` | `PracticeChat` | Chat rooms tied to specific practice scores. | Belongs to `PracticeSession`, has many `PracticeMessage` |
| `practice_messages` | `PracticeMessage` | History of messages within a score-contextualized chat. | Belongs to `PracticeChat` |
| `theory_tutor_chats` | `TheoryTutorChat` | Independent general theory study chat rooms. | Belongs to `User`, has many `TheoryTutorMessage` |
| `theory_tutor_messages` | `TheoryTutorMessage` | Conversation logs for theory tutor chat rooms. | Belongs to `TheoryTutorChat` |
| `reference_sections` | `ReferenceSection` | Categorization headers for scales, chords, and definitions. | Has many `ReferenceEntry` |
| `reference_entries` | `ReferenceEntry` | Definitions, spelling formulas, and interval maps. | Belongs to `ReferenceSection` |

### 🔐 Authentication & Session Security
* **JWT Access & Refresh Tokens**: Tokens verify identity. Access tokens expire in 15 minutes, while refresh tokens expire in 7 days.
* **Automated Token Versioning**: The `users` table holds a `token_version`. During token parsing, if the version does not match, the session is invalidated. This enables instant logout/revocation of all active sessions.
* **Password Hashing**: Uses `argon2-cffi` / `bcrypt` to hash credentials securely.

---

## 🛠️ Complete Tech Stack

### Backend
* **Web Framework**: FastAPI (Python 3.10+)
* **Database & ORM**: SQLAlchemy 2.0 (SQLite for development, PostgreSQL in production)
* **Agent Framework**: LangChain (LangChain Core, LangChain OpenAI, LangGraph)
* **Music Analysis**: `music21`
* **OMR Engine**: Audiveris (Java-based Optical Music Recognition)
* **Audio Synthesis**: FluidSynth & GeneralUser SoundFont
* **Image/PDF Processing**: OpenCV (`opencv-python-headless`) & PyMuPDF (`fitz`)
* **Security & Auth**: `argon2-cffi`, `python-jose[cryptography]`, `bcrypt`
* **Validation**: Pydantic v2 & Pydantic Settings

### Frontend
* **Framework**: Next.js 16 (App Router, TypeScript)
* **UI Components**: `shadcn/ui` & Radix primitives
* **Styling & Theme**: Tailwind CSS 4.0 (Custom dark theme & custom glassmorphism)
* **Animations**: CSS custom keyframes & Tailwind Animate
* **Sheet Music Renderer**: OpenSheetMusicDisplay (OSMD)
* **AI & API State**: Axios & Vercel AI SDK
* **Icons**: Lucide React

---

## 🚀 Quick Setup & Installation

### Prerequisites
* **Python** (version 3.10 or higher)
* **Node.js** (version 18 or higher)
* **pnpm** (preferred) or **npm**
* **Java JRE/JDK** (Required for Audiveris OMR)
* **Audiveris OMR** (Required for PDF/Image processing: [Install Audiveris](https://github.com/Audiveris/audiveris))
* **FluidSynth** (Required for MIDI synthesis: [Install FluidSynth](https://github.com/FluidSynth/fluidsynth/releases))

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/CherishVasant/Treble-AI.git
cd Treble-AI
```

### Step 2: Configure the FastAPI Backend
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Initialize virtual environment and install dependencies:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate

   pip install -r requirements.txt
   ```
3. Set up environment variables by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Edit the `.env` file variables:
   * `DATABASE_URL`: Defaults to SQLite if left empty. For PostgreSQL, use `postgresql+psycopg://username:password@localhost:5432/dbname`.
   * `OPENROUTER_API_KEY`: Key for OpenRouter LLMs.
   * `OPENAI_API_KEY`: Key for OpenAI services.
   * (Optional) If `Audiveris` or `FluidSynth` are not in your system environment PATH, set their local binary paths (`AUDIVERIS_PATH` and `FLUIDSYNTH_PATH`) in `pipeline.py` or system variables.

---

### Step 3: Configure the Next.js Frontend
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install packages:
   ```bash
   pnpm install
   # Or using npm:
   npm install
   ```
3. Create the local environment file:
   ```bash
   cp .env.example .env.local
   ```
4. Configure variables in `.env.local` as needed (e.g., backend endpoints).

---

## 🏃 Running the Application

### Option A: Using Startup Scripts (Windows)
We provide launcher scripts at the root directory to boot both servers in parallel:
* **Batch Launcher**: Double-click `start.bat` or execute:
  ```cmd
  .\start.bat
  ```
* **PowerShell Launcher**: Run:
  ```powershell
  powershell -ExecutionPolicy Bypass -File start.ps1
  ```

### Option B: Manual Startup

1. **Start the FastAPI Backend**:
   ```bash
   cd backend
   # Ensure virtual environment is active
   python main.py
   ```
   The backend server starts at `http://localhost:8000`.

2. **Start the Next.js Frontend**:
   ```bash
   cd frontend
   pnpm dev
   # Or using npm
   npm run dev
   ```
   The web client starts at `http://localhost:3000`.

---

## 📁 Repository Directory Layout

```
Treble-AI/
├── backend/
│   ├── music/               # Custom music theory analysis engine (analysis.py)
│   ├── reference_data/      # Static data registry (formulas, fingerings, keys, spellings)
│   ├── routers/             # API routing (auth.py, chats.py, reference.py, theory.py)
│   ├── services/            # Core business logic (agent.py - LangChain tutor setup)
│   ├── soundfonts/          # GeneralUser-GS sf2 file for audio synthesis
│   ├── config.py            # Pydantic environment configuration
│   ├── database.py          # SQLAlchemy engine, session maker, and DB base model
│   ├── main.py              # Application entry point, lifespan, CORS, and root endpoints
│   ├── models.py            # SQLAlchemy database tables
│   ├── pipeline.py          # OMR, MusicXML parsing, MIDI conversion, and audio synthesis
│   ├── schemas.py           # Pydantic schemas for request/response serialization
│   ├── seed.py              # Reference library database seeding script
│   └── requirements.txt     # Python libraries list
├── frontend/
│   ├── app/                 # Next.js pages and API routes
│   │   ├── practical-practice/
│   │   ├── theory-assistant/
│   │   └── reference-library/
│   ├── components/          # Reusable React components (Player, OSMD Viewer, Chat, Uploader)
│   ├── context/             # AuthContext and ThemeContext React providers
│   ├── styles/              # Global styles and theme configs
│   ├── package.json         # Node.js dependencies configuration
│   └── tailwind.config.ts   # Tailwind theme setup
├── start.bat                # Windows quick launcher batch file
├── start.ps1                # Windows quick launcher PowerShell script
└── requirements.txt         # Root-level requirements redirect
```

---

## 📜 License
This project is licensed under the MIT License. Feel free to copy, modify, and distribute it.

*Built with ❤️ by [Cherish Vasant](https://github.com/CherishVasant)*