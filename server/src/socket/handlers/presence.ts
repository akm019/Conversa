import { Socket, Server } from 'socket.io';

// In-memory presence tracking
const roomUsers = new Map<string, Map<string, string>>(); // roomId -> Map<socketId, username>
const socketRooms = new Map<string, string>(); // socketId -> roomId

// Global user registry: username -> Set<socketId>
const globalUsers = new Map<string, Set<string>>();
// Avatar mapping: username -> avatarId
const userAvatars = new Map<string, number>();

export interface OnlineUser {
  username: string;
  avatarId: number;
}

export function registerUser(socketId: string, username: string, avatarId: number): void {
  if (!globalUsers.has(username)) {
    globalUsers.set(username, new Set());
  }
  globalUsers.get(username)!.add(socketId);
  userAvatars.set(username, avatarId);
}

export function unregisterUser(socketId: string, username: string): void {
  const sockets = globalUsers.get(username);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      globalUsers.delete(username);
      userAvatars.delete(username);
    }
  }
}

export function getSocketIdsForUser(username: string): string[] {
  const sockets = globalUsers.get(username);
  return sockets ? [...sockets] : [];
}

export function getAvatarForUser(username: string): number {
  return userAvatars.get(username) || 1;
}

export function getAllOnlineUsers(): OnlineUser[] {
  return [...globalUsers.keys()].map((username) => ({
    username,
    avatarId: userAvatars.get(username) || 1,
  }));
}

export function getOnlineUsers(roomId: string): string[] {
  const users = roomUsers.get(roomId);
  if (!users) return [];
  return [...new Set(users.values())];
}

export function getOnlineUsersWithAvatars(roomId: string): OnlineUser[] {
  const usernames = getOnlineUsers(roomId);
  return usernames.map((username) => ({
    username,
    avatarId: userAvatars.get(username) || 1,
  }));
}

export function addUserToRoom(socketId: string, username: string, roomId: string): void {
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Map());
  }
  roomUsers.get(roomId)!.set(socketId, username);
  socketRooms.set(socketId, roomId);
}

export function removeUserFromCurrentRoom(socketId: string): { roomId: string; username: string } | null {
  const roomId = socketRooms.get(socketId);
  if (!roomId) return null;

  const users = roomUsers.get(roomId);
  const username = users?.get(socketId);
  if (!users || !username) return null;

  users.delete(socketId);
  socketRooms.delete(socketId);

  if (users.size === 0) {
    roomUsers.delete(roomId);
  }

  return { roomId, username };
}

export function handleDisconnect(io: Server, socket: Socket): void {
  const removed = removeUserFromCurrentRoom(socket.id);
  if (removed) {
    removeFromTyping(removed.roomId, socket.data.username);
    io.to(removed.roomId).emit('typing_update', {
      users: getTypingUsers(removed.roomId),
    });

    io.to(removed.roomId).emit('user_left', {
      username: removed.username,
      onlineUsers: getOnlineUsersWithAvatars(removed.roomId),
    });
  }

  unregisterUser(socket.id, socket.data.username);
  io.emit('global_online_users', { users: getAllOnlineUsers() });
}

// Typing tracking
const typingUsers = new Map<string, Set<string>>();
const typingTimers = new Map<string, NodeJS.Timeout>();

export function addToTyping(roomId: string, username: string): void {
  if (!typingUsers.has(roomId)) {
    typingUsers.set(roomId, new Set());
  }
  typingUsers.get(roomId)!.add(username);

  const key = `${roomId}:${username}`;
  if (typingTimers.has(key)) {
    clearTimeout(typingTimers.get(key)!);
  }
  typingTimers.set(
    key,
    setTimeout(() => {
      removeFromTyping(roomId, username);
    }, 3000)
  );
}

export function removeFromTyping(roomId: string, username: string): void {
  const users = typingUsers.get(roomId);
  if (users) {
    users.delete(username);
    if (users.size === 0) typingUsers.delete(roomId);
  }
  const key = `${roomId}:${username}`;
  if (typingTimers.has(key)) {
    clearTimeout(typingTimers.get(key)!);
    typingTimers.delete(key);
  }
}

export function getTypingUsers(roomId: string): string[] {
  const users = typingUsers.get(roomId);
  return users ? [...users] : [];
}
