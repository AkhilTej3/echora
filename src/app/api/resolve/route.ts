import { NextRequest, NextResponse } from "next/server";
import { searchSongs } from "@/lib/jiosaavn";

export async function GET(req: NextRequest) {
  const track = req.nextUrl.searchParams.get("track");
  const artist = req.nextUrl.searchParams.get("artist");

  if (!track) {
    return NextResponse.json({ error: "track required" }, { status: 400 });
  }

  try {
    const query = artist ? `${track} ${artist}` : track;
    const results = await searchSongs(query, 1);
    if (results.length > 0) {
      return NextResponse.json(results[0]);
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("Resolve error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
