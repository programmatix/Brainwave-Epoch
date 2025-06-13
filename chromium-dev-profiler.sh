#!/bin/bash

# Start React DevTools standalone
npx react-devtools &
DEVTOOLS_PID=$!

# Wait a bit for devtools to start
sleep 2

# Start the React development server with devtools support in the background
REACT_APP_DEV_TOOLS=true npm start &
REACT_PID=$!

# Wait for the React server to be ready
npx wait-on http://127.0.0.1:3042

# Launch Chromium with app-like flags
chromium-browser --app=http://127.0.0.1:3042 --disable-web-security --allow-running-insecure-content --user-data-dir=/tmp/chromium-dev &
CHROMIUM_PID=$!

echo "React DevTools should be running in a separate window"
echo "Use the Profiler tab to analyze performance"

# Function to cleanup on exit
cleanup() {
    echo "Cleaning up..."
    kill $REACT_PID 2>/dev/null
    kill $CHROMIUM_PID 2>/dev/null
    kill $DEVTOOLS_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT TERM

# Wait for processes
wait $CHROMIUM_PID
cleanup