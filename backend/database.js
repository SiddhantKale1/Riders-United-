import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'riders_united.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & speed
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    callsign TEXT NOT NULL,
    bike_model TEXT DEFAULT 'Motorcycle',
    avatar_color TEXT DEFAULT '#ef4444',
    auth_version INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ride_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    route_title TEXT NOT NULL,
    start_name TEXT NOT NULL,
    dest_name TEXT NOT NULL,
    distance_km REAL NOT NULL,
    duration_minutes REAL NOT NULL,
    avg_speed_kmh REAL NOT NULL,
    mode TEXT NOT NULL DEFAULT 'solo',
    convoy_code TEXT,
    completed_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS active_rides (
    code TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_ride_history_user ON ride_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_ride_history_date ON ride_history(completed_at DESC);
`);

const userColumns = db.prepare('PRAGMA table_info(users)').all();
if (!userColumns.some((column) => column.name === 'auth_version')) {
  db.exec('ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0');
}

console.log(' SQLite database connected & schema verified at:', dbPath);

export const dbService = {
  healthCheck() {
    return db.prepare('SELECT 1 as ok').get()?.ok === 1;
  },

  deleteRideHistoryBefore(timestamp) {
    return db.prepare('DELETE FROM ride_history WHERE completed_at < ?').run(timestamp).changes;
  },

  saveActiveRide(code, data) {
    db.prepare(`INSERT INTO active_rides (code, data, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`)
      .run(code, data, Date.now());
  },

  getActiveRides() {
    return db.prepare('SELECT code, data FROM active_rides ORDER BY updated_at DESC').all();
  },

  deleteActiveRide(code) {
    db.prepare('DELETE FROM active_rides WHERE code = ?').run(code);
  },

  // User Operations
  findUserByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email.trim().toLowerCase());
  },

  findUserById(id) {
    const stmt = db.prepare('SELECT id, email, name, callsign, bike_model as bikeModel, avatar_color as avatarColor, auth_version as authVersion, created_at as createdAt FROM users WHERE id = ?');
    return stmt.get(id);
  },

  findUserCredentials(id) {
    return db.prepare('SELECT password_hash as passwordHash FROM users WHERE id = ?').get(id);
  },

  updatePasswordAndRevokeSessions(id, passwordHash) {
    db.prepare('UPDATE users SET password_hash = ?, auth_version = auth_version + 1 WHERE id = ?').run(passwordHash, id);
    return this.findUserById(id);
  },

  revokeUserSessions(id) {
    db.prepare('UPDATE users SET auth_version = auth_version + 1 WHERE id = ?').run(id);
  },

  createUser({ id, email, passwordHash, name, callsign, bikeModel, avatarColor }) {
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, callsign, bike_model, avatar_color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      email.trim().toLowerCase(),
      passwordHash,
      name.trim(),
      callsign.trim(),
      bikeModel || 'Motorcycle',
      avatarColor || '#ef4444',
      Date.now()
    );
    return this.findUserById(id);
  },

  updateUserProfile(id, { name, callsign, bikeModel, avatarColor }) {
    const stmt = db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          callsign = COALESCE(?, callsign),
          bike_model = COALESCE(?, bike_model),
          avatar_color = COALESCE(?, avatar_color)
      WHERE id = ?
    `);
    stmt.run(name, callsign, bikeModel, avatarColor, id);
    return this.findUserById(id);
  },

  // Ride History Operations
  saveCompletedRide({ id, userId, routeTitle, startName, destName, distanceKm, durationMinutes, avgSpeedKmh, mode, code, completedAt }) {
    const stmt = db.prepare(`
      INSERT INTO ride_history (id, user_id, route_title, start_name, dest_name, distance_km, duration_minutes, avg_speed_kmh, mode, convoy_code, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId || null,
      routeTitle,
      startName,
      destName,
      Number(distanceKm) || 0,
      Number(durationMinutes) || 0,
      Number(avgSpeedKmh) || 0,
      mode || 'solo',
      code || null,
      completedAt || Date.now()
    );

    return this.getRideById(id);
  },

  getRideById(id) {
    const stmt = db.prepare(`
      SELECT id, user_id as userId, route_title as routeTitle, start_name as startName, dest_name as destName,
             distance_km as distanceKm, duration_minutes as durationMinutes, avg_speed_kmh as avgSpeedKmh,
             mode, convoy_code as code, completed_at as completedAt
      FROM ride_history WHERE id = ?
    `);
    return stmt.get(id);
  },

  getRideHistory(userId) {
    let stmt;
    if (userId) {
      stmt = db.prepare(`
        SELECT id, user_id as userId, route_title as routeTitle, start_name as startName, dest_name as destName,
               distance_km as distanceKm, duration_minutes as durationMinutes, avg_speed_kmh as avgSpeedKmh,
               mode, convoy_code as code, completed_at as completedAt
        FROM ride_history
        WHERE user_id = ?
        ORDER BY completed_at DESC
        LIMIT 50
      `);
      return stmt.all(userId);
    } else {
      stmt = db.prepare(`
        SELECT id, user_id as userId, route_title as routeTitle, start_name as startName, dest_name as destName,
               distance_km as distanceKm, duration_minutes as durationMinutes, avg_speed_kmh as avgSpeedKmh,
               mode, convoy_code as code, completed_at as completedAt
        FROM ride_history
        ORDER BY completed_at DESC
        LIMIT 50
      `);
      return stmt.all();
    }
  },

  clearRideHistory(userId) {
    if (userId) {
      const stmt = db.prepare('DELETE FROM ride_history WHERE user_id = ?');
      stmt.run(userId);
    } else {
      const stmt = db.prepare('DELETE FROM ride_history');
      stmt.run();
    }
  }
};
