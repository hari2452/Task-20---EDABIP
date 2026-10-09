import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Let Socket.IO choose the best transport automatically.
    // It will normally start with polling and upgrade to WebSocket.
    const newSocket = io("http://127.0.0.1:5000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log(
        "Socket connected:",
        newSocket.id
      );

      console.log(
        "Socket transport:",
        newSocket.io.engine.transport.name
      );

      setConnected(true);
    });

    newSocket.io.engine.on("upgrade", (transport) => {
      console.log(
        "Socket upgraded to:",
        transport.name
      );
    });

    newSocket.on("activity_update", (data) => {
      console.log(
        "GLOBAL activity_update received:",
        data
      );
    });

    newSocket.on("disconnect", (reason) => {
      console.log(
        "Socket disconnected:",
        reason
      );

      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error(
        "Socket connection error:",
        error.message
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}