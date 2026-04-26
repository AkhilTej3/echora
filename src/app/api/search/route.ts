import { NextRequest, NextResponse } from "next/server";
import { searchSongs, searchAll } from "@/lib/jiosaavn";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const type = req.nextUrl.searchParams.get("type");

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  try {
    if (type === "songs") {
      const results = await searchSongs(query);
      return NextResponse.json({ results });
    }

    const { songs, albums, artists } = await searchAll(query);
    return NextResponse.json({ songs, albums, artists });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed", songs: [], albums: [], artists: [] },
      { status: 500 }
    );
  }
}
