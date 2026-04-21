import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useUser } from '../context/UserContext';

interface UseTypingOptions {
  isDm?: boolean;
  dmRecipient?: string;
}

export function useTyping(roomId: string, options?: UseTypingOptions) {
  const { socket } = useSocket();
  const { username } = useUser();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const isDm = options?.isDm || false;
  const dmRecipient = options?.dmRecipient;

  useEffect(() => {
    if (!socket) return;

    setTypingUsers([]);

    if (isDm) {
      // Listen for DM typing updates
      function onDmTypingUpdate(data: { dmId: string; users: string[] }) {
        if (data.dmId === roomId) {
          setTypingUsers(data.users.filter((u) => u !== username));
        }
      }

      socket.on('dm_typing_update', onDmTypingUpdate);
      return () => {
        socket.off('dm_typing_update', onDmTypingUpdate);
      };
    } else {
      // Listen for room typing updates
      function onTypingUpdate(data: { users: string[] }) {
        setTypingUsers(data.users.filter((u) => u !== username));
      }

      socket.on('typing_update', onTypingUpdate);
      return () => {
        socket.off('typing_update', onTypingUpdate);
      };
    }
  }, [socket, roomId, username, isDm]);

  const handleInputChange = useCallback(() => {
    if (!socket) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      if (isDm && dmRecipient) {
        socket.emit('dm_typing_start', { to: dmRecipient });
      } else {
        socket.emit('typing_start', { roomId });
      }
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (isDm && dmRecipient) {
        socket.emit('dm_typing_stop', { to: dmRecipient });
      } else {
        socket.emit('typing_stop', { roomId });
      }
    }, 2000);
  }, [socket, roomId, isDm, dmRecipient]);

  const stopTyping = useCallback(() => {
    if (!socket || !isTypingRef.current) return;

    isTypingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isDm && dmRecipient) {
      socket.emit('dm_typing_stop', { to: dmRecipient });
    } else {
      socket.emit('typing_stop', { roomId });
    }
  }, [socket, roomId, isDm, dmRecipient]);

  return { typingUsers, handleInputChange, stopTyping };
}
