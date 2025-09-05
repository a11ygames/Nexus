# 🔐 LAN Chat - Private Encrypted Messaging

A secure, private chat application that works entirely on your local network with end-to-end encryption.

## ✨ Features

- **No accounts required** - Just pick a nickname
- **End-to-end encrypted** - Messages encrypted in browser before sending
- **LAN-only** - Works without internet, perfect for private networks
- **No message storage** - Server never saves your conversations
- **Real-time** - Instant messaging via WebSockets
- **Cross-platform** - Works on any device with a web browser

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Connect
- **On the host computer**: Open `http://localhost:3000`
- **On other devices**: Use the LAN IP addresses shown in the terminal (e.g., `http://192.168.1.42:3000`)

### 4. Chat Securely
1. Enter a nickname
2. Enter a shared passphrase (all users must use the same one)
3. Click "Connect" and start chatting!

## 🔒 Security

- Messages are encrypted with **AES-GCM** using the Web Crypto API
- Encryption keys are derived using **PBKDF2** with 100,000 iterations
- Server only sees encrypted data - never your actual messages
- No message history is stored anywhere

## 📱 Sharing with Friends

1. **Start the server** on one computer
2. **Share the LAN IP** with friends (shown when server starts)
3. **Share the passphrase** securely (in person, secure channel, etc.)
4. **Everyone connects** using the same passphrase

## ⚠️ Important Notes

- All users must be on the **same local network** (Wi-Fi/LAN)
- Everyone must use the **exact same passphrase** to decrypt messages
- Messages with wrong passphrases will show as "Unable to decrypt"
- **No internet required** - works completely offline

## 🛠 Technical Details

- **Backend**: Node.js + Express + WebSockets
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Encryption**: Web Crypto API (AES-GCM + PBKDF2)
- **No external dependencies** for crypto operations

---

**Enjoy secure, private conversations on your local network! 🎉**
