import db from './index';
import { Room, Message, PaginatedMessages } from '../types';
import { config } from '../config';

export function getRoomsForUser(username: string): Room[] {
  // Public rooms + private rooms where user is a member
  return db.prepare(`
    SELECT DISTINCT r.* FROM rooms r
    LEFT JOIN room_members rm ON r.id = rm.room_id
    WHERE r.type = 'room' AND (r.is_private = 0 OR rm.username = ?)
    ORDER BY r.created_at ASC
  `).all(username) as Room[];
}

export function createRoom(id: string, name: string, createdBy: string, isPrivate: boolean): Room {
  db.prepare("INSERT INTO rooms (id, name, type, is_private, created_by) VALUES (?, ?, 'room', ?, ?)").run(id, name, isPrivate ? 1 : 0, createdBy);
  // Creator is auto-added as admin
  db.prepare("INSERT INTO room_members (room_id, username, role) VALUES (?, ?, 'admin')").run(id, createdBy);
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room;
}

export function deleteRoom(id: string): void {
  db.prepare('DELETE FROM messages WHERE room_id = ?').run(id);
  db.prepare('DELETE FROM room_members WHERE room_id = ?').run(id);
  db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
}

export function getRoomById(id: string): Room | undefined {
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room | undefined;
}

export function isRoomMember(roomId: string, username: string): boolean {
  const row = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND username = ?').get(roomId, username);
  return !!row;
}

export function isRoomAdmin(roomId: string, username: string): boolean {
  const row = db.prepare("SELECT 1 FROM room_members WHERE room_id = ? AND username = ? AND role = 'admin'").get(roomId, username);
  return !!row;
}

export function addRoomMember(roomId: string, username: string, role: 'admin' | 'member' = 'member'): void {
  db.prepare('INSERT OR IGNORE INTO room_members (room_id, username, role) VALUES (?, ?, ?)').run(roomId, username, role);
}

export function getRoomMembers(roomId: string): { username: string; role: string }[] {
  return db.prepare('SELECT username, role FROM room_members WHERE room_id = ?').all(roomId) as { username: string; role: string }[];
}

// DM queries
export function getDmRoomId(user1: string, user2: string): string {
  const sorted = [user1, user2].sort();
  return `dm:${sorted[0]}:${sorted[1]}`;
}

export function getOrCreateDm(user1: string, user2: string): Room {
  const id = getDmRoomId(user1, user2);
  const existing = getRoomById(id);
  if (existing) return existing;

  const name = `${user1}, ${user2}`;
  db.prepare("INSERT INTO rooms (id, name, type) VALUES (?, ?, 'dm')").run(id, name);
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room;
}

export function getDmsForUser(username: string): Room[] {
  return db.prepare(
    "SELECT * FROM rooms WHERE type = 'dm' AND id LIKE ? ORDER BY created_at DESC"
  ).all(`%:${username}:%`) as Room[];
}

// We need a better approach for getDmsForUser since the LIKE above could match partial names.
// Instead, fetch all DMs and filter in JS.
export function getDmsForUserSafe(username: string): Room[] {
  const allDms = db.prepare("SELECT * FROM rooms WHERE type = 'dm'").all() as Room[];
  return allDms.filter((dm) => {
    const parts = dm.id.split(':');
    return parts[1] === username || parts[2] === username;
  });
}

export function getMessages(roomId: string, before?: number): PaginatedMessages {
  const limit = config.messagePageSize;

  let messages: Message[];
  if (before) {
    messages = db
      .prepare(
        'SELECT * FROM messages WHERE room_id = ? AND id < ? ORDER BY id DESC LIMIT ?'
      )
      .all(roomId, before, limit + 1) as Message[];
  } else {
    messages = db
      .prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT ?')
      .all(roomId, limit + 1) as Message[];
  }

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  messages.reverse();

  return { messages, hasMore };
}

export function markMessagesDelivered(roomId: string, recipientUsername: string): number[] {
  const msgs = db.prepare(
    "SELECT id FROM messages WHERE room_id = ? AND username != ? AND status = 'sent'"
  ).all(roomId, recipientUsername) as { id: number }[];
  if (msgs.length === 0) return [];
  const ids = msgs.map((m) => m.id);
  db.prepare(
    `UPDATE messages SET status = 'delivered' WHERE id IN (${ids.join(',')}) AND status = 'sent'`
  ).run();
  return ids;
}

export function markMessagesRead(roomId: string, recipientUsername: string): number[] {
  const msgs = db.prepare(
    "SELECT id FROM messages WHERE room_id = ? AND username != ? AND status IN ('sent', 'delivered')"
  ).all(roomId, recipientUsername) as { id: number }[];
  if (msgs.length === 0) return [];
  const ids = msgs.map((m) => m.id);
  db.prepare(
    `UPDATE messages SET status = 'read' WHERE id IN (${ids.join(',')})`
  ).run();
  return ids;
}

export function getMessageById(id: number): Message | undefined {
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message | undefined;
}

export function updateMessageContent(id: number, content: string): Message | undefined {
  db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(content, id);
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message | undefined;
}

export function deleteMessage(id: number): void {
  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
}

export function insertMessage(
  roomId: string,
  username: string,
  content: string,
  type: 'user' | 'system' = 'user',
  avatarId: number = 1,
  fileUrl: string | null = null,
  fileType: string | null = null,
  fileName: string | null = null,
  forwarded: boolean = false
): Message {
  const result = db
    .prepare(
      'INSERT INTO messages (room_id, username, avatar_id, content, type, file_url, file_type, file_name, forwarded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(roomId, username, avatarId, content, type, fileUrl, fileType, fileName, forwarded ? 1 : 0);

  return db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid) as Message;
}
