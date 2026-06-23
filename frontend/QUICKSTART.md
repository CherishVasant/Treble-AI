# TrebleAI Quick Start Guide

Get started with TrebleAI in 5 minutes!

## Installation (1 minute)

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# Start dev server
pnpm dev
```

Visit `http://localhost:3000` in your browser.

## Three Main Pages

### 1. **Practical Practice** (Default)
Learn by doing! Upload your sheet music and practice with AI guidance.

**How to use:**
1. Click the **"Select File"** button or drag a MusicXML/PDF file
2. Watch your sheet music appear in the viewer
3. Use the **Music Player** to control playback
4. Ask the **AI Chat** questions about what you're playing
5. Get personalized guidance and explanations

**Suggested Questions:**
- "What scale is this piece in?"
- "Explain the chord progression"
- "How can I improve this section?"

---

### 2. **Theory Assistant**
Full-screen AI chatbot dedicated to music theory learning.

**How to use:**
1. Navigate to **Theory Assistant** from the navbar
2. Click one of the suggested questions or type your own
3. Get detailed explanations from the AI music expert
4. Ask follow-up questions to deepen your understanding

**Topics You Can Ask About:**
- Scales (major, minor, modes, pentatonic, blues)
- Chords (triads, seventh chords, extensions, inversions)
- Harmony (progressions, voice leading, cadences)
- Intervals (identification, qualities, ear training)
- Rhythm and Time Signatures
- Music Notation and Symbols
- Classical Music Theory and Modern Applications

---

### 3. **Reference Library**
Quick reference for common scales, chords, and notes.

**How to use:**
1. Navigate to **Reference Library** from the navbar
2. Use the **Search Bar** to find scales, chords, or notes
3. Click **Category Buttons** to filter by type
4. Click any card to **expand and see:**
   - Formulas (interval patterns)
   - Notes (scale degrees or chord tones)
   - Descriptions and explanations

**Included References:**
- Major scales (C, G, D, and more)
- Minor scales (natural, harmonic, melodic)
- Common chords (major, minor, dominant, extended)
- Musical notes and chromatic scale

---

## Common Workflows

### Learning a New Scale
1. Go to **Reference Library**
2. Search for the scale (e.g., "A major")
3. View the notes and intervals
4. Ask in **Theory Assistant** how to practice it
5. Return to **Practical Practice** and upload exercises

### Understanding a Chord Progression
1. Upload your sheet music in **Practical Practice**
2. Open the **AI Chat**
3. Ask "What chords are in this piece?"
4. Get explanations for each chord
5. Go to **Reference Library** to review individual chords

### Improving Your Sight-Reading
1. Upload a new piece in **Practical Practice**
2. Practice slowly with the music player
3. Ask "What notes are in the first measure?"
4. Work through the piece measure by measure

### Exploring Music Theory Concepts
1. Go to **Theory Assistant**
2. Click "Explain different types of chords"
3. Follow up with questions about specific types
4. Visit **Reference Library** to see examples

---

## Tips & Tricks

### Keyboard Shortcuts
- **Enter** in chat: Send message
- **Shift+Enter** in chat: New line
- **Ctrl/Cmd+K**: Search reference library (when implemented)

### File Upload Tips
- **Format**: Use MusicXML (.musicxml) or PDF files
- **Size**: Keep files under 10MB for fast processing
- **Clarity**: High-quality PDFs work best

### Getting Better AI Responses
- **Be specific**: "How do I finger this E major scale?" vs "How to play scales?"
- **Provide context**: "In this 4/4 piece in D major..."
- **Ask progressively**: Start simple, then ask follow-up questions
- **Request examples**: "Can you give me an example of a ii-V-I progression?"

### Music Player Features
- **Speed Control**: Slow down fast passages (0.5x - 2x speed)
- **Volume**: Adjust to comfortable listening level
- **Progress Bar**: Skip to specific sections

---

## FAQ

**Q: Where do I get an OpenAI API key?**
A: Visit [platform.openai.com](https://platform.openai.com), sign up, go to API keys, and create a new key. Add it to `.env.local`.

**Q: What file formats are supported?**
A: MusicXML (.musicxml) and PDF files. Most music notation software can export to MusicXML.

**Q: Is my sheet music private?**
A: In development mode, files are processed locally. For production, implement proper privacy controls with your backend.

**Q: Can I use this offline?**
A: The app requires internet for AI chat. Sheet music viewing works without API calls once loaded.

**Q: How accurate is the AI?**
A: The AI is knowledgeable about music theory but should be verified. Always cross-reference with reliable music theory resources.

**Q: Can I upload multiple files?**
A: Yes! Upload new files anytime. The latest upload becomes active in the practice view.

**Q: Does this app teach instrument playing?**
A: This app focuses on theory and music literacy. Combine with method books or private lessons for instrument technique.

---

## What to Try First

1. **Test the AI Chat** (5 min)
   - Click a suggested question in Theory Assistant
   - Ask a follow-up question
   - See how the AI responds to different topics

2. **Explore the Reference Library** (3 min)
   - Search for "C major"
   - Click the card to expand it
   - Browse other scales and chords

3. **Try Sheet Music Upload** (5 min)
   - Find a simple MusicXML file or create one
   - Upload to Practical Practice
   - View in the sheet music viewer
   - Ask the AI about what you uploaded

4. **Full Learning Session** (15-30 min)
   - Upload a piece you want to learn
   - Use the music player to follow along
   - Ask the AI about theory concepts
   - Reference the library for specific scales/chords
   - Practice different sections with speed control

---

## Next Steps

- **Learn More**: Check [README.md](./README.md) for full documentation
- **Customize**: Modify colors and settings in `tailwind.config.ts`
- **Extend**: Add features in `/components` and `/app/api`
- **Deploy**: Push to GitHub and deploy to Vercel
- **Integrate Database**: Add user accounts and progress tracking

---

## Keyboard Shortcuts (Future)

These shortcuts will be available in future versions:

- **Ctrl/Cmd + U**: Upload sheet music
- **Ctrl/Cmd + L**: Go to Library
- **Ctrl/Cmd + T**: Go to Theory Assistant
- **Ctrl/Cmd + P**: Go to Practice
- **?**: Show help

---

## Feedback & Support

- **Having issues?** Check [SETUP.md](./SETUP.md) troubleshooting section
- **Want to contribute?** Submit improvements via GitHub
- **Found a bug?** Open an issue with details

---

Enjoy learning music theory with TrebleAI! 🎵

---

**Version**: 1.0.0  
**Last Updated**: May 2024  
**Status**: Production Ready
