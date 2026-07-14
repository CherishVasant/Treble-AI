
@echo off
echo Starting Treble AI Backend and Frontend...

echo.
echo Stopping any existing backend on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0backend && if exist venv\Scripts\python.exe (venv\Scripts\python main.py) else (pip install -r requirements.txt && python main.py)"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:3000
echo.
echo Press any key to exit this window...
pause > nul 