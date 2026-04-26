import { NextRequest, NextResponse } from "next/server";
import { supabase, upsertTrack } from "@/lib/db";
import { generateMoodTags } from "@/lib/mood";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const playlistId = req.nextUrl.searchParams.get("id");

    if (playlistId) {
      const { data, error } = await supabase
        .from("playlist_tracks")
        .select("position, tracks(*)")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: true });

      if (error) throw error;

      const tracks = (data || []).map((row) => {
        const t = row.tracks as unknown as Record<string, unknown>;
        return {
          videoId: t.video_id,
          title: t.title,
          thumbnail: t.thumbnail,
          channelName: t.channel_name,
          duration: t.duration,
          moodTags: t.mood_tags ? JSON.parse(t.mood_tags as string) : [],
        };
      });

      return NextResponse.json({ tracks });
    }

    const { data, error } = await supabase
      .from("playlists")
      .select("*, playlist_tracks(count)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const playlists = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      track_count: (p.playlist_tracks as { count: number }[])?.[0]?.count ?? 0,
    }));

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Playlists error:", error);
    return NextResponse.json({ error: "Failed", playlists: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, track } = await req.json();
    const id = uuid();

    const { error } = await supabase.from("playlists").insert({ id, name });
    if (error) throw error;

    if (track) {
      const moodTags = generateMoodTags(track.title, track.channelName);
      await upsertTrack({ ...track, moodTags });
      await supabase
        .from("playlist_tracks")
        .insert({ playlist_id: id, video_id: track.videoId, position: 0 });
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

    const moodTags = generateMoodTags(track.title, track.channelName);
    await upsertTrack({ ...track, moodTags });

    const { data: maxRow } = await supabase
      .from("playlist_tracks")
      .select("position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const nextPos = maxRow ? maxRow.position + 1 : 0;

    await supabase
      .from("playlist_tracks")
      .upsert(
        { playlist_id: playlistId, video_id: track.videoId, position: nextPos },
        { onConflict: "playlist_id,video_id" }
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add to playlist error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
