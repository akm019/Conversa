import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(username: string, avatarId: number): Socket {
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io({
    auth: { username, avatarId },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
