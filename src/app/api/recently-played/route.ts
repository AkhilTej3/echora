import { NextRequest, NextResponse } from "next/server";
import { upsertTrack, addToRecentlyPlayed, getRecentlyPlayed } from "@/lib/db";
import { generateMoodTags } from "@/lib/mood";

export async function POST(req: NextRequest) {
  try {
    const track = await req.json();
    const moodTags = generateMoodTags(track.title, track.channelName);

    upsertTrack({ ...track, moodTags });
    addToRecentlyPlayed(track.videoId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Recently played error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const tracks = getRecentlyPlayed();
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Get recently played error:", error);
    return NextResponse.json({ error: "Failed to fetch", tracks: [] }, { status: 500 });
  }
}
