import { NextRequest, NextResponse } from "next/server";
import { searchYouTube } from "@/lib/youtube";
import { searchAll } from "@/lib/music";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const type = req.nextUrl.searchParams.get("type") || "all";

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  try {
    if (type === "youtube") {
      let results;
      try {
        results = await searchYouTube(query);
      } catch {
        results = await searchYouTube(query);
      }
      return NextResponse.json({ results });
    }

    const [music, videos] = await Promise.all([
      searchAll(query),
      searchYouTube(query).catch(() => searchYouTube(query)),
    ]);

    return NextResponse.json({
      albums: music.albums,
      artists: music.artists,
      songs: music.songs,
      videos,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed", results: [], albums: [], artists: [], songs: [], videos: [] },
      { status: 500 }
    );
  }
}
