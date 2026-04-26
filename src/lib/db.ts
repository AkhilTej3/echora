import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export { supabase };

export async function upsertTrack(track: {
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: string;
  moodTags: string[];
}) {
  await supabase.from("tracks").upsert(
    {
      video_id: track.videoId,
      title: track.title,
      thumbnail: track.thumbnail,
      channel_name: track.channelName,
      duration: track.duration,
      mood_tags: JSON.stringify(track.moodTags),
    },
    { onConflict: "video_id" }
  );
}

export async function addToRecentlyPlayed(videoId: string) {
  await supabase.from("recently_played").insert({ video_id: videoId });
}

export async function getRecentlyPlayed(limit = 20) {
  const { data, error } = await supabase
    .from("recently_played")
    .select("video_id, played_at, tracks(*)")
    .order("played_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const seen = new Set<string>();
  const deduped: Record<string, unknown>[] = [];
  for (const row of data || []) {
    if (!seen.has(row.video_id)) {
      seen.add(row.video_id);
      const t = row.tracks as Record<string, unknown>;
      deduped.push({
        video_id: t.video_id,
        title: t.title,
        thumbnail: t.thumbnail,
        channel_name: t.channel_name,
        duration: t.duration,
        mood_tags: t.mood_tags,
        played_at: row.played_at,
      });
      if (deduped.length >= limit) break;
    }
  }
  return deduped;
}
