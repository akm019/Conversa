import { Socket } from 'socket.io';

export function authMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const username = socket.handshake.auth.username?.trim();
  const avatarId = parseInt(socket.handshake.auth.avatarId, 10) || 1;

  if (!username || typeof username !== 'string') {
    return next(new Error('Username is required'));
  }

  if (username.length > 30) {
    return next(new Error('Username must be 30 characters or less'));
  }

  socket.data.username = username;
  socket.data.avatarId = Math.min(Math.max(avatarId, 1), 5);
  next();
}
