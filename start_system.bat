@echo off
echo 🛡️  Starting PhishingShield Ecosystem...
echo -------------------------------------

REM 1. Enter Server Directory
cd server

REM 2. Check for dependencies & Install if missing
if not exist node_modules (
    echo 📦 Dependencies missing. Installing now...
    echo    (This may take a minute for the first run)
    call npm install
    echo ✅ Dependencies installed!
)

REM 3. Wake up the Global Server (Cloud)
echo 🌍 Connecting to Global Cloud Server...
curl -I https://phishingshield.onrender.com/api/reports >nul 2>&1
if %errorlevel% equ 0 (
  echo ✅ Global Server is ONLINE and Ready.
) else (
  echo ⚠️  Global Server might be sleeping. Waking it up...
  curl -s -o nul https://phishingshield.onrender.com/api/reports
)

REM 4. Start the Local Server
echo -------------------------------------
echo 💻 Starting Local Server (localhost:3000)...
echo    All bans ^& XP will be synced to Global Cloud.
echo -------------------------------------

REM Check if port 3000 is in use and kill it
echo 🧹 Cleaning up port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

REM Start Keep-Alive in background (minimized new window)
echo 💓 Starting Global Keep-Alive Daemon...
start "PhishingShield Keep-Alive" /MIN node keep-alive.js

REM Start Main Server
npm start
pause
