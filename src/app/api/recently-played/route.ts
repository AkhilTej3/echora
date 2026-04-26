import { NextRequest, NextResponse } from "next/server";
import { upsertTrack, addToRecentlyPlayed, getRecentlyPlayed } from "@/lib/db";
import { generateMoodTags } from "@/lib/mood";
import { getUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const track = await req.json();
    const moodTags = generateMoodTags(track.title, track.channelName);

    await upsertTrack({ ...track, moodTags });
    await addToRecentlyPlayed(track.videoId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Recently played error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tracks = await getRecentlyPlayed(user.id);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Get recently played error:", error);
    return NextResponse.json({ error: "Failed to fetch", tracks: [] }, { status: 500 });
  }
}
