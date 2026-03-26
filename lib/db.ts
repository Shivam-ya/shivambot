/**
 * lib/db.ts
 * SQLite persistence layer using better-sqlite3.
 * The database file lives at <project-root>/data/SHIVAM Chatbot.db
 * (auto-created on first run).
 *
 * ⚠ Import this ONLY in Node.js runtime code (API routes / Server Actions).
 *   Never import it in Edge runtimes or client components.
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ── Database path ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "SHIVAM Chatbot v2.db");
const db = new Database(DB_PATH);

// Enable WAL for better concurrency
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT    PRIMARY KEY,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id          TEXT    PRIMARY KEY,
    user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id          TEXT    PRIMARY KEY,
    session_id  TEXT    NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        TEXT    NOT NULL CHECK(role IN ('user','assistant','system')),
    content     TEXT    NOT NULL,
    model       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Types ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  created_at: string;
}

// ── Helper: tiny nanoid replacement ──────────────────────────────────────
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Sessions ───────────────────────────────────────────────────────────────
export function createSession(userId: string, title: string): ChatSession {
  const id = uid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, userId, title, now, now);
  return { id, user_id: userId, title, created_at: now, updated_at: now };
}

export function getSessions(userId: string): ChatSession[] {
  return db
    .prepare(`SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC`)
    .all(userId) as ChatSession[];
}

export function deleteSession(id: string, userId: string): void {
  db.prepare(`DELETE FROM chat_sessions WHERE id = ? AND user_id = ?`).run(id, userId);
}

export function touchSession(id: string): void {
  db.prepare(
    `UPDATE chat_sessions SET updated_at = datetime('now') WHERE id = ?`
  ).run(id);
}

// ── Messages ───────────────────────────────────────────────────────────────
export function getMessages(sessionId: string): ChatMessage[] {
  return db
    .prepare(
      `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`
    )
    .all(sessionId) as ChatMessage[];
}

export function saveMessage(
  msg: Omit<ChatMessage, "id" | "created_at">
): ChatMessage {
  const id = uid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_messages (id, session_id, role, content, model, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, msg.session_id, msg.role, msg.content, msg.model ?? null, now);
  touchSession(msg.session_id);
  return { ...msg, id, created_at: now };
}

export function deleteMessage(id: string): void {
  db.prepare(`DELETE FROM chat_messages WHERE id = ?`).run(id);
}

// ── Users ──────────────────────────────────────────────────────────────────
export function createUser(email: string, passwordHash: string): User {
  const id = uid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`
  ).run(id, email, passwordHash, now);
  return { id, email, password_hash: passwordHash, created_at: now };
}

export function getUserByEmail(email: string): User | undefined {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as User | undefined;
}

export default db;
