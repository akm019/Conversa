import { Socket, Server } from 'socket.io';
import { getRoomById, isRoomMember, addRoomMember } from '../../db/queries';
import {
  addUserToRoom,
  removeUserFromCurrentRoom,
  getOnlineUsersWithAvatars,
  removeFromTyping,
  getTypingUsers,
} from './presence';

export function handleJoinRoom(
  io: Server,
  socket: Socket,
  data: { roomId: string }
): void {
  const { roomId } = data;

  const room = getRoomById(roomId);
  if (!roomId || !room) {
    socket.emit('error', { message: 'Room not found' });
    return;
  }

  // Private room: must be a member
  if (room.is_private && !isRoomMember(roomId, socket.data.username)) {
    socket.emit('error', { message: 'You are not a member of this private room' });
    return;
  }

  // Public room: auto-add as member
  if (!room.is_private) {
    addRoomMember(roomId, socket.data.username);
  }

  const removed = removeUserFromCurrentRoom(socket.id);
  if (removed) {
    socket.leave(removed.roomId);
    removeFromTyping(removed.roomId, socket.data.username);
    io.to(removed.roomId).emit('typing_update', {
      users: getTypingUsers(removed.roomId),
    });
    io.to(removed.roomId).emit('user_left', {
      username: removed.username,
      onlineUsers: getOnlineUsersWithAvatars(removed.roomId),
    });
  }

  socket.join(roomId);
  addUserToRoom(socket.id, socket.data.username, roomId);

  io.to(roomId).emit('user_joined', {
    username: socket.data.username,
    avatarId: socket.data.avatarId,
    onlineUsers: getOnlineUsersWithAvatars(roomId),
  });
}

export function handleLeaveRoom(
  io: Server,
  socket: Socket,
  data: { roomId: string }
): void {
  const { roomId } = data;
  const removed = removeUserFromCurrentRoom(socket.id);

  if (removed && removed.roomId === roomId) {
    socket.leave(roomId);
    removeFromTyping(roomId, socket.data.username);
    io.to(roomId).emit('typing_update', {
      users: getTypingUsers(roomId),
    });
    io.to(roomId).emit('user_left', {
      username: removed.username,
      onlineUsers: getOnlineUsersWithAvatars(roomId),
    });
  }
}
