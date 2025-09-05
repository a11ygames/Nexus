const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients organized by chatroom
const chatrooms = new Map(); // Map<roomId, Set<WebSocket>>
const clientRooms = new Map(); // Map<WebSocket, roomId>

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('New client connected from:', req.connection.remoteAddress);
  
  // Client will be added to a chatroom when they send a join message
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Validate message structure
      if (!message.type || !message.nick) {
        console.log('Invalid message format received');
        return;
      }
      
      // Handle join messages to assign client to chatroom
      if (message.type === 'join') {
        if (!message.roomId) {
          console.log('Join message missing roomId');
          return;
        }
        
        // Add client to the specified chatroom
        const roomId = message.roomId;
        
        // Remove client from previous room if they were in one
        const oldRoomId = clientRooms.get(ws);
        if (oldRoomId && chatrooms.has(oldRoomId)) {
          chatrooms.get(oldRoomId).delete(ws);
          if (chatrooms.get(oldRoomId).size === 0) {
            chatrooms.delete(oldRoomId);
          }
        }
        
        // Add to new room
        if (!chatrooms.has(roomId)) {
          chatrooms.set(roomId, new Set());
        }
        chatrooms.get(roomId).add(ws);
        clientRooms.set(ws, roomId);
        
        console.log(`Client ${message.nick} joined room ${roomId.substring(0, 8)}... (${chatrooms.get(roomId).size} users in room)`);
        return;
      }
      
      // For chat messages, only broadcast to clients in the same room
      const clientRoomId = clientRooms.get(ws);
      if (!clientRoomId) {
        console.log('Client not in any room, ignoring message');
        return;
      }
      
      console.log(`Relaying ${message.type} message from ${message.nick} in room ${clientRoomId.substring(0, 8)}...`);
      
      // Broadcast to clients in the same chatroom only
      const messageStr = JSON.stringify(message);
      const roomClients = chatrooms.get(clientRoomId);
      if (roomClients) {
        roomClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
          }
        });
      }
      
    } catch (error) {
      console.error('Error processing message:', error.message);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    // Remove client from their chatroom
    const roomId = clientRooms.get(ws);
    if (roomId && chatrooms.has(roomId)) {
      chatrooms.get(roomId).delete(ws);
      if (chatrooms.get(roomId).size === 0) {
        chatrooms.delete(roomId);
        console.log(`Room ${roomId.substring(0, 8)}... is now empty and removed`);
      } else {
        console.log(`Client disconnected from room ${roomId.substring(0, 8)}... (${chatrooms.get(roomId).size} users remaining)`);
      }
    }
    clientRooms.delete(ws);
    
    const totalClients = Array.from(chatrooms.values()).reduce((sum, room) => sum + room.size, 0);
    console.log(`Total active clients: ${totalClients}`);
  });
  
  // Handle connection errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    
    // Remove client from their chatroom
    const roomId = clientRooms.get(ws);
    if (roomId && chatrooms.has(roomId)) {
      chatrooms.get(roomId).delete(ws);
      if (chatrooms.get(roomId).size === 0) {
        chatrooms.delete(roomId);
      }
    }
    clientRooms.delete(ws);
  });
});

// Get local IP addresses for easy connection sharing
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  
  console.log('\n🚀 Nexus Chat Server Started!');
  console.log('===============================');
  console.log(`Local: http://localhost:${PORT}`);
  
  if (localIPs.length > 0) {
    console.log('\nLAN Access URLs:');
    localIPs.forEach(ip => {
      console.log(`  http://${ip}:${PORT}`);
    });
    console.log('\nShare these URLs with friends on your network!');
  }
  
  console.log('\n📝 Instructions:');
  console.log('1. Open any URL above in a web browser');
  console.log('2. Enter a nickname and shared passphrase');
  console.log('3. Start chatting securely!');
  console.log('\n⚠️  Remember: Messages are end-to-end encrypted and never stored on the server.');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
