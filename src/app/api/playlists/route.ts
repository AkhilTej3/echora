import { NextRequest, NextResponse } from "next/server";
import { getDb, upsertTrack } from "@/lib/db";
import { generateMoodTags } from "@/lib/mood";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const playlistId = req.nextUrl.searchParams.get("id");

    if (playlistId) {
      const tracks = db
        .prepare(
          `SELECT t.video_id as videoId, t.title, t.thumbnail, t.channel_name as channelName,
                  t.duration, t.mood_tags as moodTags
           FROM playlist_tracks pt
           JOIN tracks t ON t.video_id = pt.video_id
           WHERE pt.playlist_id = ?
           ORDER BY pt.position`
        )
        .all(playlistId) as Record<string, unknown>[];
      const mappedTracks = tracks.map((t) => ({
          ...t,
          moodTags: t.moodTags ? JSON.parse(t.moodTags as string) : [],
        }));
      return NextResponse.json({ tracks: mappedTracks });
    }

    const playlists = db
      .prepare(
        `SELECT p.*, COUNT(pt.video_id) as track_count
         FROM playlists p
         LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
         GROUP BY p.id
         ORDER BY p.created_at DESC`
      )
      .all();
    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Playlists error:", error);
    return NextResponse.json({ error: "Failed", playlists: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, track } = await req.json();
    const db = getDb();
    const id = uuid();

    db.prepare("INSERT INTO playlists (id, name) VALUES (?, ?)").run(id, name);

    if (track) {
      const moodTags = generateMoodTags(track.title, track.channelName);
      upsertTrack({ ...track, moodTags });
      db.prepare(
        "INSERT INTO playlist_tracks (playlist_id, video_id, position) VALUES (?, ?, 0)"
      ).run(id, track.videoId);
    }

    return NextResponse.json({ id, name });
  } catch (error) {
    console.error("Create playlist error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { playlistId, track } = await req.json();
    const db = getDb();

    const moodTags = generateMoodTags(track.title, track.channelName);
    upsertTrack({ ...track, moodTags });

    const maxPos = db
      .prepare(
        "SELECT COALESCE(MAX(position), -1) as pos FROM playlist_tracks WHERE playlist_id = ?"
      )
      .get(playlistId) as { pos: number };

    db.prepare(
      "INSERT OR IGNORE INTO playlist_tracks (playlist_id, video_id, position) VALUES (?, ?, ?)"
    ).run(playlistId, track.videoId, maxPos.pos + 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add to playlist error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
