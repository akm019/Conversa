import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import type { Message, Room } from '../types';

export function useUnread(activeRoomId: string) {
  const { socket } = useSocket();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const activeRoomRef = useRef(activeRoomId);

  // Keep ref in sync
  useEffect(() => {
    activeRoomRef.current = activeRoomId;
    // Clear unread for active room when switching
    setUnreadCounts((prev) => {
      if (!prev[activeRoomId]) return prev;
      const next = { ...prev };
      delete next[activeRoomId];
      return next;
    });
  }, [activeRoomId]);

  // Listen for new room messages
  useEffect(() => {
    if (!socket) return;

    function onNewMessage(message: Message) {
      if (message.room_id !== activeRoomRef.current) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.room_id]: (prev[message.room_id] || 0) + 1,
        }));
      }
    }

    function onDmMessage(data: { dm: Room; message: Message }) {
      if (data.dm.id !== activeRoomRef.current) {
        setUnreadCounts((prev) => ({
          ...prev,
          [data.dm.id]: (prev[data.dm.id] || 0) + 1,
        }));
      }
    }

    socket.on('new_message', onNewMessage);
    socket.on('dm_message', onDmMessage);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('dm_message', onDmMessage);
    };
  }, [socket]);

  const clearUnread = useCallback((roomId: string) => {
    setUnreadCounts((prev) => {
      if (!prev[roomId]) return prev;
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
  }, []);

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  return { unreadCounts, clearUnread, totalUnread };
}
