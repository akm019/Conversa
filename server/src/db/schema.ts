import Database from 'better-sqlite3';

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'room' CHECK(type IN ('room', 'dm')),
      is_private INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(name, type)
    );

    CREATE TABLE IF NOT EXISTS room_members (
      room_id  TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      role     TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
      PRIMARY KEY (room_id, username)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id    TEXT NOT NULL REFERENCES rooms(id),
      username   TEXT NOT NULL,
      avatar_id  INTEGER NOT NULL DEFAULT 1,
      content    TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'user' CHECK(type IN ('user', 'system')),
      file_url   TEXT,
      file_type  TEXT,
      file_name  TEXT,
      forwarded  INTEGER NOT NULL DEFAULT 0,
      status     TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'read')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_room_id
      ON messages(room_id, id DESC);

    INSERT OR IGNORE INTO rooms (id, name, type, is_private, created_by) VALUES ('general', 'General', 'room', 0, NULL);
  `);
}
