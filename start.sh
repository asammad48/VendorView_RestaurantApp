#!/bin/bash

echo "Starting React-only Restaurant Management System..."
echo "Removed all Node.js/Express server code"
echo "Using external APIs via generic repository pattern"

# Start Vite development server for React frontend only
cd client
npx vite --host 0.0.0.0 --port 5000