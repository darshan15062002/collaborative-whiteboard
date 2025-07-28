import { Excalidraw, LiveCollaborationTrigger } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { io, Socket } from "socket.io-client";
import "./App.css"
import { useEffect, useState, useRef, useCallback } from "react";
import ShareDialog from "./components/ShareDialog";
import { ClipboardData } from "@excalidraw/excalidraw/clipboard";
import { CollaborationCrypto } from "./utils/colabrationCrypto";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

function App() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [socket, setSocket] = useState<Socket>();
  const [encryptionKey, setEncryptionKey] = useState('');
  const [roomId, setRoomId] = useState<string>("");
  const [shareableUrl, setShareableUrl] = useState<string>("");

  // Use useRef to persist crypto instance across renders
  const cryptoRef = useRef(new CollaborationCrypto());
  const crypto = cryptoRef.current;

  // Use ref to ensure we always have the latest API reference
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Track if we're currently updating to prevent feedback loops
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;
  }, [excalidrawAPI]);

  const handleChange = async (excalidrawElements, appState, files) => {
    // Prevent feedback loop when we update from incoming data
    if (isUpdatingRef.current || !socket || !socket.connected) {
      return;
    }

    const sceneData = {
      elements: excalidrawElements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        // other relevant state
      },
      files: files,
      timestamp: Date.now(),
    };

    try {
      const { encryptedData, iv } = await crypto.encryptData(sceneData);

      console.log("Sending encrypted data to server", {
        roomId,
        encryptedDataSize: encryptedData.byteLength,
        ivSize: iv.byteLength
      });

      // Convert to base64 for reliable transmission
      const encryptedBase64 = crypto.arrayBufferToBase64(encryptedData);
      const ivBase64 = crypto.arrayBufferToBase64(iv.buffer);

      socket.emit('server-broadcast', roomId, encryptedBase64, ivBase64);

    } catch (error) {
      console.error("Encryption failed:", error);
    }
  };

  // Use useCallback to prevent recreation on every render
  const handleClientBroadcast = useCallback(async (encryptedData: any, iv: any) => {
    try {
      console.log("Received encrypted data from server", {
        encryptedDataType: typeof encryptedData,
        ivType: typeof iv,
        hasKey: !!crypto.key
      });

      // Handle different data formats that might come from the server
      let processedEncryptedData: ArrayBuffer;
      let processedIv: Uint8Array;

      // If data comes as base64 strings
      if (typeof encryptedData === 'string' && typeof iv === 'string') {
        console.log("Processing base64 encrypted data and IV");
        processedEncryptedData = crypto.base64ToArrayBuffer(encryptedData);
        processedIv = new Uint8Array(crypto.base64ToArrayBuffer(iv));
      }
      // If data comes as ArrayBuffer/Uint8Array (your current case)
      else if (encryptedData instanceof ArrayBuffer && iv instanceof Uint8Array) {
        console.log("Processing ArrayBuffer encrypted data and Uint8Array IV");
        processedEncryptedData = encryptedData;
        processedIv = iv;
      }
      // Handle other possible formats
      else {
        console.error("Unexpected data format:", { encryptedData, iv });
        return;
      }

      // Check if we have a key before attempting decryption
      if (!crypto.key) {
        console.error("No encryption key available for decryption");
        return;
      }

      console.log("Attempting decryption with:", {
        encryptedSize: processedEncryptedData.byteLength,
        ivSize: processedIv.byteLength,
        keyAvailable: !!crypto.key
      });

      const sceneData = await crypto.decryptData(processedEncryptedData, processedIv);
      console.log("Successfully decrypted scene data");

      // Use ref to get latest API instance and prevent feedback loop
      if (excalidrawAPIRef.current) {
        isUpdatingRef.current = true;

        excalidrawAPIRef.current.updateScene({
          elements: sceneData.elements,
          appState: sceneData.appState,
          files: sceneData.files,
        });

        // Reset the flag after a short delay
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    } catch (error) {
      console.error("Failed to decrypt data:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        hasKey: !!crypto.key,
        keyType: crypto.key?.type
      });
    }
  }, [crypto]);

  const generateShareableUrl = (roomId, encryptionKey) => {
    return `${window.location.origin}/#room=${roomId},${encryptionKey}`;
  };

  const handleStartSharing = async (existingRoomData: { roomId: string; encryptionKey: string; }) => {
    console.log("Starting collaboration session...");

    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

    const _socket = io("http://localhost:3002", {
      transports: ['websocket', 'polling']
    });

    setSocket(_socket);

    _socket.on("connect", async () => {
      console.log("Connected to the server");

      let finalRoomId, finalEncryptionKey;

      try {
        if (existingRoomData) {
          finalRoomId = existingRoomData.roomId;
          finalEncryptionKey = existingRoomData.encryptionKey;

          console.log("Importing existing encryption key...");
          await crypto.importKeyFromBase64(finalEncryptionKey);
          console.log("Successfully imported key, joining room:", finalRoomId);
        } else {
          finalRoomId = crypto.generateRoomId();
          console.log("Generating new encryption key...");
          await crypto.generateKey();
          finalEncryptionKey = await crypto.exportKeyAsBase64();
          console.log("Successfully generated new key and room:", finalRoomId);
        }

        setRoomId(finalRoomId);
        setEncryptionKey(finalEncryptionKey);

        const url = generateShareableUrl(finalRoomId, finalEncryptionKey);
        setShareableUrl(url);
        console.log("Shareable URL:", url);

        _socket.emit("join-room", finalRoomId);

        // Verify key after setup
        console.log("Key verification:", {
          hasKey: !!crypto.key,
          keyType: crypto.key?.type,
          roomId: finalRoomId
        });

      } catch (error) {
        console.error("Failed to setup encryption:", error);
      }
    });

    _socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
  };

  const renderTopRightUI = (isMobile: boolean) => {
    return (
      <>
        <LiveCollaborationTrigger onSelect={() => setIsCollaborating(!isCollaborating)} />
      </>
    );
  };

  const onPointerUpdate = (pointer) => {
    // console.log("Pointer Update:", pointer);
  };

  const onPointerDown = (pointer) => {
    // console.log("Pointer Down:", pointer);
  };

  const onScrollChange = (scroll) => {
    // console.log("Scroll Change:", scroll);
  };

  const onPaste = (data: ClipboardData, event: ClipboardEvent | null): boolean => {
    console.log("Files Pasted:", data);
    return true;
  };

  const onLibraryChange = (libraryItems) => {
    console.log("Library Items Changed:", libraryItems);
  };

  const parseRoomFromUrl = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#room=')) {
      const roomData = hash.substring(6);
      const [roomId, encryptionKey] = roomData.split(',');
      if (roomId && encryptionKey) {
        return { roomId, encryptionKey };
      }
    }
    return null;
  };

  // Socket event listeners with proper cleanup
  useEffect(() => {
    if (!socket) return;

    const handleFirstInRoom = () => {
      console.log("Room initialized - you are the first user");
    };

    const handleNewUser = (userId) => {
      console.log(`New user joined: ${userId}`);
    };

    // Add event listeners
    socket.on("first-in-room", handleFirstInRoom);
    socket.on("new-user", handleNewUser);
    socket.on("client-broadcast", handleClientBroadcast);

    // Cleanup function
    return () => {
      socket.off("first-in-room", handleFirstInRoom);
      socket.off("new-user", handleNewUser);
      socket.off("client-broadcast", handleClientBroadcast);
      socket.disconnect();
      console.log("Socket disconnected and cleaned up");
    };
  }, [socket, handleClientBroadcast]);

  // Auto-join room from URL
  useEffect(() => {
    const roomData = parseRoomFromUrl();
    if (roomData && roomData.roomId && roomData.encryptionKey) {
      console.log("Found room in URL, auto-joining...", roomData);
      handleStartSharing(roomData);
    }
  }, []);

  return (
    <div>
      <div style={{ height: "100vh" }} className="custom-styles">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="dark"
          onChange={handleChange}
          onPointerUpdate={onPointerUpdate}
          onPointerDown={onPointerDown}
          onScrollChange={onScrollChange}
          onPaste={onPaste}
          onLibraryChange={onLibraryChange}
          renderTopRightUI={renderTopRightUI}
        />
      </div>
      {isCollaborating && (
        <ShareDialog
          setIsCollaborating={setIsCollaborating}
          encryptionKey={encryptionKey}
          roomId={roomId}
          handleStartSharing={handleStartSharing}
        />
      )}
    </div>
  );
}

export default App;