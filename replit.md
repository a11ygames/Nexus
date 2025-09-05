# Nexus - LAN Chat Application

## Overview
Nexus is a secure, private LAN chat application with end-to-end encryption. It allows users to communicate securely over a local network without requiring accounts or storing messages on the server.

## Current Status
- ✅ Project successfully imported and configured for Replit
- ✅ Server running on port 5000 with proper host binding
- ✅ Dependencies installed (express, ws)
- ✅ Workflow configured: "Nexus Chat Server" running `npm start`
- ✅ Deployment configured for VM (always-running) target

## Project Architecture
- **Backend**: Node.js with Express and WebSocket (ws library)
- **Frontend**: Vanilla HTML/CSS/JavaScript with Web Crypto API
- **Security**: End-to-end encryption using AES-GCM + PBKDF2
- **Communication**: Real-time messaging via WebSockets

## Key Features
- No accounts required - just nickname and shared passphrase
- End-to-end encrypted messages (AES-GCM encryption)
- LAN-only operation (works without internet)
- No message storage on server
- Real-time communication
- Cross-platform web interface

## Configuration
- Server port: 5000 (configured for Replit)
- Host binding: 0.0.0.0 (allows Replit proxy access)
- Deployment: VM target for always-running server

## Usage
1. Users enter a nickname and shared passphrase
2. All users must use the same passphrase to decrypt messages
3. Messages are encrypted client-side before sending to server
4. Server relays encrypted messages without storing them

## Files Structure
- `server.js` - Main server file with WebSocket handling
- `public/` - Frontend static files
  - `index.html` - Main chat interface
  - `chat-app.js` - Chat functionality and WebSocket client
  - `crypto-utils.js` - Encryption/decryption utilities
  - `style.css` - Application styling
- `package.json` - Project dependencies and scripts

## Recent Changes
- Modified server to run on port 5000 and bind to 0.0.0.0 for Replit compatibility
- Set up workflow for easy development and testing
- Configured deployment for production use
