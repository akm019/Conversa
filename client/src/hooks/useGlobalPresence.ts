import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import type { OnlineUser } from '../types';

export function useGlobalPresence() {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!socket) return;

    function onGlobalOnlineUsers(data: { users: OnlineUser[] }) {
      setOnlineUsers(data.users);
    }

    socket.on('global_online_users', onGlobalOnlineUsers);

    if (isConnected) {
      socket.emit('get_online_users');
    }

    return () => {
      socket.off('global_online_users', onGlobalOnlineUsers);
    };
  }, [socket, isConnected]);

  return { onlineUsers };
}
