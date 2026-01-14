#!/bin/bash
echo "🛡️  Starting PhishingShield Ecosystem..."
echo "-------------------------------------"

# 1. Wake up the Global Server (Cloud)
echo "🌍 Connecting to Global Cloud Server..."
status_code=$(curl --write-out %{http_code} --silent --output /dev/null https://phishingshield.onrender.com/api/reports)

if [[ "$status_code" -eq 200 ]] ; then
  echo "✅ Global Server is ONLINE and Ready."
else
  echo "⚠️  Global Server might be sleeping or unreachable (Status: $status_code). Trying to wake it up..."
  curl -s -o /dev/null https://phishingshield.onrender.com/api/reports
fi

# 2. Start the Local Server
echo "-------------------------------------"
echo "💻 Starting Local Server (localhost:3000)..."
echo "   All bans & XP will be synced to Global Cloud."
echo "-------------------------------------"

cd server

# Start Keep-Alive in background
echo "💓 Starting Global Keep-Alive Daemon..."
node keep-alive.js &

npm start
