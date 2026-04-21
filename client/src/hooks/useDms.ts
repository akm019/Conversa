import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useUser } from '../context/UserContext';
import type { Room, Message } from '../types';

export function useDms() {
  const { socket } = useSocket();
  const { username } = useUser();
  const [dms, setDms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    fetch(`/api/dm?username=${encodeURIComponent(username)}`)
      .then((res) => res.json())
      .then((data: Room[]) => {
        setDms(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [username]);

  // Listen for new DM messages to add conversations to the list
  useEffect(() => {
    if (!socket) return;

    function onDmMessage(data: { dm: Room; message: Message }) {
      setDms((prev) => {
        const exists = prev.some((d) => d.id === data.dm.id);
        if (exists) {
          // Move to top
          return [
            prev.find((d) => d.id === data.dm.id)!,
            ...prev.filter((d) => d.id !== data.dm.id),
          ];
        }
        return [data.dm, ...prev];
      });
    }

    socket.on('dm_message', onDmMessage);
    return () => {
      socket.off('dm_message', onDmMessage);
    };
  }, [socket]);

  const startDm = useCallback(async (otherUser: string): Promise<Room> => {
    if (!username) throw new Error('Not logged in');

    const res = await fetch('/api/dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user1: username, user2: otherUser }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create DM');
    }

    const dm: Room = await res.json();

    setDms((prev) => {
      if (prev.some((d) => d.id === dm.id)) return prev;
      return [dm, ...prev];
    });

    return dm;
  }, [username]);

  return { dms, isLoading, startDm };
}
