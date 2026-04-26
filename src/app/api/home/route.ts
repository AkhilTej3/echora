import { NextResponse } from "next/server";
import { searchSongs, searchAlbums } from "@/lib/jiosaavn";

let cache: { data: Record<string, unknown>; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  }

  try {
    const [trending, newReleases, telugu, hindi, english, punjabi, bollywood, tamil, kpop, chill, workout, romance] =
      await Promise.all([
        searchSongs("top hits 2025", 12),
        searchAlbums("new music 2025", 8),
        searchAlbums("telugu hits", 6),
        searchAlbums("hindi hits", 6),
        searchAlbums("english pop hits", 6),
        searchAlbums("punjabi hits", 6),
        searchAlbums("bollywood hits", 6),
        searchAlbums("tamil hits", 6),
        searchAlbums("kpop hits", 6),
        searchSongs("chill vibes lofi", 8),
        searchSongs("workout motivation", 8),
        searchSongs("romantic songs", 8),
      ]);

    const data = { trending, newReleases, telugu, hindi, english, punjabi, bollywood, tamil, kpop, chill, workout, romance };
    cache = { data, ts: Date.now() };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (error) {
    console.error("Home error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
