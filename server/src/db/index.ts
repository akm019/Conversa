import Database from 'better-sqlite3';
import { config } from '../config';
import { initSchema } from './schema';

const db: InstanceType<typeof Database> = new Database(config.dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

initSchema(db);

export default db;
