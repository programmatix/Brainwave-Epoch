#!/bin/bash

# Common paths where React DevTools extension might be installed
REACT_DEVTOOLS_PATHS=(
    "$HOME/.config/chromium/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi"
    "$HOME/.config/google-chrome/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi"
    "$HOME/snap/chromium/common/chromium/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi"
)

# Find React DevTools extension
EXTENSION_PATH=""
for path in "${REACT_DEVTOOLS_PATHS[@]}"; do
    if [ -d "$path" ]; then
        # Find the latest version
        LATEST_VERSION=$(ls -1 "$path" | sort -V | tail -n 1)
        if [ -n "$LATEST_VERSION" ]; then
            EXTENSION_PATH="$path/$LATEST_VERSION"
            echo "Found React DevTools at: $EXTENSION_PATH"
            break
        fi
    fi
done

# Start the React development server in the background
npm start &
REACT_PID=$!

# Wait for the React server to be ready
npx wait-on http://127.0.0.1:3042

# Launch Chromium with DevTools and extension
if [ -n "$EXTENSION_PATH" ]; then
    echo "Loading React DevTools extension..."
    chromium-browser \
        --new-window \
        --auto-open-devtools-for-tabs \
        --load-extension="$EXTENSION_PATH" \
        --disable-web-security \
        --allow-running-insecure-content \
        --user-data-dir=/tmp/chromium-dev \
        http://127.0.0.1:3042 &
else
    echo "React DevTools extension not found. Please install it first."
    echo "Run: ./install-react-devtools.sh for instructions"
    chromium-browser \
        --new-window \
        --auto-open-devtools-for-tabs \
        --disable-web-security \
        --allow-running-insecure-content \
        --user-data-dir=/tmp/chromium-dev \
        http://127.0.0.1:3042 &
fi
CHROMIUM_PID=$!

echo "Chrome DevTools should open automatically"
echo "If React DevTools is installed, you'll see ⚛️ Components and ⚛️ Profiler tabs"

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