export class CollaborationCrypto {
    constructor() {
        this.key = null;
        this.iv = null;
    }

    // Generate a new encryption key for the room
    async generateKey() {
        try {
            this.key = await window.crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256,
                },
                true, // extractable
                ["encrypt", "decrypt"]
            );
            console.log("Successfully generated new encryption key");
            return this.key;
        } catch (error) {
            console.error("Failed to generate key:", error);
            throw error;
        }
    }

    // Import a key from raw bytes (for sharing between users)
    async importKey(keyData) {
        try {
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
            console.log("Successfully imported encryption key");
            return this.key;
        } catch (error) {
            console.error("Failed to import key:", error);
            throw error;
        }
    }

    // Export key as raw bytes (to share with other users)
    async exportKey() {
        if (!this.key) {
            throw new Error("No key available to export");
        }
        try {
            const exported = await window.crypto.subtle.exportKey("raw", this.key);
            console.log("Successfully exported key");
            return exported;
        } catch (error) {
            console.error("Failed to export key:", error);
            throw error;
        }
    }

    // Export key as Base64 string (for URLs)
    async exportKeyAsBase64() {
        try {
            const keyBuffer = await this.exportKey();
            const base64 = this.arrayBufferToBase64(keyBuffer);
            console.log("Successfully exported key as base64");
            return base64;
        } catch (error) {
            console.error("Failed to export key as base64:", error);
            throw error;
        }
    }

    // Import key from Base64 string (from URLs)
    async importKeyFromBase64(base64Key) {
        try {
            const keyBuffer = this.base64ToArrayBuffer(base64Key);
            await this.importKey(keyBuffer);
            console.log("Successfully imported key from base64");
            return this.key;
        } catch (error) {
            console.error("Failed to import key from base64:", error);
            throw error;
        }
    }

    // Generate random IV (Initialization Vector)
    generateIV() {
        return window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    }

    // Encrypt the drawing data
    async encryptData(data) {
        if (!this.key) {
            console.log("No key available, generating new one...");
            await this.generateKey();
        }

        try {
            // Convert data to JSON string, then to ArrayBuffer
            const jsonString = JSON.stringify(data);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(jsonString);

            // Generate new IV for each encryption
            const iv = this.generateIV();

            console.log("Encrypting data:", {
                dataSize: dataBuffer.byteLength,
                ivSize: iv.byteLength,
                hasKey: !!this.key
            });

            // Encrypt the data
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                },
                this.key,
                dataBuffer
            );

            console.log("Successfully encrypted data");

            return {
                encryptedData: encryptedBuffer,
                iv: iv,
            };
        } catch (error) {
            console.error("Encryption failed:", error);
            throw error;
        }
    }

    // Decrypt the drawing data
    async decryptData(encryptedData, iv) {
        console.log("Decrypting data with:", {
            encryptedDataSize: encryptedData?.byteLength,
            ivSize: iv?.byteLength,
            hasKey: !!this.key,
            keyType: this.key?.type
        });

        if (!this.key) {
            throw new Error("No key available for decryption");
        }

        if (!encryptedData || !iv) {
            throw new Error("Missing encrypted data or IV");
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

            console.log("Successfully decrypted data");
            return JSON.parse(jsonString);

        } catch (error) {
            console.error("Decryption failed:", error);
            console.error("Decryption error details:", {
                errorName: error.name,
                errorMessage: error.message,
                encryptedDataType: typeof encryptedData,
                ivType: typeof iv,
                keyAvailable: !!this.key
            });
            throw new Error(`Failed to decrypt data: ${error.message}`);
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
        try {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        } catch (error) {
            console.error("Failed to convert ArrayBuffer to base64:", error);
            throw error;
        }
    }

    base64ToArrayBuffer(base64) {
        try {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        } catch (error) {
            console.error("Failed to convert base64 to ArrayBuffer:", error);
            throw error;
        }
    }
}