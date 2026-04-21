import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { config } from '../config';
import { authMiddleware } from './middleware';
import { handleJoinRoom, handleLeaveRoom } from './handlers/room';
import { handleSendMessage, handleSendDm, handleTypingStart, handleTypingStop, handleDmTypingStart, handleDmTypingStop, handleEditMessage, handleDeleteMessage, handleDmDelivered, handleDmRead, cleanupRateLimit } from './handlers/chat';
import { handleDisconnect, registerUser, getAllOnlineUsers, getSocketIdsForUser } from './handlers/presence';

let io: Server;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.use(authMiddleware);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.data.username} (${socket.id})`);

    // Register in global user registry
    registerUser(socket.id, socket.data.username, socket.data.avatarId);

    // Broadcast updated global online list
    io.emit('global_online_users', { users: getAllOnlineUsers() });

    // Let clients request the online list (avoids race condition on connect)
    socket.on('get_online_users', () => {
      socket.emit('global_online_users', { users: getAllOnlineUsers() });
    });

    socket.on('join_room', (data) => handleJoinRoom(io, socket, data));
    socket.on('leave_room', (data) => handleLeaveRoom(io, socket, data));
    socket.on('send_message', (data) => handleSendMessage(io, socket, data));
    socket.on('send_dm', (data) => handleSendDm(io, socket, data));
    socket.on('typing_start', (data) => handleTypingStart(io, socket, data));
    socket.on('typing_stop', (data) => handleTypingStop(io, socket, data));
    socket.on('dm_typing_start', (data) => handleDmTypingStart(io, socket, data));
    socket.on('dm_typing_stop', (data) => handleDmTypingStop(io, socket, data));
    socket.on('edit_message', (data) => handleEditMessage(io, socket, data));
    socket.on('delete_message', (data) => handleDeleteMessage(io, socket, data));
    socket.on('dm_delivered', (data) => handleDmDelivered(io, socket, data));
    socket.on('dm_read', (data) => handleDmRead(io, socket, data));

    // Broadcast new room to all connected clients
    socket.on('room_created', (room) => {
      socket.broadcast.emit('room_created', room);
    });

    socket.on('room_deleted', (data) => {
      socket.broadcast.emit('room_deleted', data);
    });

    // When admin invites someone to a private room, push the room to them
    socket.on('room_invite', (data: { room: unknown; invitedUser: string }) => {
      const sockets = getSocketIdsForUser(data.invitedUser);
      for (const sid of sockets) {
        io.to(sid).emit('room_invite', { room: data.room, invitedBy: socket.data.username });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.username} (${socket.id})`);
      handleDisconnect(io, socket);
      cleanupRateLimit(socket.id);
    });
  });

  return io;
}

export function getIO(): Server {
  return io;
}
