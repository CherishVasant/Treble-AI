# Treble AI

Solo project (AI-assisted development).

## Overview
Treble AI is a full-stack music practice application. A user uploads a photo, scan, or PDF of sheet music; the backend runs it through an optical music recognition (OMR) pipeline to produce MusicXML, converts that to MIDI and then to a synthesized WAV audio file, and runs a deterministic music-theory analysis pass over the score. The frontend renders the sheet music, plays the synthesized audio, and highlights the currently-sounding note on an interactive on-screen piano keyboard in sync with playback. The app also includes an LLM-backed practice assistant scoped to the loaded piece, a general music-theory Q&A assistant, and a reference library of scales/chords/theory concepts with interactive audio playback and piano visualization. Authentication is handled with JWT-based sessions.

## System architecture
- **Backend**: Python, FastAPI (`backend/main.py`), SQLAlchemy ORM against a PostgreSQL database (`backend/database.py`, `backend/models.py`), routers split by domain (`routers/auth.py`, `routers/theory.py`, `routers/chats.py`, `routers/reference.py`).
- **Frontend**: Next.js 16 (App Router) with React 19 and TypeScript, styled with Tailwind CSS and Radix UI/shadcn-style components. Pages include `practice-studio`, `music-library`, `theory-tutor`, and `login`.
- **Frontend-to-backend communication**: Next.js API routes (`app/api/**/route.ts`) act as thin proxies (`lib/backend-proxy`) forwarding requests to the FastAPI backend rather than talking to a database or model provider directly.
- **Persistence**: SQLAlchemy models for `User`, `PracticeSession`, `PracticeChat`/`PracticeMessage`, `TheoryTutorChat`/`TheoryTutorMessage`, `AnalysisReport`, and a `ReferenceSection`/`ReferenceEntry` pair backing the reference library. Per-upload artifacts (original file, generated MusicXML, MIDI, WAV, analysis JSON) are stored on disk under `backend/uploads/<session-uuid>/`.
- **Auth**: Custom JWT auth (`routers/auth.py`) — Argon2 password hashing, short-lived access tokens plus longer-lived refresh tokens with a `token_version` field for global logout/revocation, tokens delivered as httpOnly cookies, and a simple in-memory login rate limiter (5 failed attempts triggers a 5-minute lockout per username+IP).

## Core pipeline: sheet music to audio
Implemented in `backend/pipeline.py`, run as a FastAPI background task with a `status.json` file per job used for progress polling from the frontend. Verified step order and libraries:
1. **Image/PDF pre-processing** (`backend/enhance_quality.py`) — OpenCV (`opencv-python-headless`) and PyMuPDF (`fitz`) are used to upscale, denoise, and contrast-enhance the input image (or rasterize a PDF page) before OMR, to improve recognition accuracy.
2. **Optical music recognition** — the enhanced image is passed to **Audiveris**, an external OMR application invoked as a subprocess (`Audiveris.exe -batch -export`), which produces a MusicXML (`.mxl`) file. This is a desktop tool dependency, not a Python OMR library.
3. **MusicXML → MIDI** — `music21` (`converter.parse` + `score.write("midi", ...)`) converts the recognized MusicXML into a MIDI file.
4. **MIDI → audio** — **FluidSynth** (external binary, invoked via subprocess) renders the MIDI file to a WAV file using a bundled SoundFont (`GeneralUser-GS.sf2`).
5. **Music analysis** — `backend/music/analysis.py` uses `music21` to run a deterministic (non-LLM) analysis pass over the score: key/mode detection and modulation tracking, chord and Roman-numeral analysis (matched against a hand-written chord-formula table with a music21 fallback), cadence detection, melodic interval statistics, rhythm/syncopation/tuplet analysis, phrase-boundary and repeated-motif detection, a heuristic difficulty score (1–10) with contributing factors, fingering suggestions, register/contour analysis, diatonicity percentage, and parallel-fifths/octaves voice-leading error detection. Results are cached to `analysis_report.json` and to the `AnalysisReport` table.

Note-level timing for playback sync is derived separately via `music21`'s `secondsMap`, producing a flat list of `{start, duration, midi}` events plus a per-measure `measures_map` (start/end seconds), both exposed through `/result/{job_id}/musical-info`.

## AI agents
Agent logic lives in `backend/services/agent.py` as a single `AgentService.run_agent()` function built on LangChain (`langchain-core`, `langchain-openai`'s `ChatOpenAI` client bound to tools). Both assistants below are two prompt/tool configurations of this one function, selected by a `chat_type` parameter, sharing the same manual tool-calling loop (bind tools → invoke → execute any requested tool calls → append `ToolMessage`s → re-invoke, up to 5 turns) and the same two tools: a local reference-library search tool (`search_local_reference_library`, querying the seeded `ReferenceSection`/`ReferenceEntry` tables) and a web-search tool (`search_web`) with a provider-fallback chain across several third-party search APIs. `[UNVERIFIED - check manually]` — the `langgraph` package is imported in this file (`StateGraph`, `END`) but is not actually used to build a graph; the real control flow is the hand-written loop described above, not a LangGraph state machine.

Both the practice and theory chat endpoints require the model to return a structured JSON object (`response`, `suggested_follow_up_questions`, `related_concepts`, `citations`), which the backend parses with a JSON-repair/regex fallback if the model doesn't return clean JSON.

### Practice Coach agent
Selected via `chat_type: "practice"` (`routers/theory.py` → `AgentService.run_agent`). Before invoking the model, the backend loads the cached `AnalysisReport` for the active `PracticeSession` from the database and injects it into the system context as structured text: key signature, time signature, tempo, chord list, Roman-numeral progression, cadences, interval statistics, rhythm analysis, phrase boundaries, motifs, difficulty score/factors, and fingering suggestions. The agent uses this to answer questions about the loaded piece and give practice guidance grounded in that deterministic analysis. `[UNVERIFIED - check manually]` — the claim that this agent can itself "play or demonstrate" a difficult passage was not confirmed in code: there is no tool or endpoint through which the agent triggers audio playback, seeks the player, or highlights a passage on the sheet music/keyboard. Audio playback and note-highlighting are driven independently by the frontend's playback-time state (see Frontend & interactivity), not by an agent action.

### Theory Scholar agent
Selected via `chat_type: "theory"` (default), used on the `/theory-tutor` page for general, piece-independent music theory Q&A. Same execution engine and tools as the Practice Coach, but with a general-purpose system prompt (no active-score context injected) and its own persisted chat history (`TheoryTutorChat`/`TheoryTutorMessage`). Chat titles are auto-generated after the second user message via a separate LLM call (`routers/theory.py:generate_llm_title`).

## Frontend & interactivity
- **Sheet music rendering**: `components/sheet-music-viewer.tsx` renders the generated MusicXML using the `opensheetmusicdisplay` library and drives its built-in cursor. The component works around two library rendering bugs (cursor `z-index` and post-`cursor.next()` height collapse) with a `forceCursorVisible` helper. The cursor position is recalculated on every `currentTime` update by locating the current measure in `measures_map` and incrementally advancing the OSMD cursor iterator to the matching timestamp — i.e., continuous note-level cursor tracking synced to audio playback time, not just per-measure jumps.
- **Piano keyboard sync**: `components/piano-keyboard.tsx` renders a 3-octave (C3–C6) on-screen keyboard. In `practice-studio`, `activeMidiNotes` is derived (`useMemo`) from the same note-event list (`{start, duration, midi}`) used for sheet-music cursor sync, filtered to notes whose `[start, start+duration)` window contains the current playback `currentTime`. Both the sheet-music cursor and the piano keyboard are therefore driven off the same shared `currentTime` state, keeping them in sync with each other and with audio playback.
- **Music library** (`app/music-library/page.tsx`, `components/reference-card.tsx`): browsable catalog of scales, modes, chords, arpeggios, intervals, and theory/notation topics (circle of fifths, key signatures, cadences, voice leading, etc.), backed by the `reference_sections`/`reference_entries` database tables plus a static `SCALES_REGISTRY` data file on the frontend. Scale/chord/mode/arpeggio cards render a custom 1.5-octave virtual piano keyboard (separate implementation from `piano-keyboard.tsx`) showing the scale's notes. Clicking Play requests synthesized audio from the backend (`GET /reference/scale-audio` → `music21` builds a short MIDI sequence from the note list → FluidSynth renders it to WAV, cached on disk by an MD5 hash of the note list) and, via the audio element's `timeupdate` event, estimates the currently-sounding note (fixed ~0.4s per note) to highlight the matching key on the virtual keyboard. A separate feature (Circle of Fifths interval/scale playback) uses the same synthesized-audio approach.
- **Upload flow**: `components/sheet-music-uploader.tsx` posts the file to `POST /process`, then polls `GET /result/{job_id}/status` for OMR/MusicXML/MIDI/audio/analysis step status until completion.
- **State management**: React Context (`context/chat-context.tsx`) holds practice sessions and theory chats client-side and synchronizes them with the backend.

## Tech stack
**Backend (Python, from `backend/requirements.txt` and imports):**
- FastAPI, Uvicorn, python-multipart
- SQLAlchemy 2.x, psycopg (PostgreSQL driver), Pydantic / pydantic-settings
- LangChain (`langchain`, `langchain-core`, `langchain-openai`) for the tool-calling agent loop; `langgraph` is a declared dependency but unused in the actual control flow (see AI agents section)
- music21 (music representation, MusicXML/MIDI conversion, deterministic music analysis)
- OpenCV (`opencv-python-headless`), PyMuPDF (`pymupdf`/`fitz`) for pre-OMR image/PDF enhancement
- argon2-cffi (password hashing), python-jose (JWT)
- External subprocess dependencies: Audiveris (OMR engine), FluidSynth (MIDI-to-audio synthesis) with a GeneralUser GS SoundFont

**Frontend (TypeScript, from `frontend/package.json` and imports):**
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, Radix UI primitives, shadcn/ui-style component set, `lucide-react` icons
- `opensheetmusicdisplay` for MusicXML rendering
- `react-hook-form` + `zod`, `react-markdown` + `remark-gfm`, `recharts`, `axios`, `sonner` (toasts)
- React Context for client-side session/chat state

**Data/analysis:** deterministic (non-LLM) music-theory computation via music21 — key/modulation detection, chord/Roman-numeral analysis, cadence detection, melodic interval and rhythm statistics, phrase/motif detection, heuristic difficulty scoring, fingering suggestion, register/contour analysis, diatonicity ratio, and parallel-fifths/octaves detection (`backend/music/analysis.py`).

## Notable technical challenges
- Working around `opensheetmusicdisplay` cursor rendering bugs (negative default z-index hiding the cursor, and the cursor element collapsing to 1px in height after `cursor.next()`), handled with a custom `forceCursorVisible` fix-up applied after every cursor operation (`components/sheet-music-viewer.tsx`).
- Building continuous, sub-measure playback-to-notation sync by incrementally advancing the OSMD cursor iterator to match fractional-measure timestamps computed from tempo and `measures_map`, rather than only snapping to measure boundaries.
- Chaining three independent external processes (image enhancement → Audiveris OMR → music21 MIDI conversion → FluidSynth synthesis) into a single background job with per-step status tracking and cached, on-the-fly-regeneratable analysis reports, including a heuristic, human-readable error translator for common Audiveris failure modes (`_friendly_audiveris_error` in `backend/pipeline.py`).

## Quantifiable scope
- Backend: 32 Python files, ~5,100 lines of code (excluding virtualenv and bytecode caches).
- Frontend: 98 TypeScript/TSX files, ~16,200 lines of code (excluding `node_modules` and build output) — of which `app/` (pages, API routes) is ~2,800 lines and hand-written `components/` (excluding the generated shadcn `ui/` primitives) is ~4,800 lines.
- 7 SQLAlchemy models spanning auth, practice sessions/chat, theory chat, analysis-report caching, and the reference library.
- Single git author across the repository's history (13 commits, August 2025 – July 2026), consistent with this being a solo, AI-assisted build.
