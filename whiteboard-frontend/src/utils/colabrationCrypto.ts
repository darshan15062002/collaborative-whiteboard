export class CollaborationCrypto {
    constructor() {
        this.key = null;
        this.iv = null;
    }

    // Generate a new encryption key for the room
    async generateKey() {
        this.key = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true, // extractable
            ["encrypt", "decrypt"]
        );
        return this.key;
    }

    // Import a key from raw bytes (for sharing between users)
    async importKey(keyData) {
        this.key = await window.crypto.subtle.importKey(
            "raw",
            keyData,
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );
        return this.key;
    }

    // Export key as raw bytes (to share with other users)
    async exportKey() {
        if (!this.key) {
            throw new Error("No key available to export");
        }
        return await window.crypto.subtle.exportKey("raw", this.key);
    }

    // Export key as Base64 string (for URLs)
    async exportKeyAsBase64() {
        const keyBuffer = await this.exportKey();
        return this.arrayBufferToBase64(keyBuffer);
    }

    // Import key from Base64 string (from URLs)
    async importKeyFromBase64(base64Key) {
        const keyBuffer = this.base64ToArrayBuffer(base64Key);
        await this.importKey(keyBuffer);
        return this.key;
    }

    // Generate random IV (Initialization Vector)
    generateIV() {
        return window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    }

    // Encrypt the drawing data
    async encryptData(data) {
        if (!this.key) {
            await this.generateKey();
        }

        // Convert data to JSON string, then to ArrayBuffer
        const jsonString = JSON.stringify(data);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(jsonString);

        // Generate new IV for each encryption
        const iv = this.generateIV();

        // Encrypt the data
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            this.key,
            dataBuffer
        );

        return {
            encryptedData: encryptedBuffer,
            iv: iv,
        };
    }

    // Decrypt the drawing data
    async decryptData(encryptedData, iv) {
        console.log(iv, "Decrypting data with IV:", this.key);

        if (!this.key) {
            throw new Error("No key available for decryption");
        }

        try {
            // Decrypt the data
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                },
                this.key,
                encryptedData
            );

            // Convert back to JSON
            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedBuffer);

            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Decryption failed:", error);
            throw new Error("Failed to decrypt data");
        }
    }

    // Generate a simple room ID (NOT the encryption key)
    generateRoomId() {
        // Generate 20 character hex string (like Excalidraw)
        const array = new Uint8Array(10);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Utility functions for Base64 conversion
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}
