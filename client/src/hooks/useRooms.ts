import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useUser } from '../context/UserContext';
import type { Room } from '../types';

export function useRooms() {
  const { socket } = useSocket();
  const { username } = useUser();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invite, setInvite] = useState<{ room: Room; invitedBy: string } | null>(null);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/rooms?username=${encodeURIComponent(username)}`)
      .then((res) => res.json())
      .then((data: Room[]) => {
        setRooms(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [username]);

  useEffect(() => {
    if (!socket) return;

    function onRoomCreated(room: Room) {
      setRooms((prev) => {
        if (prev.some((r) => r.id === room.id)) return prev;
        return [...prev, room];
      });
    }

    function onRoomDeleted(data: { roomId: string }) {
      setRooms((prev) => prev.filter((r) => r.id !== data.roomId));
    }

    function onRoomInvite(data: { room: Room; invitedBy: string }) {
      // Add the room to sidebar immediately
      setRooms((prev) => {
        if (prev.some((r) => r.id === data.room.id)) return prev;
        return [...prev, data.room];
      });
      // Show notification
      setInvite(data);
    }

    socket.on('room_created', onRoomCreated);
    socket.on('room_deleted', onRoomDeleted);
    socket.on('room_invite', onRoomInvite);
    return () => {
      socket.off('room_created', onRoomCreated);
      socket.off('room_deleted', onRoomDeleted);
      socket.off('room_invite', onRoomInvite);
    };
  }, [socket]);

  const createRoom = useCallback(async (name: string, isPrivate: boolean): Promise<Room> => {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, createdBy: username, isPrivate }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create room');
    }

    const room: Room = await res.json();

    if (!isPrivate) {
      socket?.emit('room_created', room);
    }

    setRooms((prev) => {
      if (prev.some((r) => r.id === room.id)) return prev;
      return [...prev, room];
    });

    return room;
  }, [socket, username]);

  const deleteRoomById = useCallback(async (roomId: string): Promise<void> => {
    const res = await fetch(`/api/rooms/${roomId}?username=${encodeURIComponent(username || '')}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete room');
    }

    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    socket?.emit('room_deleted', { roomId });
  }, [socket, username]);

  const inviteToRoom = useCallback(async (roomId: string, inviteUsername: string): Promise<void> => {
    const res = await fetch(`/api/rooms/${roomId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: inviteUsername, addedBy: username }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to invite');
    }

    // Push notification to invited user via socket
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      socket?.emit('room_invite', { room, invitedUser: inviteUsername });
    }
  }, [username, socket, rooms]);

  const dismissInvite = useCallback(() => setInvite(null), []);

  return { rooms, isLoading, createRoom, deleteRoomById, inviteToRoom, invite, dismissInvite };
}
