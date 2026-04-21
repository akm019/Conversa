import { Socket, Server } from 'socket.io';
import { insertMessage, getRoomById, getOrCreateDm, getDmRoomId, getMessageById, updateMessageContent, deleteMessage, markMessagesDelivered, markMessagesRead } from '../../db/queries';
import { sanitize } from '../../utils/sanitize';
import { config } from '../../config';
import {
  addToTyping,
  removeFromTyping,
  getTypingUsers,
  getSocketIdsForUser,
} from './presence';

// Rate limiting: track message timestamps per socket
const messageTimes = new Map<string, number[]>();

function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const times = messageTimes.get(socketId) || [];

  // Remove entries outside the window
  const recent = times.filter((t) => now - t < config.rateLimitWindowMs);
  messageTimes.set(socketId, recent);

  return recent.length >= config.rateLimitMessages;
}

function recordMessage(socketId: string): void {
  const times = messageTimes.get(socketId) || [];
  times.push(Date.now());
  messageTimes.set(socketId, times);
}

export function cleanupRateLimit(socketId: string): void {
  messageTimes.delete(socketId);
}

export function handleSendMessage(
  io: Server,
  socket: Socket,
  data: { roomId: string; content: string; fileUrl?: string; fileType?: string; fileName?: string; forwarded?: boolean }
): void {
  const { roomId, content, fileUrl, fileType, fileName, forwarded } = data;

  const isFileMessage = !!fileUrl;

  if (!roomId) {
    socket.emit('error', { message: 'Room ID is required' });
    return;
  }

  if (!isFileMessage && (!content || typeof content !== 'string' || content.trim().length === 0)) {
    socket.emit('error', { message: 'Message content is required' });
    return;
  }

  const trimmed = (content || '').trim();
  if (trimmed.length > 2000) {
    socket.emit('error', { message: 'Message must be 2000 characters or less' });
    return;
  }

  if (!getRoomById(roomId)) {
    socket.emit('error', { message: 'Room not found' });
    return;
  }

  if (isRateLimited(socket.id)) {
    socket.emit('error', { message: 'Sending messages too fast. Please slow down.' });
    return;
  }

  recordMessage(socket.id);

  const sanitized = trimmed ? sanitize(trimmed) : '';
  const messageContent = sanitized || (fileName ? `Sent ${fileName}` : 'Sent a file');
  const message = insertMessage(
    roomId, socket.data.username, messageContent, 'user', socket.data.avatarId,
    fileUrl || null, fileType || null, fileName || null, !!forwarded
  );

  removeFromTyping(roomId, socket.data.username);

  io.to(roomId).emit('new_message', message);
  io.to(roomId).emit('typing_update', { users: getTypingUsers(roomId) });
}

export function handleTypingStart(
  io: Server,
  socket: Socket,
  data: { roomId: string }
): void {
  const { roomId } = data;
  if (!roomId) return;

  addToTyping(roomId, socket.data.username);
  io.to(roomId).emit('typing_update', { users: getTypingUsers(roomId) });
}

export function handleTypingStop(
  io: Server,
  socket: Socket,
  data: { roomId: string }
): void {
  const { roomId } = data;
  if (!roomId) return;

  removeFromTyping(roomId, socket.data.username);
  io.to(roomId).emit('typing_update', { users: getTypingUsers(roomId) });
}

export function handleSendDm(
  io: Server,
  socket: Socket,
  data: { to: string; content: string; fileUrl?: string; fileType?: string; fileName?: string; forwarded?: boolean }
): void {
  const { to, content, fileUrl, fileType, fileName, forwarded } = data;
  const isFileMessage = !!fileUrl;

  if (!to) {
    socket.emit('error', { message: 'Recipient is required' });
    return;
  }

  if (!isFileMessage && (!content || typeof content !== 'string' || content.trim().length === 0)) {
    socket.emit('error', { message: 'Message content is required' });
    return;
  }

  const trimmed = (content || '').trim();
  if (trimmed.length > 2000) {
    socket.emit('error', { message: 'Message must be 2000 characters or less' });
    return;
  }

  if (isRateLimited(socket.id)) {
    socket.emit('error', { message: 'Sending messages too fast. Please slow down.' });
    return;
  }

  recordMessage(socket.id);

  const from = socket.data.username;
  const dm = getOrCreateDm(from, to);

  const sanitized = trimmed ? sanitize(trimmed) : '';
  const messageContent = sanitized || (fileName ? `Sent ${fileName}` : 'Sent a file');
  const message = insertMessage(
    dm.id, from, messageContent, 'user', socket.data.avatarId,
    fileUrl || null, fileType || null, fileName || null, !!forwarded
  );

  // Clear typing on send
  removeFromTyping(dm.id, from);

  // Send to all sockets of both users
  const recipientSockets = getSocketIdsForUser(to);
  const senderSockets = getSocketIdsForUser(from);
  const allSockets = [...new Set([...recipientSockets, ...senderSockets])];

  for (const sid of allSockets) {
    io.to(sid).emit('dm_message', { dm, message });
  }

  // Also send updated typing state
  emitDmTyping(io, dm.id, from, to);
}

function emitDmTyping(io: Server, dmId: string, user1: string, user2: string): void {
  const typingList = getTypingUsers(dmId);
  const user1Sockets = getSocketIdsForUser(user1);
  const user2Sockets = getSocketIdsForUser(user2);
  const allSockets = [...new Set([...user1Sockets, ...user2Sockets])];

  for (const sid of allSockets) {
    io.to(sid).emit('dm_typing_update', { dmId, users: typingList });
  }
}

export function handleDmTypingStart(
  io: Server,
  socket: Socket,
  data: { to: string }
): void {
  const { to } = data;
  if (!to) return;

  const from = socket.data.username;
  const dmId = getDmRoomId(from, to);

  addToTyping(dmId, from);
  emitDmTyping(io, dmId, from, to);
}

export function handleDmTypingStop(
  io: Server,
  socket: Socket,
  data: { to: string }
): void {
  const { to } = data;
  if (!to) return;

  const from = socket.data.username;
  const dmId = getDmRoomId(from, to);

  removeFromTyping(dmId, from);
  emitDmTyping(io, dmId, from, to);
}

export function handleEditMessage(
  io: Server,
  socket: Socket,
  data: { messageId: number; content: string }
): void {
  const { messageId, content } = data;

  if (!messageId || !content || typeof content !== 'string') {
    socket.emit('error', { message: 'Message ID and content are required' });
    return;
  }

  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) {
    socket.emit('error', { message: 'Message must be 1-2000 characters' });
    return;
  }

  const msg = getMessageById(messageId);
  if (!msg) {
    socket.emit('error', { message: 'Message not found' });
    return;
  }

  // Only the author can edit
  if (msg.username !== socket.data.username) {
    socket.emit('error', { message: 'You can only edit your own messages' });
    return;
  }

  const sanitized = sanitize(trimmed);
  const updated = updateMessageContent(messageId, sanitized);
  if (!updated) return;

  // Broadcast to room or DM participants
  if (msg.room_id.startsWith('dm:')) {
    const parts = msg.room_id.split(':');
    const otherUser = parts[1] === socket.data.username ? parts[2] : parts[1];
    const allSockets = [
      ...new Set([...getSocketIdsForUser(socket.data.username), ...getSocketIdsForUser(otherUser)])
    ];
    for (const sid of allSockets) {
      io.to(sid).emit('message_edited', updated);
    }
  } else {
    io.to(msg.room_id).emit('message_edited', updated);
  }
}

export function handleDeleteMessage(
  io: Server,
  socket: Socket,
  data: { messageId: number }
): void {
  const { messageId } = data;

  if (!messageId) {
    socket.emit('error', { message: 'Message ID is required' });
    return;
  }

  const msg = getMessageById(messageId);
  if (!msg) {
    socket.emit('error', { message: 'Message not found' });
    return;
  }

  if (msg.username !== socket.data.username) {
    socket.emit('error', { message: 'You can only delete your own messages' });
    return;
  }

  const roomId = msg.room_id;
  deleteMessage(messageId);

  if (roomId.startsWith('dm:')) {
    const parts = roomId.split(':');
    const otherUser = parts[1] === socket.data.username ? parts[2] : parts[1];
    const allSockets = [
      ...new Set([...getSocketIdsForUser(socket.data.username), ...getSocketIdsForUser(otherUser)])
    ];
    for (const sid of allSockets) {
      io.to(sid).emit('message_deleted', { messageId, roomId });
    }
  } else {
    io.to(roomId).emit('message_deleted', { messageId, roomId });
  }
}

export function handleDmDelivered(
  io: Server,
  socket: Socket,
  data: { roomId: string }
): void {
  const { roomId } = data;
  if (!roomId || !roomId.startsWith('dm:')) return;

  const ids = markMessagesDelivered(roomId, socket.data.username);
  if (ids.length === 0) return;

  // Notify the sender(s) that messages were delivered
  const parts = roomId.split(':');
  const otherUser = parts[1] === socket.data.username ? parts[2] : parts[1];
  const senderSockets = getSocketIdsForUser(otherUser);
  for (const sid of senderSockets) {
    io.to(sid).emit('message_status_update', { roomId, messageIds: ids, status: 'delivered' });
  }
}

export function handleDmRead(
  io: Server,
  socket: Socket,
  data: { roomId: string }
): void {
  const { roomId } = data;
  if (!roomId || !roomId.startsWith('dm:')) return;

  const ids = markMessagesRead(roomId, socket.data.username);
  if (ids.length === 0) return;

  // Notify the sender(s) that messages were read
  const parts = roomId.split(':');
  const otherUser = parts[1] === socket.data.username ? parts[2] : parts[1];
  const senderSockets = getSocketIdsForUser(otherUser);
  for (const sid of senderSockets) {
    io.to(sid).emit('message_status_update', { roomId, messageIds: ids, status: 'read' });
  }
}
