import YouTube from "youtube-sr";

const ITUNES_BASE = "https://itunes.apple.com";

export interface Album {
  id: number;
  name: string;
  artistName: string;
  artistId: number;
  artwork: string;
  trackCount: number;
  releaseDate: string;
  genre: string;
  type: "album" | "single" | "ep";
}

export interface AlbumTrack {
  id: number;
  trackNumber: number;
  name: string;
  artistName: string;
  duration: number;
  artwork: string;
}

export interface Artist {
  id: number;
  name: string;
  artwork: string;
  genre: string;
}

export interface SearchResults {
  albums: Album[];
  artists: Artist[];
  songs: AlbumTrack[];
}

function artworkUrl(url: string, size: number): string {
  return url.replace(/\d+x\d+bb/, `${size}x${size}bb`);
}

function classifyRecordType(name: string, trackCount: number): "album" | "single" | "ep" {
  const lower = name.toLowerCase();
  if (lower.includes("- single") || trackCount === 1) return "single";
  if (lower.includes("- ep") || (trackCount >= 2 && trackCount <= 5)) return "ep";
  return "album";
}

function cleanAlbumName(name: string): string {
  return name
    .replace(/\s*-\s*(Single|EP)$/i, "")
    .replace(/\s*\(Deluxe.*?\)/i, "")
    .trim();
}

export async function searchAll(query: string): Promise<SearchResults> {
  const [albumRes, artistRes, songRes] = await Promise.all([
    fetch(
      `${ITUNES_BASE}/search?term=${encodeURIComponent(query)}&entity=album&limit=10`,
      { signal: AbortSignal.timeout(8000) }
    ).then((r) => r.json()).catch(() => ({ results: [] })),
    fetch(
      `${ITUNES_BASE}/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=6`,
      { signal: AbortSignal.timeout(8000) }
    ).then((r) => r.json()).catch(() => ({ results: [] })),
    fetch(
      `${ITUNES_BASE}/search?term=${encodeURIComponent(query)}&entity=song&limit=10`,
      { signal: AbortSignal.timeout(8000) }
    ).then((r) => r.json()).catch(() => ({ results: [] })),
  ]);

  const albums: Album[] = (albumRes.results || []).map(
    (a: Record<string, unknown>) => ({
      id: a.collectionId as number,
      name: cleanAlbumName(a.collectionName as string),
      artistName: a.artistName as string,
      artistId: a.artistId as number,
      artwork: artworkUrl(a.artworkUrl100 as string, 300),
      trackCount: a.trackCount as number,
      releaseDate: ((a.releaseDate as string) || "").substring(0, 10),
      genre: (a.primaryGenreName as string) || "",
      type: classifyRecordType(
        a.collectionName as string,
        a.trackCount as number
      ),
    })
  );

  const artists: Artist[] = (artistRes.results || []).map(
    (a: Record<string, unknown>) => ({
      id: a.artistId as number,
      name: a.artistName as string,
      artwork: "",
      genre: (a.primaryGenreName as string) || "",
    })
  );

  const songs: AlbumTrack[] = (songRes.results || [])
    .filter((s: Record<string, unknown>) => s.wrapperType === "track")
    .map((s: Record<string, unknown>) => ({
      id: s.trackId as number,
      trackNumber: (s.trackNumber as number) || 0,
      name: s.trackName as string,
      artistName: s.artistName as string,
      duration: Math.floor((s.trackTimeMillis as number) / 1000),
      artwork: artworkUrl(s.artworkUrl100 as string, 300),
    }));

  return { albums, artists, songs };
}

export async function getAlbumWithTracks(albumId: number): Promise<{
  album: Album;
  tracks: AlbumTrack[];
} | null> {
  const res = await fetch(
    `${ITUNES_BASE}/lookup?id=${albumId}&entity=song`,
    { signal: AbortSignal.timeout(8000) }
  );
  const data = await res.json();

  if (!data.results || data.results.length === 0) return null;

  const albumData = data.results.find(
    (r: Record<string, unknown>) => r.wrapperType === "collection"
  );
  if (!albumData) return null;

  const album: Album = {
    id: albumData.collectionId,
    name: cleanAlbumName(albumData.collectionName),
    artistName: albumData.artistName,
    artistId: albumData.artistId,
    artwork: artworkUrl(albumData.artworkUrl100, 600),
    trackCount: albumData.trackCount,
    releaseDate: (albumData.releaseDate || "").substring(0, 10),
    genre: albumData.primaryGenreName || "",
    type: classifyRecordType(albumData.collectionName, albumData.trackCount),
  };

  const tracks: AlbumTrack[] = data.results
    .filter((r: Record<string, unknown>) => r.wrapperType === "track")
    .map((t: Record<string, unknown>) => ({
      id: t.trackId as number,
      trackNumber: (t.trackNumber as number) || 0,
      name: t.trackName as string,
      artistName: t.artistName as string,
      duration: Math.floor((t.trackTimeMillis as number) / 1000),
      artwork: artworkUrl(t.artworkUrl100 as string, 300),
    }));

  return { album, tracks };
}

export async function getArtist(artistId: number): Promise<Artist | null> {
  const res = await fetch(`${ITUNES_BASE}/lookup?id=${artistId}`, {
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json();
  const a = data.results?.[0];
  if (!a) return null;

  return {
    id: a.artistId,
    name: a.artistName,
    artwork: "",
    genre: a.primaryGenreName || "",
  };
}

export async function getArtistAlbums(artistId: number): Promise<Album[]> {
  const res = await fetch(
    `${ITUNES_BASE}/lookup?id=${artistId}&entity=album&limit=50`,
    { signal: AbortSignal.timeout(8000) }
  );
  const data = await res.json();

  return (data.results || [])
    .filter((r: Record<string, unknown>) => r.wrapperType === "collection")
    .map((a: Record<string, unknown>) => ({
      id: a.collectionId as number,
      name: cleanAlbumName(a.collectionName as string),
      artistName: a.artistName as string,
      artistId: a.artistId as number,
      artwork: artworkUrl(a.artworkUrl100 as string, 300),
      trackCount: a.trackCount as number,
      releaseDate: ((a.releaseDate as string) || "").substring(0, 10),
      genre: (a.primaryGenreName as string) || "",
      type: classifyRecordType(
        a.collectionName as string,
        a.trackCount as number
      ),
    }));
}

export async function resolveToYouTube(
  trackName: string,
  artistName: string
): Promise<{
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: string;
} | null> {
  const query = `${trackName} ${artistName}`;
  const results = await YouTube.search(query, { limit: 5, type: "video" });

  const best = results.find((v) => v.id && v.title) || null;
  if (!best) return null;

  return {
    videoId: best.id!,
    title: best.title!,
    thumbnail:
      best.thumbnail?.url ||
      `https://i.ytimg.com/vi/${best.id}/hqdefault.jpg`,
    channelName: best.channel?.name || "Unknown",
    duration:
      best.durationFormatted || formatDuration(best.duration || 0),
  };
}

function formatDuration(ms: number): string {
  if (!ms) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
