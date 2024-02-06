#!/bin/bash

# Pull changes from the Git repository
git pull

# Navigate to the client directory
cd client || exit

# Install dependencies
npm install

# Build
npm run build

# Send dist folder to the server directory
cp -r dist ../server

# Return to the parent directory
cd ..

# Navigate to the server directory
cd server || exit

# Install dependencies
npm install

# Restart all processes managed by PM2
pm2 restart all
