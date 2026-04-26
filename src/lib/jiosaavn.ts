const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

interface ArtistRef {
  id: string;
  name: string;
  url?: string;
  image?: { quality: string; link: string }[];
  type?: string;
  role?: string;
}

export interface JioTrack {
  id: string;
  name: string;
  duration: string;
  primaryArtists: string | ArtistRef[];
  image: { quality: string; link: string }[];
  downloadUrl: { quality: string; link: string }[];
  album?: { id: string; name: string };
  year?: string;
  language?: string;
  playCount?: string;
}

export interface JioAlbum {
  id: string;
  name: string;
  year: string;
  songCount: string;
  primaryArtists: string | ArtistRef[];
  image: { quality: string; link: string }[];
  songs?: JioTrack[];
}

export interface JioArtist {
  id: string;
  name: string;
  image: { quality: string; link: string }[];
  followerCount?: string;
  fanCount?: string;
  isVerified?: boolean;
  dominantLanguage?: string;
  dominantType?: string;
  bio?: { text: string }[];
  topSongs?: JioTrack[];
  topAlbums?: JioAlbum[];
}

function getImage(images: { quality: string; link: string }[], size = "500x500"): string {
  const match = images?.find((i) => i.quality === size);
  return match?.link || images?.[images.length - 1]?.link || "";
}

function getStreamUrl(downloadUrl: { quality: string; link: string }[]): string {
  if (!downloadUrl?.length) return "";
  const q320 = downloadUrl.find((d) => d.quality === "320kbps");
  const q160 = downloadUrl.find((d) => d.quality === "160kbps");
  return q320?.link || q160?.link || downloadUrl[downloadUrl.length - 1]?.link || "";
}

function getArtistString(artists: string | ArtistRef[]): string {
  if (typeof artists === "string") return artists;
  if (Array.isArray(artists)) {
    return artists.map((a) => a.name).join(", ");
  }
  return "";
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function formatDuration(seconds: string): string {
  const s = parseInt(seconds, 10);
  if (isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function mapTrack(t: JioTrack) {
  return {
    videoId: t.id,
    title: decodeHtml(t.name),
    thumbnail: getImage(t.image),
    channelName: decodeHtml(getArtistString(t.primaryArtists)),
    duration: formatDuration(t.duration),
    streamUrl: getStreamUrl(t.downloadUrl),
    language: t.language || "",
    album: decodeHtml(t.album?.name || ""),
    albumId: t.album?.id || "",
  };
}

export async function searchSongs(query: string, limit = 20) {
  const res = await fetch(
    `${API_BASE}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data?.results as JioTrack[] || []).map(mapTrack);
}

export async function searchAlbums(query: string, limit = 10) {
  const res = await fetch(
    `${API_BASE}/search/albums?query=${encodeURIComponent(query)}&limit=${limit}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data?.results as JioAlbum[] || []).map((a) => ({
    id: a.id,
    name: decodeHtml(a.name),
    artist: decodeHtml(getArtistString(a.primaryArtists)),
    artwork: getImage(a.image),
    year: a.year || "",
    songCount: a.songCount || "0",
  }));
}

export async function searchArtists(query: string, limit = 10) {
  const res = await fetch(
    `${API_BASE}/search/artists?query=${encodeURIComponent(query)}&limit=${limit}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data?.results as JioArtist[] || []).map((a) => ({
    id: a.id,
    name: decodeHtml(a.name),
    artwork: getImage(a.image),
  }));
}

export async function searchAll(query: string) {
  const [songs, albums, artists] = await Promise.all([
    searchSongs(query, 10),
    searchAlbums(query, 6),
    searchArtists(query, 6),
  ]);
  return { songs, albums, artists };
}

export async function getAlbum(id: string) {
  const res = await fetch(`${API_BASE}/albums?id=${id}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const album = data.data as JioAlbum & {
    songs: JioTrack[];
    primaryArtistsId: string;
    image: { quality: string; link: string }[];
  };
  if (!album) return null;

  return {
    id: album.id,
    name: decodeHtml(album.name),
    artist: decodeHtml(getArtistString(album.primaryArtists)),
    artistId: (album as unknown as Record<string, unknown>).primaryArtistsId as string || "",
    artwork: getImage(album.image),
    year: album.year || "",
    songCount: album.songCount || "0",
    tracks: (album.songs || []).map(mapTrack),
  };
}

export async function getArtist(id: string) {
  const res = await fetch(`${API_BASE}/artists?id=${id}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const artist = data.data as JioArtist;
  if (!artist) return null;

  return {
    id: artist.id,
    name: decodeHtml(artist.name),
    artwork: getImage(artist.image),
    fanCount: artist.fanCount || "0",
    isVerified: artist.isVerified || false,
    topSongs: (artist.topSongs || []).map(mapTrack),
    topAlbums: (artist.topAlbums || []).map((a) => ({
      id: a.id,
      name: decodeHtml(a.name),
      artist: decodeHtml(getArtistString(a.primaryArtists)),
      artwork: getImage(a.image),
      year: a.year || "",
      songCount: a.songCount || "0",
    })),
  };
}

export async function getArtistAlbums(id: string) {
  const res = await fetch(`${API_BASE}/artists/${id}/albums?page=0&sortBy=popularity`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data?.albums as JioAlbum[] || []).map((a) => ({
    id: a.id,
    name: decodeHtml(a.name),
    artist: decodeHtml(getArtistString(a.primaryArtists)),
    artwork: getImage(a.image),
    year: a.year || "",
    songCount: a.songCount || "0",
  }));
}

export async function getSongById(id: string) {
  const res = await fetch(`${API_BASE}/songs?id=${id}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const songs = data.data as JioTrack[];
  if (!songs?.length) return null;
  return mapTrack(songs[0]);
}

export async function getStreamUrlById(id: string): Promise<string | null> {
  const song = await getSongById(id);
  return song?.streamUrl || null;
}
