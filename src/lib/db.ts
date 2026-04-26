import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "music.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS tracks (
        video_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        thumbnail TEXT,
        channel_name TEXT,
        duration TEXT,
        mood_tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recently_played (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES tracks(video_id)
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlist_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (playlist_id, video_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id),
        FOREIGN KEY (video_id) REFERENCES tracks(video_id)
      );
    `);
  }
  return db;
}

export function upsertTrack(track: {
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: string;
  moodTags: string[];
}) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO tracks (video_id, title, thumbnail, channel_name, duration, mood_tags)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    track.videoId,
    track.title,
    track.thumbnail,
    track.channelName,
    track.duration,
    JSON.stringify(track.moodTags)
  );
}

export function addToRecentlyPlayed(videoId: string) {
  const db = getDb();
  db.prepare("INSERT INTO recently_played (video_id) VALUES (?)").run(videoId);
}

export function getRecentlyPlayed(limit = 20) {
  const db = getDb();
  return db
    .prepare(
      `SELECT t.*, MAX(rp.played_at) as played_at
       FROM recently_played rp
       JOIN tracks t ON t.video_id = rp.video_id
       GROUP BY rp.video_id
       ORDER BY played_at DESC
       LIMIT ?`
    )
    .all(limit);
}
