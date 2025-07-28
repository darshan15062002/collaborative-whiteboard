import { Excalidraw, LiveCollaborationTrigger } from "@excalidraw/excalidraw";

import "@excalidraw/excalidraw/index.css";
import { io, Socket } from "socket.io-client";
import "./App.css"
import { useEffect, useState } from "react";
import ShareDialog from "./components/ShareDialog";


import { ClipboardData } from "@excalidraw/excalidraw/clipboard";
import { CollaborationCrypto } from "./utils/colabrationCrypto";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

function App() {






  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [socket, setSocket] = useState<Socket>();
  const crypto = new CollaborationCrypto();
  const [encryptionKey, setEncryptionKey] = useState('')
  const [roomId, setRoomId] = useState<string>("");
  const [shareableUrl, setShareableUrl] = useState<string>("");
  const handleChange = async (excalidrawElements, appState, files) => {
    if (socket) {

      // Prepare the data to encrypt
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
        // Encrypt the data
        const { encryptedData, iv } = await crypto.encryptData(sceneData);

        console.log("Sending encrypted data to server", { roomId, encryptedData, iv });

        // Send encrypted data to server
        socket.emit('server-broadcast', roomId, encryptedData, iv);

      } catch (error) {
        console.error("Encryption failed:", error);
      }
    }
  };

  const renderTopRightUI = (isMobile: boolean) => {
    return (
      <>
        <LiveCollaborationTrigger onSelect={() => setIsCollaborating(!isCollaborating)} />
        {/* <button type="button" onClick={() => setIsCollaborating(!isCollaborating)} className="excalidraw-button collab-button active" title="Live collaboration..." style={{ position: "relative", width: "auto" }}>Share</button> */}

      </>
    );
  };


  const handleClientBroadcast = async (encryptedData: ArrayBuffer, iv: Uint8Array) => {

    try {
      console.log("Received encrypted data from server");

      // Decrypt the data
      const sceneData = await crypto.decryptData(encryptedData, iv);

      console.log("Decrypted scene data:", sceneData);

      // Update Excalidraw with decrypted data
      if (excalidrawAPI) {
        excalidrawAPI.updateScene({
          elements: sceneData.elements,
          appState: sceneData.appState,
          files: sceneData.files,
        });
      }

    } catch (error) {
      console.error("Failed to decrypt data:", error);
    }

  }

  const generateShareableUrl = (roomId, encryptionKey) => {
    // Format: #room=ROOM_ID,ENCRYPTION_KEY
    return `${window.location.origin}/#room=${roomId},${encryptionKey}`;
  };



  const handleStartSharing = async (existingRoomData: { roomId: string; encryptionKey: string; }) => {
    console.log("Starting collaboration session...");

    const _socket = io("http://localhost:3002");
    setSocket(_socket);
    _socket.on("connect", async () => {
      console.log("Connected to the server");

      let finalRoomId, finalEncryptionKey;

      if (existingRoomData) {
        // Joining existing room
        finalRoomId = existingRoomData.roomId;
        finalEncryptionKey = existingRoomData.encryptionKey;

        // Import the existing encryption key
        await crypto.importKeyFromBase64(finalEncryptionKey);

        console.log("Joining existing room:", finalRoomId);
      } else {
        // Creating new room
        finalRoomId = crypto.generateRoomId(); // Generate simple room ID
        await crypto.generateKey(); // Generate encryption key
        finalEncryptionKey = await crypto.exportKeyAsBase64(); // Export as Base64 string

        console.log("Creating new room... roomId:", finalRoomId, "encryptionKey:", finalEncryptionKey);
      }

      // Store the data
      setRoomId(finalRoomId);
      setEncryptionKey(finalEncryptionKey);

      // Generate shareable URL
      const url = generateShareableUrl(finalRoomId, finalEncryptionKey);
      setShareableUrl(url);

      console.log("Shareable URL:", url);

      // Join the socket room
      _socket.emit("join-room", finalRoomId);
    });
  };







  const onPointerUpdate = (pointer) => {
    console.log("Pointer Update:", pointer);
  };
  const onPointerDown = (pointer) => {
    console.log("Pointer Down:", pointer);
  };
  const onScrollChange = (scroll) => {
    console.log("Scroll Change:", scroll);
  }
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



  useEffect(() => {

    if (!socket) return console.log("Socket not initialized yet");


    socket.on("first-in-room", () => {
      console.log("Room initialized");
    });

    socket.on("new-user", (userId) => {
      console.log(`New user joined: ${userId}`);
    });

    socket.on("client-broadcast", handleClientBroadcast);
    return () => {
      socket.disconnect();
      console.log("Socket disconnected");
    }
  }, [socket,]);

  // useEffect(() => {


  //   console.log(paramsroomId, "fsds");

  //   if (paramsroomId) {
  //     console.log(paramsroomId, "pafds");
  //     setRoomId(paramsroomId)
  //     const _socket = io("http://localhost:3002");
  //     setSocket(_socket)
  //     _socket.emit("join-room", paramsroomId);

  //     return () => {

  //     };
  //   }
  // }, [paramsroomId]);

  useEffect(() => {
    const roomData = parseRoomFromUrl();
    if (roomData && roomData.roomId && roomData.encryptionKey) {
      console.log("Found room in URL, auto-joining...");
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
      {isCollaborating && <ShareDialog setIsCollaborating={setIsCollaborating} encryptionKey={encryptionKey} roomId={roomId} handleStartSharing={handleStartSharing} />}

    </div >
  )
}

export default App
