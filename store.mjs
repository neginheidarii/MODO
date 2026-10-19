import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadSqlite() {
  return createRequire(import.meta.url)('node:sqlite');
}

function userFrom(row) {
  if (!row) return null;
  return { ...row, verified: Boolean(row.verified) };
}

function sqliteStore(dataDir) {
  const { DatabaseSync } = loadSqlite();
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(dataDir, 'modo.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,verified INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS workspaces(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,revision INTEGER NOT NULL,data TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS email_tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,expires_at INTEGER NOT NULL);`);
  const userByEmail = db.prepare('SELECT * FROM users WHERE email=?');
  const session = db.prepare('SELECT s.user_id,s.csrf,s.expires_at,u.email,u.display_name,u.verified FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?');
  const workspace = db.prepare('SELECT data,revision FROM workspaces WHERE user_id=?');
  const token = db.prepare('SELECT user_id,kind,expires_at FROM email_tokens WHERE token_hash=?');
  return {
    kind: 'sqlite',
    async prepare() {},
    async purgeExpired(now) {
      db.prepare('DELETE FROM sessions WHERE expires_at<?').run(now);
      db.prepare('DELETE FROM email_tokens WHERE expires_at<?').run(now);
    },
    async userByEmail(email) { return userFrom(userByEmail.get(email)); },
    async insertUser(user) {
      db.prepare('INSERT INTO users(id,email,display_name,password_hash,verified,created_at) VALUES(?,?,?,?,?,?)').run(user.id, user.email, user.display_name, user.password_hash, user.verified ? 1 : 0, user.created_at);
    },
    async deleteUser(id) { db.prepare('DELETE FROM users WHERE id=?').run(id); },
    async markVerified(id) { db.prepare('UPDATE users SET verified=1 WHERE id=?').run(id); },
    async setPassword(id, passwordHash, verify) {
      if (verify) db.prepare('UPDATE users SET password_hash=?,verified=1 WHERE id=?').run(passwordHash, id);
      else db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash, id);
    },
    async sessionByHash(tokenHash) { return userFrom(session.get(tokenHash)); },
    async insertSession(tokenHash, userId, csrf, expiresAt) {
      db.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').run(tokenHash, userId, csrf, expiresAt);
    },
    async deleteSession(tokenHash) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash); },
    async deleteOtherSessions(userId, tokenHash) { db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(userId, tokenHash); },
    async deleteSessionsForUser(userId) { db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId); },
    async workspace(userId) {
      const row = workspace.get(userId);
      return row ? { data: JSON.parse(row.data), revision: row.revision } : null;
    },
    async insertWorkspace(userId, revision, data, updatedAt) {
      db.prepare('INSERT INTO workspaces(user_id,revision,data,updated_at) VALUES(?,?,?,?)').run(userId, revision, JSON.stringify(data), updatedAt);
    },
    async updateWorkspace(userId, expectedRevision, nextRevision, data, updatedAt) {
      const result = db.prepare('UPDATE workspaces SET revision=?,data=?,updated_at=? WHERE user_id=? AND revision=?').run(nextRevision, JSON.stringify(data), updatedAt, userId, expectedRevision);
      return result.changes === 1;
    },
    async emailToken(tokenHash) { return token.get(tokenHash) || null; },
    async replaceEmailToken(userId, kind, tokenHash, expiresAt) {
      db.prepare('DELETE FROM email_tokens WHERE user_id=? AND kind=?').run(userId, kind);
      db.prepare('INSERT INTO email_tokens(token_hash,user_id,kind,expires_at) VALUES(?,?,?,?)').run(tokenHash, userId, kind, expiresAt);
    },
    async deleteEmailTokens(userId, kind) {
      if (kind) db.prepare('DELETE FROM email_tokens WHERE user_id=? AND kind=?').run(userId, kind);
      else db.prepare('DELETE FROM email_tokens WHERE user_id=?').run(userId);
    }
  };
}

function raise(error) {
  if (!error) return;
  const err = Error(error.code === '23505' ? 'That record already exists.' : error.code === '42501' ? 'The Supabase key cannot write accounts. Use the secret key from Project Settings → API Keys.' : 'Database request failed.');
  err.status = error.code === '23505' ? 409 : error.code === '42501' ? 503 : 500;
  err.code = error.code === '23505' ? 'exists' : 'db';
  console.error('Supabase error', error.code || 'unknown');
  throw err;
}

function supabaseStore(url, serviceKey) {
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    kind: 'supabase',
    client: supabase,
    async prepare() {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        console.error('Supabase connection failed', error.code || 'unknown');
        const err = Error('Could not reach Supabase. Apply supabase/migrations/20261018120000_modo.sql, then check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
        err.status = 503;
        throw err;
      }
    },
    async purgeExpired(now) {
      raise((await supabase.from('sessions').delete().lt('expires_at', now)).error);
      raise((await supabase.from('email_tokens').delete().lt('expires_at', now)).error);
    },
    async userByEmail(email) {
      const { data, error } = await supabase.from('users').select('id,email,display_name,password_hash,verified,created_at').eq('email', email).maybeSingle();
      raise(error);
      return userFrom(data);
    },
    async insertUser(user) {
      raise((await supabase.from('users').insert({ ...user, verified: Boolean(user.verified) })).error);
    },
    async deleteUser(id) { raise((await supabase.from('users').delete().eq('id', id)).error); },
    async markVerified(id) { raise((await supabase.from('users').update({ verified: true }).eq('id', id)).error); },
    async setPassword(id, passwordHash, verify) {
      const patch = verify ? { password_hash: passwordHash, verified: true } : { password_hash: passwordHash };
      raise((await supabase.from('users').update(patch).eq('id', id)).error);
    },
    async sessionByHash(tokenHash) {
      const { data, error } = await supabase.from('sessions').select('user_id,csrf,expires_at,users!inner(email,display_name,verified)').eq('token_hash', tokenHash).maybeSingle();
      raise(error);
      if (!data) return null;
      return userFrom({ user_id: data.user_id, csrf: data.csrf, expires_at: Number(data.expires_at), email: data.users.email, display_name: data.users.display_name, verified: data.users.verified });
    },
    async insertSession(tokenHash, userId, csrf, expiresAt) {
      raise((await supabase.from('sessions').insert({ token_hash: tokenHash, user_id: userId, csrf, expires_at: expiresAt })).error);
    },
    async deleteSession(tokenHash) { raise((await supabase.from('sessions').delete().eq('token_hash', tokenHash)).error); },
    async deleteOtherSessions(userId, tokenHash) { raise((await supabase.from('sessions').delete().eq('user_id', userId).neq('token_hash', tokenHash)).error); },
    async deleteSessionsForUser(userId) { raise((await supabase.from('sessions').delete().eq('user_id', userId)).error); },
    async workspace(userId) {
      const { data, error } = await supabase.from('workspaces').select('data,revision').eq('user_id', userId).maybeSingle();
      raise(error);
      return data ? { data: data.data, revision: data.revision } : null;
    },
    async insertWorkspace(userId, revision, data, updatedAt) {
      raise((await supabase.from('workspaces').insert({ user_id: userId, revision, data, updated_at: updatedAt })).error);
    },
    async updateWorkspace(userId, expectedRevision, nextRevision, data, updatedAt) {
      const { data: rows, error } = await supabase.from('workspaces').update({ revision: nextRevision, data, updated_at: updatedAt }).eq('user_id', userId).eq('revision', expectedRevision).select('revision');
      raise(error);
      return Array.isArray(rows) && rows.length === 1;
    },
    async emailToken(tokenHash) {
      const { data, error } = await supabase.from('email_tokens').select('user_id,kind,expires_at').eq('token_hash', tokenHash).maybeSingle();
      raise(error);
      return data ? { ...data, expires_at: Number(data.expires_at) } : null;
    },
    async replaceEmailToken(userId, kind, tokenHash, expiresAt) {
      raise((await supabase.from('email_tokens').delete().eq('user_id', userId).eq('kind', kind)).error);
      raise((await supabase.from('email_tokens').insert({ token_hash: tokenHash, user_id: userId, kind, expires_at: expiresAt })).error);
    },
    async deleteEmailTokens(userId, kind) {
      const query = supabase.from('email_tokens').delete().eq('user_id', userId);
      raise((await (kind ? query.eq('kind', kind) : query)).error);
    }
  };
}

function publishableKey(key) {
  if (key.startsWith('sb_publishable_')) return true;
  if (!key.startsWith('eyJ')) return false;
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
    return payload.role === 'anon';
  } catch {
    return false;
  }
}

function missingSupabaseStore(message = 'Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Vercel project settings.') {
  const fail = () => { const err = Error(message); err.status = 503; throw err; };
  return { kind: 'unconfigured', async prepare() { fail(); }, async purgeExpired() {}, async userByEmail() { fail(); }, async insertUser() { fail(); }, async deleteUser() { fail(); }, async markVerified() { fail(); }, async setPassword() { fail(); }, async sessionByHash() { fail(); }, async insertSession() { fail(); }, async deleteSession() { fail(); }, async deleteOtherSessions() { fail(); }, async deleteSessionsForUser() { fail(); }, async workspace() { fail(); }, async insertWorkspace() { fail(); }, async updateWorkspace() { fail(); }, async emailToken() { fail(); }, async replaceEmailToken() { fail(); }, async deleteEmailTokens() { fail(); } };
}

function supabaseProjectUrl(value) {
  const url = new URL(String(value).trim());
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    const err = Error('SUPABASE_URL must be the project URL, for example https://your-project.supabase.co.');
    err.status = 503;
    throw err;
  }
  return url.origin;
}

export function openStore({ dataDir }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key && publishableKey(key)) return missingSupabaseStore('The Supabase key cannot write accounts. In Supabase, open Project Settings → API Keys and put the secret key in SUPABASE_SERVICE_ROLE_KEY.');
  if (url && key) return supabaseStore(supabaseProjectUrl(url), key);
  if (process.env.VERCEL) return missingSupabaseStore();
  return sqliteStore(dataDir);
}

export async function importLocalSqlite(supabase, sqlitePath) {
  if (!existsSync(sqlitePath)) return { copied: 0, skipped: 'no-local-database' };
  const { count, error } = await supabase.from('users').select('id', { count: 'exact', head: true });
  if (error) throw Error('Could not read Supabase before copying the local database.');
  if (count) return { copied: 0, skipped: 'supabase-already-has-accounts' };
  const { DatabaseSync } = loadSqlite();
  const db = new DatabaseSync(sqlitePath, { readOnly: true });
  const users = db.prepare('SELECT id,email,display_name,password_hash,verified,created_at FROM users').all();
  const workspaces = db.prepare('SELECT user_id,revision,data,updated_at FROM workspaces').all();
  db.close();
  if (!users.length) return { copied: 0, skipped: 'local-database-empty' };
  const { error: userError } = await supabase.from('users').insert(users.map(user => ({ ...user, verified: Boolean(user.verified) })));
  if (userError) throw Error('Could not copy accounts to Supabase.');
  const rows = [];
  for (const workspace of workspaces) {
    try { rows.push({ user_id: workspace.user_id, revision: workspace.revision, data: JSON.parse(workspace.data), updated_at: workspace.updated_at }); }
    catch { /* skip a workspace that is not valid JSON */ }
  }
  if (rows.length) {
    const { error: workspaceError } = await supabase.from('workspaces').insert(rows);
    if (workspaceError) throw Error('Could not copy workspaces to Supabase.');
  }
  return { copied: users.length, workspaces: rows.length };
}
