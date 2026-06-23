# TrebleAI - AI-Powered Music Theory Learning Platform

A modern, full-featured music theory and practice application built with Next.js, React, and AI integration. TrebleAI helps musicians learn music theory, practice with sheet music, and get personalized guidance from an AI music theory expert.

## Features

### 🎵 Practical Practice Page
- **Sheet Music Upload**: Drag-and-drop interface to upload MusicXML and PDF files
- **Music Player**: Control playback with adjustable speed and volume
- **Sheet Music Viewer**: Integrated OSMD (OpenSheetMusicDisplay) for rendering sheet music
- **AI Chat Assistant**: Get real-time guidance about your sheet music and music theory concepts

### 🎓 Theory Assistant Page
- **Full-Screen Chat Interface**: Dedicated space for music theory questions
- **AI Expert Guidance**: Ask anything about scales, chords, harmony, intervals, and more
- **Suggested Prompts**: Quick-start questions for learning
- **Conversation History**: Review previous discussions

### 📚 Reference Library
- **Searchable Database**: Find scales, chords, and notes easily
- **Detailed Cards**: Expand cards to see formulas, intervals, and notes
- **Category Filtering**: Filter by scales, chords, or notes
- **Interactive Learning**: Learn music theory fundamentals

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **UI Components**: shadcn/ui with Tailwind CSS
- **Styling**: Tailwind CSS with custom dark theme
- **Sheet Music**: OpenSheetMusicDisplay (OSMD)
- **AI Integration**: Vercel AI SDK with OpenAI GPT-4 Turbo
- **Animations**: CSS/Tailwind animations
- **Icons**: Lucide React

## Project Structure

```
app/
├── layout.tsx                 # Root layout with navbar
├── page.tsx                   # Home page (redirects to practice)
├── practical-practice/
│   └── page.tsx              # Main practice interface
├── theory-assistant/
│   └── page.tsx              # Full-screen chat for theory
├── reference-library/
│   └── page.tsx              # Searchable reference library
└── api/
    ├── chat/route.ts          # AI chat endpoint
    ├── upload/route.ts        # File upload endpoint
    └── process-sheet/route.ts # Sheet music processing

components/
├── navbar.tsx                 # Navigation bar
├── ai-chat.tsx               # Reusable chat component
├── sheet-music-viewer.tsx    # OSMD integration
├── sheet-music-uploader.tsx  # File upload UI
├── music-player.tsx          # Audio player
└── reference-card.tsx        # Reference library cards

lib/
├── utils.ts                  # Utility functions
└── constants.ts              # App constants

styles/
├── globals.css               # Global styles and theme
└── animations.css            # Custom animations
```

## Getting Started

### Installation

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# .env.local
OPENAI_API_KEY=your_openai_api_key
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key for GPT-4 Turbo access

## API Endpoints

### POST /api/chat
Send messages to the AI music theory assistant.

**Request:**
```json
{
  "message": "What is a C major scale?",
  "context": "Current sheet music information",
  "systemPrompt": "You are a music theory expert",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "response": "The C major scale consists of...",
  "success": true
}
```

### POST /api/upload
Upload sheet music files (MusicXML or PDF).

**Request:** Form data with `file` field

**Response:**
```json
{
  "fileId": "file_1234567890",
  "message": "File uploaded successfully",
  "file": {
    "id": "file_1234567890",
    "name": "my_song.musicxml",
    "size": 1024,
    "type": "application/xml",
    "uploadedAt": "2024-05-14T10:00:00Z"
  }
}
```

### POST /api/process-sheet
Process uploaded sheet music and extract metadata.

**Request:**
```json
{
  "fileId": "file_1234567890"
}
```

**Response:**
```json
{
  "fileId": "file_1234567890",
  "metadata": {
    "title": "Sheet Music Title",
    "composer": "John Doe",
    "timeSignature": "4/4",
    "tempo": 120,
    "key": "C Major",
    "duration": 180,
    "pages": 2
  },
  "xmlData": "<?xml version=\"1.0\"?>...",
  "audioUrl": null,
  "message": "Sheet music processed successfully"
}
```

## Design System

### Color Palette
- **Background**: Deep dark navy (`hsl(240 10% 8%)`)
- **Foreground**: Almost white (`hsl(0 0% 98%)`)
- **Primary**: Vibrant blue (`hsl(220 90% 56%)`)
- **Secondary**: Purple (`hsl(270 80% 60%)`)
- **Accent**: Bright purple (`hsl(270 100% 65%)`)

### Animations
- **fade-in**: Smooth fade in effect
- **slide-up**: Slide up with fade
- **glow-pulse**: Glowing pulsing effect
- **float**: Subtle floating animation

### Components
- Glass effect cards with backdrop blur
- Glow effects on interactive elements
- Smooth transitions and hover states
- Responsive grid layouts

## Key Features

### AI Integration
- Real-time AI responses using Vercel AI SDK
- Context-aware music theory guidance
- Support for multi-turn conversations
- Music theory optimized system prompts

### Sheet Music Processing
- Drag-and-drop file upload
- Support for MusicXML and PDF formats
- Metadata extraction (tempo, time signature, key, etc.)
- OSMD rendering for visualization

### Interactive Learning
- Expandable reference cards
- Searchable music theory database
- Category-based filtering
- Real-time AI guidance

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Optimized for fast load times with Next.js
- Lazy-loaded OSMD library
- Efficient CSS animations using Tailwind
- Client-side chat history management
- Background file processing with API routes

## Security

- Server-side API key management
- Client-side form validation
- File type and size validation on upload
- CORS-safe API endpoints
- XSS protection through React

## Future Enhancements

- Real file storage with Vercel Blob or AWS S3
- Database integration for user accounts and progress tracking
- Sheet music analysis with music21
- Audio synthesis for playback
- Social features for collaboration
- Mobile app version
- Offline mode with service workers

## Contributing

This is a demonstration project built with v0. To extend or modify:

1. Update components in `/components`
2. Add new pages in `/app`
3. Extend API routes in `/app/api`
4. Modify styling in `/app/globals.css` or `tailwind.config.ts`

## License

MIT

## Support

For questions or issues, please refer to the documentation or reach out through the support channels.

---

Built with ❤️ using Next.js, React, and AI technology.
