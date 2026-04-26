import { NextRequest, NextResponse } from "next/server";
import { resolveToYouTube } from "@/lib/music";

export async function GET(req: NextRequest) {
  const track = req.nextUrl.searchParams.get("track");
  const artist = req.nextUrl.searchParams.get("artist");

  if (!track) {
    return NextResponse.json({ error: "track required" }, { status: 400 });
  }

  try {
    const result = await resolveToYouTube(track, artist || "");
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Resolve error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
