// Main chat application logic

class ChatApp {
    constructor() {
        this.socket = null;
        this.nickname = '';
        this.passphrase = '';
        this.connected = false;
        this.crypto = new CryptoUtils();
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Connection panel elements
        this.connectionPanel = document.getElementById('connection-panel');
        this.chatPanel = document.getElementById('chat-panel');
        this.nicknameInput = document.getElementById('nickname');
        this.passphraseInput = document.getElementById('passphrase');
        this.connectBtn = document.getElementById('connect-btn');
        
        // TOS modal elements
        this.tosModal = document.getElementById('tos-modal');
        this.agreeTosBtn = document.getElementById('agree-tos');
        this.declineTosBtn = document.getElementById('decline-tos');
        
        // Chat panel elements
        this.disconnectBtn = document.getElementById('disconnect-btn');
        this.currentNicknameSpan = document.getElementById('current-nickname');
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.statusText = document.getElementById('status-text');
    }

    bindEvents() {
        // Connection events
        this.connectBtn.addEventListener('click', () => this.showTermsOfService());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        
        // TOS events
        this.agreeTosBtn.addEventListener('click', () => this.acceptTermsAndConnect());
        this.declineTosBtn.addEventListener('click', () => this.hideTermsOfService());
        
        // Message events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Form submission prevention
        this.passphraseInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.connect();
            }
        });
        
        this.nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.passphraseInput.focus();
            }
        });
    }

    showTermsOfService() {
        const nickname = this.nicknameInput.value.trim();
        const passphrase = this.passphraseInput.value;

        if (!nickname) {
            this.showStatus('Please enter a nickname', 'error');
            this.nicknameInput.focus();
            return;
        }

        if (!passphrase) {
            this.showStatus('Please enter a passphrase', 'error');
            this.passphraseInput.focus();
            return;
        }

        // Store the values for later use
        this.nickname = nickname;
        this.passphrase = passphrase;
        
        // Show the TOS modal
        this.tosModal.classList.remove('hidden');
    }

    hideTermsOfService() {
        this.tosModal.classList.add('hidden');
    }

    acceptTermsAndConnect() {
        this.hideTermsOfService();
        this.connect();
    }

    async connect() {
        // Use stored values from TOS acceptance
        const nickname = this.nickname;
        const passphrase = this.passphrase;

        if (nickname.length > 20) {
            this.showStatus('Nickname must be 20 characters or less', 'error');
            return;
        }

        this.setConnecting(true);

        try {
            await this.establishConnection(nickname, passphrase);
        } catch (error) {
            this.setConnecting(false);
            this.showStatus('Connection failed: ' + error.message, 'error');
        }
    }

    async establishConnection(nickname, passphrase) {
        return new Promise((resolve, reject) => {
            // Determine WebSocket URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;

            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = async () => {
                try {
                    this.nickname = nickname;
                    this.passphrase = passphrase;
                    this.connected = true;
                    
                    // Create room ID from passphrase
                    const roomId = await this.crypto.createRoomId(passphrase);
                    
                    // Send join message to server with room ID
                    const joinMessage = {
                        type: 'join',
                        nick: nickname,
                        roomId: roomId
                    };
                    this.socket.send(JSON.stringify(joinMessage));
                    
                    this.switchToChat();
                    this.showStatus('Connected securely', 'success');
                    
                    // Send join notification to other users in the same room
                    this.sendSystemMessage(`${nickname} joined the chat`);
                    
                    resolve();
                } catch (error) {
                    console.error('Failed to join room:', error);
                    reject(new Error('Failed to join chatroom'));
                }
            };

            this.socket.onmessage = (event) => {
                this.handleIncomingMessage(event.data);
            };

            this.socket.onclose = () => {
                if (this.connected) {
                    this.handleDisconnection('Connection lost');
                }
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(new Error('Unable to connect to server'));
            };

            // Connection timeout
            setTimeout(() => {
                if (!this.connected) {
                    this.socket.close();
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    disconnect() {
        if (this.socket && this.connected) {
            // Send leave notification before disconnecting
            this.sendSystemMessage(`${this.nickname} left the chat`);
            
            // Small delay to ensure message is sent
            setTimeout(() => {
                this.socket.close();
                this.handleDisconnection('Disconnected');
            }, 100);
        }
    }

    handleDisconnection(reason) {
        this.connected = false;
        this.socket = null;
        
        this.switchToConnection();
        this.showStatus(reason, 'error');
        this.setConnecting(false);
    }

    async sendMessage() {
        const content = this.messageInput.value.trim();
        
        if (!content || !this.connected) return;
        
        if (content.length > 500) {
            this.showStatus('Message too long (max 500 characters)', 'error');
            return;
        }

        this.messageInput.value = '';
        this.sendBtn.disabled = true;

        try {
            const encrypted = await this.crypto.encryptMessage(content, this.passphrase);
            
            const message = {
                type: 'chat',
                nick: this.nickname,
                data: this.crypto.arrayBufferToBase64(encrypted.ciphertext),
                iv: this.crypto.arrayBufferToBase64(encrypted.iv),
                salt: this.crypto.arrayBufferToBase64(encrypted.salt),
                ts: Date.now()
            };

            this.socket.send(JSON.stringify(message));
            
        } catch (error) {
            console.error('Failed to send message:', error);
            this.showStatus('Failed to send message', 'error');
        } finally {
            this.sendBtn.disabled = false;
            this.messageInput.focus();
        }
    }

    async sendSystemMessage(content) {
        if (!this.connected) return;

        try {
            const encrypted = await this.crypto.encryptMessage(content, this.passphrase);
            
            const message = {
                type: 'system',
                nick: this.nickname,
                data: this.crypto.arrayBufferToBase64(encrypted.ciphertext),
                iv: this.crypto.arrayBufferToBase64(encrypted.iv),
                salt: this.crypto.arrayBufferToBase64(encrypted.salt),
                ts: Date.now()
            };

            this.socket.send(JSON.stringify(message));
        } catch (error) {
            console.error('Failed to send system message:', error);
        }
    }

    async handleIncomingMessage(data) {
        try {
            const message = JSON.parse(data);
            
            if (!message.nick || !message.data || !message.iv || !message.salt) {
                console.warn('Invalid message format received');
                return;
            }

            await this.displayMessage(message);
            
        } catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }

    async displayMessage(message) {
        try {
            // Decrypt the message
            const ciphertext = this.crypto.base64ToArrayBuffer(message.data);
            const iv = this.crypto.base64ToArrayBuffer(message.iv);
            const salt = this.crypto.base64ToArrayBuffer(message.salt);
            
            const decryptedContent = await this.crypto.decryptMessage(
                ciphertext, 
                iv, 
                salt, 
                this.passphrase
            );

            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = `message ${message.nick === this.nickname ? 'own' : 'other'}`;
            
            const isSystemMessage = message.type === 'system';
            
            if (isSystemMessage) {
                messageEl.innerHTML = `
                    <div class="message-content" style="text-align: center; font-style: italic; color: #949ba4;">
                        ${this.crypto.sanitizeHtml(decryptedContent)}
                    </div>
                `;
            } else {
                const nickClass = this.crypto.getNicknameColor(message.nick);
                messageEl.innerHTML = `
                    <div class="message-header">
                        <span class="message-nick ${nickClass}">${this.crypto.sanitizeHtml(message.nick)}</span>
                        <span class="message-time">${this.crypto.formatTime(message.ts)}</span>
                    </div>
                    <div class="message-content">${this.crypto.sanitizeHtml(decryptedContent)}</div>
                `;
            }

            // Add to messages container
            this.messagesContainer.appendChild(messageEl);
            
            // Auto-scroll to bottom
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            
            // Remove welcome message if it exists
            const welcomeMsg = this.messagesContainer.querySelector('.welcome-message');
            if (welcomeMsg) {
                welcomeMsg.remove();
            }

        } catch (error) {
            console.error('Failed to decrypt message:', error);
            
            // Show decrypt error message
            const errorEl = document.createElement('div');
            errorEl.className = 'message other';
            errorEl.innerHTML = `
                <div class="message-header">
                    <span class="message-nick">${this.crypto.sanitizeHtml(message.nick)}</span>
                    <span class="message-time">${this.crypto.formatTime(message.ts)}</span>
                </div>
                <div class="decrypt-error">🔒 Unable to decrypt message (wrong passphrase?)</div>
            `;
            
            this.messagesContainer.appendChild(errorEl);
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    switchToChat() {
        this.connectionPanel.classList.add('hidden');
        this.chatPanel.classList.remove('hidden');
        this.currentNicknameSpan.textContent = this.nickname;
        this.messageInput.focus();
    }

    switchToConnection() {
        this.chatPanel.classList.add('hidden');
        this.connectionPanel.classList.remove('hidden');
        this.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <p>🔒 End-to-end encrypted chat</p>
                <p>Messages are never stored on the server</p>
            </div>
        `;
        this.nicknameInput.focus();
    }

    setConnecting(connecting) {
        this.connectBtn.disabled = connecting;
        
        if (connecting) {
            this.connectBtn.classList.add('loading');
            this.showStatus('Connecting...', 'info');
        } else {
            this.connectBtn.classList.remove('loading');
        }
    }

    showStatus(message, type = 'info') {
        this.statusText.textContent = message;
        this.statusText.className = `status-${type}`;
        
        // Auto-clear status after a few seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                this.statusText.textContent = this.connected ? 'Connected' : 'Not connected';
                this.statusText.className = '';
            }, 3000);
        }
    }

    // Get server IP from URL for display
    getServerInfo() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        return `${hostname}${port ? ':' + port : ''}`;
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
    
    // Show server info in status
    const serverInfo = window.chatApp.getServerInfo();
    if (serverInfo !== 'localhost' && serverInfo !== 'localhost:3000') {
        window.chatApp.showStatus(`Connected to server: ${serverInfo}`, 'info');
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.chatApp) {
        // Check connection when page becomes visible
        if (window.chatApp.socket && window.chatApp.socket.readyState === WebSocket.CLOSED) {
            window.chatApp.handleDisconnection('Connection lost while away');
        }
    }
});
