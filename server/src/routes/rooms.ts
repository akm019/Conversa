import { Router, Request, Response } from 'express';
import { getRoomsForUser, createRoom, getRoomById, deleteRoom, isRoomAdmin, addRoomMember, getRoomMembers } from '../db/queries';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const username = req.query.username;
  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: 'Username query parameter is required' });
    return;
  }
  const rooms = getRoomsForUser(username);
  res.json(rooms);
});

router.post('/', (req: Request, res: Response) => {
  const { name, createdBy, isPrivate } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Room name is required' });
    return;
  }
  if (!createdBy || typeof createdBy !== 'string') {
    res.status(400).json({ error: 'createdBy is required' });
    return;
  }

  const trimmed = name.trim();
  if (trimmed.length > 50) {
    res.status(400).json({ error: 'Room name must be 50 characters or less' });
    return;
  }

  const id = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (getRoomById(id)) {
    res.status(409).json({ error: 'A room with this name already exists' });
    return;
  }

  const room = createRoom(id, trimmed, createdBy, !!isPrivate);
  res.status(201).json(room);
});

// Delete a room (admin only)
router.delete('/:roomId', (req: Request<{ roomId: string }>, res: Response) => {
  const { roomId } = req.params;
  const username = req.query.username;

  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  const room = getRoomById(roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  if (roomId === 'general') {
    res.status(403).json({ error: 'Cannot delete the General room' });
    return;
  }
  if (room.created_by !== username && !isRoomAdmin(roomId, username)) {
    res.status(403).json({ error: 'Only the room admin can delete this room' });
    return;
  }

  deleteRoom(roomId);
  res.json({ success: true });
});

// Add member to a private room (admin only)
router.post('/:roomId/members', (req: Request<{ roomId: string }>, res: Response) => {
  const { roomId } = req.params;
  const { username, addedBy } = req.body;

  if (!username || !addedBy) {
    res.status(400).json({ error: 'username and addedBy are required' });
    return;
  }

  const room = getRoomById(roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  if (!isRoomAdmin(roomId, addedBy)) {
    res.status(403).json({ error: 'Only room admin can add members' });
    return;
  }

  addRoomMember(roomId, username);
  res.json({ success: true });
});

// Get room members
router.get('/:roomId/members', (req: Request<{ roomId: string }>, res: Response) => {
  const { roomId } = req.params;
  const members = getRoomMembers(roomId);
  res.json(members);
});

export default router;
