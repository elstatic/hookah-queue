import Database from "better-sqlite3";
import path from "path";
import { nanoid } from "nanoid";
import type { Room, Participant } from "@/types";

const DB_PATH = path.join(process.cwd(), "hookah_queue.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_token TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      name TEXT NOT NULL,
      user_token TEXT NOT NULL,
      position INTEGER NOT NULL,
      status TEXT DEFAULT 'waiting',
      joined_at INTEGER NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_participants_room
      ON participants(room_id, position);

    CREATE INDEX IF NOT EXISTS idx_rooms_active
      ON rooms(is_active, created_at);
  `);
}

// --- Rooms ---

export function createRoom(name: string): { room: Room; ownerToken: string } {
  const d = getDb();
  const id = nanoid(8);
  const ownerToken = nanoid(16);
  const now = Date.now();

  d.prepare(
    `INSERT INTO rooms (id, name, owner_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, ownerToken, now, now);

  const room = d.prepare(`SELECT * FROM rooms WHERE id = ?`).get(id) as Room;
  return { room, ownerToken };
}

export function getRoom(id: string): Room | undefined {
  return getDb()
    .prepare(`SELECT * FROM rooms WHERE id = ? AND is_active = 1`)
    .get(id) as Room | undefined;
}

export function verifyOwner(roomId: string, ownerToken: string): boolean {
  const room = getDb()
    .prepare(`SELECT owner_token FROM rooms WHERE id = ? AND is_active = 1`)
    .get(roomId) as { owner_token: string } | undefined;
  return room?.owner_token === ownerToken;
}

function touchRoom(roomId: string) {
  getDb()
    .prepare(`UPDATE rooms SET updated_at = ? WHERE id = ?`)
    .run(Date.now(), roomId);
}

// --- Participants / Queue ---

export function getQueue(roomId: string): Participant[] {
  return getDb()
    .prepare(
      `SELECT * FROM participants WHERE room_id = ? AND status != 'done' ORDER BY position`
    )
    .all(roomId) as Participant[];
}

export function addParticipant(
  roomId: string,
  name: string
): Participant {
  const d = getDb();
  const id = nanoid(10);
  const userToken = nanoid(16);
  const now = Date.now();

  // Get next position
  const last = d
    .prepare(
      `SELECT MAX(position) as maxPos FROM participants WHERE room_id = ? AND status != 'done'`
    )
    .get(roomId) as { maxPos: number | null };
  const position = (last.maxPos ?? 0) + 1;

  d.prepare(
    `INSERT INTO participants (id, room_id, name, user_token, position, status, joined_at) VALUES (?, ?, ?, ?, ?, 'waiting', ?)`
  ).run(id, roomId, name, userToken, position, now);

  touchRoom(roomId);

  return d.prepare(`SELECT * FROM participants WHERE id = ?`).get(id) as Participant;
}

export function removeParticipant(roomId: string, participantId: string) {
  const d = getDb();
  const participant = d
    .prepare(`SELECT * FROM participants WHERE id = ? AND room_id = ?`)
    .get(participantId, roomId) as Participant | undefined;

  if (!participant) return;

  d.prepare(`DELETE FROM participants WHERE id = ?`).run(participantId);

  // Shift positions down
  d.prepare(
    `UPDATE participants SET position = position - 1 WHERE room_id = ? AND position > ? AND status != 'done'`
  ).run(roomId, participant.position);

  touchRoom(roomId);
}

export function leaveQueue(roomId: string, userToken: string) {
  const d = getDb();
  const participant = d
    .prepare(
      `SELECT * FROM participants WHERE room_id = ? AND user_token = ? AND status != 'done'`
    )
    .get(roomId, userToken) as Participant | undefined;

  if (!participant) return;

  removeParticipant(roomId, participant.id);
}

export function advanceQueue(roomId: string) {
  const d = getDb();

  // Mark current active as done
  d.prepare(
    `UPDATE participants SET status = 'done' WHERE room_id = ? AND status = 'active'`
  ).run(roomId);

  // Find the first waiting participant
  const next = d
    .prepare(
      `SELECT * FROM participants WHERE room_id = ? AND status = 'waiting' ORDER BY position LIMIT 1`
    )
    .get(roomId) as Participant | undefined;

  if (next) {
    d.prepare(`UPDATE participants SET status = 'active' WHERE id = ?`).run(
      next.id
    );
  }

  // Clean up done participants and reorder
  d.prepare(
    `DELETE FROM participants WHERE room_id = ? AND status = 'done'`
  ).run(roomId);

  // Reindex positions
  const remaining = d
    .prepare(
      `SELECT id FROM participants WHERE room_id = ? AND status != 'done' ORDER BY position`
    )
    .all(roomId) as { id: string }[];

  const updatePos = d.prepare(
    `UPDATE participants SET position = ? WHERE id = ?`
  );
  remaining.forEach((p, i) => updatePos.run(i + 1, p.id));

  touchRoom(roomId);
}

export function reorderQueue(roomId: string, orderedIds: string[]) {
  const d = getDb();

  const updatePos = d.prepare(
    `UPDATE participants SET position = ? WHERE id = ? AND room_id = ?`
  );

  const reorder = d.transaction(() => {
    orderedIds.forEach((id, i) => {
      updatePos.run(i + 1, id, roomId);
    });
  });

  reorder();
  touchRoom(roomId);
}

export function verifyParticipant(
  roomId: string,
  userToken: string
): Participant | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM participants WHERE room_id = ? AND user_token = ? AND status != 'done'`
    )
    .get(roomId, userToken) as Participant | undefined;
}

// --- Cleanup ---

export function cleanupExpiredRooms() {
  const d = getDb();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  const expired = d
    .prepare(`SELECT id FROM rooms WHERE updated_at < ? OR is_active = 0`)
    .all(cutoff) as { id: string }[];

  if (expired.length === 0) return;

  const deleteParticipants = d.prepare(
    `DELETE FROM participants WHERE room_id = ?`
  );
  const deleteRoom = d.prepare(`DELETE FROM rooms WHERE id = ?`);

  const cleanup = d.transaction(() => {
    for (const room of expired) {
      deleteParticipants.run(room.id);
      deleteRoom.run(room.id);
    }
  });

  cleanup();
  console.log(`Cleaned up ${expired.length} expired rooms`);
}
