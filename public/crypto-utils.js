// Cryptographic utilities for end-to-end encryption

class CryptoUtils {
    constructor() {
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
    }

    /**
     * Derives an encryption key from passphrase and salt using PBKDF2
     */
    async deriveKey(passphrase, salt) {
        try {
            // Import the passphrase as a key
            const passphraseKey = await crypto.subtle.importKey(
                'raw',
                this.encoder.encode(passphrase),
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );

            // Derive the actual encryption key
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000, // Strong iteration count
                    hash: 'SHA-256'
                },
                passphraseKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            return key;
        } catch (error) {
            console.error('Key derivation failed:', error);
            throw new Error('Failed to derive encryption key');
        }
    }

    /**
     * Encrypts a plaintext message using AES-GCM
     */
    async encryptMessage(plaintext, passphrase) {
        try {
            // Generate random salt and IV
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Derive key from passphrase and salt
            const key = await this.deriveKey(passphrase, salt);

            // Encrypt the message
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                this.encoder.encode(plaintext)
            );

            return {
                ciphertext: new Uint8Array(ciphertext),
                iv: iv,
                salt: salt
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt message');
        }
    }

    /**
     * Decrypts a ciphertext message using AES-GCM
     */
    async decryptMessage(ciphertext, iv, salt, passphrase) {
        try {
            // Derive key from passphrase and salt
            const key = await this.deriveKey(passphrase, salt);

            // Decrypt the message
            const plaintext = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                ciphertext
            );

            return this.decoder.decode(plaintext);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt message - wrong passphrase?');
        }
    }

    /**
     * Converts Uint8Array to base64 string
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Converts base64 string to Uint8Array
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Generates a hash-based color for a nickname
     */
    getNicknameColor(nickname) {
        let hash = 0;
        for (let i = 0; i < nickname.length; i++) {
            const char = nickname.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        const colorIndex = Math.abs(hash) % 8 + 1;
        return `nick-color-${colorIndex}`;
    }

    /**
     * Sanitizes HTML to prevent XSS attacks
     */
    sanitizeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Formats timestamp for display
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        // Show time only if message is from today
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
        }
        
        // Show date and time for older messages
        return date.toLocaleString([], { 
            month: 'short',
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }

    /**
     * Creates a room ID from passphrase using SHA-256 hash
     */
    async createRoomId(passphrase) {
        try {
            const passphraseBuffer = this.encoder.encode(passphrase);
            const hashBuffer = await crypto.subtle.digest('SHA-256', passphraseBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Failed to create room ID:', error);
            throw new Error('Failed to create room ID');
        }
    }
}

// Export for use in other files
window.CryptoUtils = CryptoUtils;
