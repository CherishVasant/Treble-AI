# Treble AI - Musical Terms Chatbot

A web application that helps users understand musical terms and concepts using AI-powered search and a vector database.

## Features

- 🤖 AI-powered musical term definitions using Google Gemini
- 🔍 Web search integration with Tavily
- 📚 Wikipedia integration for comprehensive explanations
- 💾 Vector database storage for quick retrieval
- 🎨 Modern React frontend with beautiful UI
- 📱 Responsive design
- 🔄 Real-time chat interface
- 📖 Search history and glossary

## Prerequisites

- Python 3.8+
- Node.js 18+
- npm or yarn

## Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd TrebleAI
```

### 2. Set up Python environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Set up environment variables
Create a `.env` file in the backend directory with your API keys:
```env
GOOGLE_API_KEY=your_google_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

### 4. Set up frontend
```bash
cd frontend
npm install
```

## Running the Application

### Option 1: Using the startup script (Windows)
```bash
# Run the batch file
start.bat

# Or run the PowerShell script
powershell -ExecutionPolicy Bypass -File start.ps1
```

### Option 2: Manual startup

#### Start the backend server:
```bash
cd backend
python main.py
```
The backend will be available at: http://localhost:8000

#### Start the frontend server (in a new terminal):
```bash
cd frontend
npm run dev
```
The frontend will be available at: http://localhost:3000

## API Endpoints

- `GET /` - Root endpoint
- `POST /chat` - Main chat endpoint
- `GET /health` - Health check
- `GET /search-history` - Get search history
- `DELETE /clear-memory` - Clear conversation memory

## Usage

1. Open your browser and navigate to http://localhost:3000
2. Start chatting with Treble AI about musical terms
3. Ask questions like:
   - "What is a diminished chord?"
   - "Define arpeggio"
   - "What does legato mean?"
4. View your search history in the left sidebar
5. Use the suggestions sidebar for quick queries

## Architecture

- **Frontend**: Next.js with TypeScript, Tailwind CSS
- **Backend**: FastAPI with Python
- **AI**: Google Gemini via LangChain
- **Vector Database**: ChromaDB
- **Search**: Tavily and Wikipedia APIs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 