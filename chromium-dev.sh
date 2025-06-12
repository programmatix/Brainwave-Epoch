#!/bin/bash

# Start the React development server in the background
npm start &
REACT_PID=$!

# Wait for the React server to be ready
npx wait-on http://127.0.0.1:3042

# Launch Chromium with app-like flags
chromium-browser --app=http://127.0.0.1:3042 --disable-web-security --allow-running-insecure-content --user-data-dir=/tmp/chromium-dev &
CHROMIUM_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "Cleaning up..."
    kill $REACT_PID 2>/dev/null
    kill $CHROMIUM_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT TERM

# Wait for processes
wait $CHROMIUM_PID
cleanup