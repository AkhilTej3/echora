import { NextResponse } from "next/server";

const ITUNES_BASE = "https://itunes.apple.com/search";

interface ITunesSong {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  trackTimeMillis: number;
  collectionId: number;
}

interface ITunesAlbum {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artistId: number;
  artworkUrl100: string;
  trackCount: number;
  releaseDate: string;
  primaryGenreName: string;
}

function hiResArtwork(url: string): string {
  return url.replace("100x100bb", "300x300bb");
}

function cleanAlbumName(name: string): string {
  return name
    .replace(/\s*-\s*Single$/i, "")
    .replace(/\s*-\s*EP$/i, "")
    .replace(/\s*\(Deluxe[^)]*\)/i, "");
}

function mapSong(item: ITunesSong) {
  return {
    id: item.trackId,
    name: item.trackName,
    artistName: item.artistName,
    artwork: hiResArtwork(item.artworkUrl100),
    duration: Math.floor(item.trackTimeMillis / 1000),
    albumId: item.collectionId,
  };
}

function mapAlbum(item: ITunesAlbum) {
  return {
    id: item.collectionId,
    name: cleanAlbumName(item.collectionName),
    artistName: item.artistName,
    artistId: item.artistId,
    artwork: hiResArtwork(item.artworkUrl100),
    trackCount: item.trackCount,
    releaseDate: item.releaseDate.substring(0, 10),
    genre: item.primaryGenreName,
  };
}

async function fetchSongs(term: string, limit: number) {
  try {
    const url = `${ITUNES_BASE}?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return (data.results as ITunesSong[]).map(mapSong);
  } catch (error) {
    console.error(`Failed to fetch songs for "${term}":`, error);
    return [];
  }
}

async function fetchAlbums(term: string, limit: number) {
  try {
    const url = `${ITUNES_BASE}?term=${encodeURIComponent(term)}&entity=album&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return (data.results as ITunesAlbum[]).map(mapAlbum);
  } catch (error) {
    console.error(`Failed to fetch albums for "${term}":`, error);
    return [];
  }
}

export async function GET() {
  const [trending, newReleases, bollywood, tamil, kpop, chill, workout, romance] =
    await Promise.all([
      fetchSongs("top hits 2025", 10),
      fetchAlbums("new music 2025", 8),
      fetchAlbums("bollywood hits", 6),
      fetchAlbums("tamil hits", 6),
      fetchAlbums("kpop hits", 6),
      fetchSongs("chill vibes lofi", 8),
      fetchSongs("workout motivation", 8),
      fetchSongs("romantic songs", 8),
    ]);

  return NextResponse.json(
    { trending, newReleases, bollywood, tamil, kpop, chill, workout, romance },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    }
  );
}
