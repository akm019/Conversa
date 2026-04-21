import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useUser } from '../context/UserContext';
import type { Message, PaginatedMessages, Room } from '../types';

export function useMessages(roomId: string) {
  const { socket } = useSocket();
  const { username } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reactions, setReactions] = useState<Record<number, { emoji: string; users: string[] }[]>>({});
  const roomIdRef = useRef(roomId);
  const isDm = roomId.startsWith('dm:');

  // Reset on room change
  useEffect(() => {
    roomIdRef.current = roomId;
    setMessages([]);
    setHasMore(false);
    setIsLoading(true);
    setReactions({});

    fetch(`/api/rooms/${encodeURIComponent(roomId)}/messages`)
      .then((res) => res.json())
      .then((data: PaginatedMessages) => {
        if (roomIdRef.current === roomId) {
          setMessages(data.messages);
          setHasMore(data.hasMore);
          setIsLoading(false);

          // Mark as read when we load messages in a DM
          if (roomId.startsWith('dm:') && socket) {
            socket.emit('dm_read', { roomId });
          }
        }
      })
      .catch(() => {
        if (roomIdRef.current === roomId) {
          setIsLoading(false);
        }
      });
  }, [roomId, socket]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    function onNewMessage(message: Message) {
      if (message.room_id === roomIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    }

    function onDmMessage(data: { dm: Room; message: Message }) {
      if (data.dm.id === roomIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });

        // Auto-deliver and read since we're viewing this DM
        if (data.message.username !== username) {
          socket!.emit('dm_delivered', { roomId: data.dm.id });
          socket!.emit('dm_read', { roomId: data.dm.id });
        }
      } else {
        if (data.message.username !== username) {
          socket!.emit('dm_delivered', { roomId: data.dm.id });
        }
      }
    }

    function onMessageEdited(updated: Message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
    }

    function onMessageDeleted(data: { messageId: number; roomId: string }) {
      if (data.roomId === roomIdRef.current) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    }

    // Listen for status updates (delivered/read)
    function onStatusUpdate(data: { roomId: string; messageIds: number[]; status: 'delivered' | 'read' }) {
      if (data.roomId === roomIdRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            data.messageIds.includes(m.id) ? { ...m, status: data.status } : m
          )
        );
      }
    }

    function onReactionUpdate(data: { messageId: number; roomId: string; reactions: { emoji: string; users: string[] }[] }) {
      if (data.roomId === roomIdRef.current) {
        setReactions((prev) => ({ ...prev, [data.messageId]: data.reactions }));
      }
    }

    socket.on('new_message', onNewMessage);
    socket.on('dm_message', onDmMessage);
    socket.on('message_edited', onMessageEdited);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('message_status_update', onStatusUpdate);
    socket.on('reaction_update', onReactionUpdate);
    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('dm_message', onDmMessage);
      socket.off('message_edited', onMessageEdited);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('message_status_update', onStatusUpdate);
      socket.off('reaction_update', onReactionUpdate);
    };
  }, [socket, username]);

  // Refetch on reconnect
  useEffect(() => {
    if (!socket) return;

    function onReconnect() {
      fetch(`/api/rooms/${encodeURIComponent(roomIdRef.current)}/messages`)
        .then((res) => res.json())
        .then((data: PaginatedMessages) => {
          setMessages(data.messages);
          setHasMore(data.hasMore);
        });
    }

    socket.on('connect', onReconnect);
    return () => {
      socket.off('connect', onReconnect);
    };
  }, [socket]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    const oldest = messages[0];
    if (!oldest) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(roomIdRef.current)}/messages?before=${oldest.id}`
      );
      const data: PaginatedMessages = await res.json();
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, messages]);

  return { messages, hasMore, isLoading, loadMore, isDm, reactions };
}
