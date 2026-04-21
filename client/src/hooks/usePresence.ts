import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import type { OnlineUser } from '../types';

export function usePresence(roomId: string) {
  const { socket } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!socket) return;

    setOnlineUsers([]);

    function onUserJoined(data: { username: string; avatarId: number; onlineUsers: OnlineUser[] }) {
      setOnlineUsers(data.onlineUsers);
    }

    function onUserLeft(data: { username: string; onlineUsers: OnlineUser[] }) {
      setOnlineUsers(data.onlineUsers);
    }

    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);

    return () => {
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
    };
  }, [socket, roomId]);

  return { onlineUsers };
}
