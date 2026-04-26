"use client";

import { useEffect, useState, useRef, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePlayerStore, Track } from "@/store/usePlayerStore";
import { Play, Loader2, MoreHorizontal } from "lucide-react";

interface AlbumData {
  id: number;
  name: string;
  artistName: string;
  artistId: number;
  artwork: string;
  trackCount: number;
  releaseDate: string;
  genre: string;
  type: string;
}

interface AlbumTrack {
  id: number;
  trackNumber: number;
  name: string;
  artistName: string;
  duration: number;
  artwork: string;
}

export default function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<number | null>(null);
  const [resolvingAll, setResolvingAll] = useState(false);
  const [menuTrackId, setMenuTrackId] = useState<number | null>(null);
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const { playWithQueue, addToQueue, currentTrack } = usePlayerStore();

  const resolvedCache = useRef<Map<number, Track>>(new Map());

  useEffect(() => {
    function handleClick() { setMenuTrackId(null); }
    if (menuTrackId !== null) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuTrackId]);

  useEffect(() => {
    fetch(`/api/albums/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAlbum(data.album);
        setTracks(data.tracks || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function resolveTrack(
    track: AlbumTrack,
    albumArt: string
  ): Promise<Track | null> {
    const cached = resolvedCache.current.get(track.id);
    if (cached) return cached;

    try {
      const res = await fetch(
        `/api/resolve?track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(track.artistName)}`
      );
      const yt = await res.json();
      if (yt.videoId) {
        const t: Track = {
          videoId: yt.videoId,
          title: `${track.name} - ${track.artistName}`,
          thumbnail: albumArt || track.artwork,
          channelName: track.artistName,
          duration: yt.duration,
        };
        resolvedCache.current.set(track.id, t);
        return t;
      }
    } catch {}
    return null;
  }

  async function resolveMany(
    albumTracks: AlbumTrack[],
    albumArt: string
  ): Promise<Track[]> {
    const results = await Promise.all(
      albumTracks.map((t) => resolveTrack(t, albumArt))
    );
    return results.filter((t): t is Track => t !== null);
  }

  async function playFromTrack(startIndex: number) {
    if (!album) return;
    const clickedTrack = tracks[startIndex];
    const remaining = tracks.slice(startIndex + 1);

    setResolving(clickedTrack.id);

    const [first, rest] = await Promise.all([
      resolveTrack(clickedTrack, album.artwork),
      resolveMany(remaining, album.artwork),
    ]);

    setResolving(null);

    if (first) {
      playWithQueue(first, rest);
    }
  }

  async function playAll() {
    if (tracks.length === 0 || !album) return;
    setResolvingAll(true);

    const [first, rest] = await Promise.all([
      resolveTrack(tracks[0], album.artwork),
      resolveMany(tracks.slice(1), album.artwork),
    ]);

    setResolvingAll(false);

    if (first) {
      playWithQueue(first, rest);
    }
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function totalDuration() {
    const total = tracks.reduce((sum, t) => sum + t.duration, 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `${h} hr ${m} min`;
    return `${m} min`;
  }

  async function openTrackMenu(trackId: number) {
    setMenuTrackId(menuTrackId === trackId ? null : trackId);
    if (menuTrackId !== trackId) {
      const res = await fetch("/api/playlists");
      const data = await res.json();
      setPlaylists(data.playlists || []);
    }
  }

  async function addTrackToPlaylist(trackIndex: number, playlistId: string) {
    if (!album) return;
    const t = tracks[trackIndex];
    const resolved = await resolveTrack(t, album.artwork);
    if (resolved) {
      await fetch("/api/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, track: resolved }),
      });
    }
    setMenuTrackId(null);
  }

  async function createPlaylistWithTrack(trackIndex: number) {
    if (!album) return;
    const name = prompt("Playlist name:");
    if (!name) return;
    const t = tracks[trackIndex];
    const resolved = await resolveTrack(t, album.artwork);
    if (resolved) {
      await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, track: resolved }),
      });
    }
    setMenuTrackId(null);
  }

  async function addTrackToQueue(trackIndex: number) {
    if (!album) return;
    const t = tracks[trackIndex];
    const resolved = await resolveTrack(t, album.artwork);
    if (resolved) addToQueue(resolved);
    setMenuTrackId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="text-center py-16 text-[#b3b3b3]">Album not found</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-lg overflow-hidden shadow-2xl shrink-0 mx-auto sm:mx-0">
          <Image
            src={album.artwork}
            alt={album.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 160px, 224px"
            unoptimized
          />
        </div>
        <div className="flex flex-col justify-end min-w-0 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-medium text-[#b3b3b3] uppercase tracking-wider mb-1">
            {album.type}
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-3 leading-tight">
            {album.name}
          </h1>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-[#b3b3b3] flex-wrap">
            <Link
              href={`/artist/${album.artistId}`}
              className="font-semibold hover:underline text-white"
            >
              {album.artistName}
            </Link>
            <span className="text-[#b3b3b3]/70">•</span>
            <span>{album.releaseDate.substring(0, 4)}</span>
            <span className="text-[#b3b3b3]/70">•</span>
            <span>
              {album.trackCount} song{album.trackCount !== 1 && "s"}
            </span>
            <span className="text-[#b3b3b3]/70 hidden sm:inline">•</span>
            <span className="text-[#b3b3b3] hidden sm:inline">{totalDuration()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center sm:justify-start gap-4 mb-6">
        <button
          onClick={playAll}
          disabled={resolvingAll}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1DB954] flex items-center justify-center hover:scale-105 transition-all shadow-lg disabled:opacity-60"
        >
          {resolvingAll ? (
            <Loader2 size={22} className="animate-spin text-white" />
          ) : (
            <Play size={22} fill="black" color="black" />
          )}
        </button>
      </div>

      <div className="border-b border-[#282828] pb-2 mb-2 flex items-center text-xs text-[#b3b3b3] font-medium px-4">
        <span className="w-8 text-center">#</span>
        <span className="flex-1 ml-4">Title</span>
        <span className="w-20 text-right">Duration</span>
      </div>

      {tracks.map((track, index) => {
        const isActive =
          currentTrack?.title === `${track.name} - ${track.artistName}`;
        const isLoading = resolving === track.id;

        return (
          <div
            key={track.id}
            onClick={() => !isLoading && !resolvingAll && playFromTrack(index)}
            className={`group flex items-center px-4 py-2.5 rounded-md cursor-pointer transition-colors ${
              isActive ? "bg-[#282828]/80" : "hover:bg-white/5"
            }`}
          >
            <span
              className={`w-8 text-center text-sm tabular-nums ${
                isActive ? "text-[#1DB954]" : "text-[#b3b3b3]"
              }`}
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-[#1DB954]" />
              ) : (
                <span className="group-hover:hidden">
                  {track.trackNumber}
                </span>
              )}
              {!isLoading && (
                <span className="hidden group-hover:inline text-white">
                  <Play size={14} fill="white" color="white" />
                </span>
              )}
            </span>

            <div className="flex-1 ml-4 min-w-0">
              <p
                className={`text-sm font-medium truncate ${
                  isActive ? "text-[#1DB954]" : "text-white"
                }`}
              >
                {track.name}
              </p>
              <p className="text-xs text-[#b3b3b3] truncate">
                {track.artistName}
              </p>
            </div>

            <span className="w-16 text-right text-sm text-[#b3b3b3] tabular-nums">
              {formatDuration(track.duration)}
            </span>

            <div className="relative w-8 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openTrackMenu(track.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-[#b3b3b3] hover:text-white p-1 transition-opacity"
              >
                <MoreHorizontal size={16} />
              </button>

              {menuTrackId === track.id && (
                <div
                  className="absolute right-0 top-8 z-50 w-52 bg-[#282828] rounded-lg shadow-xl py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => addTrackToQueue(index)}
                    className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  >
                    Add to queue
                  </button>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={() => createPlaylistWithTrack(index)}
                    className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  >
                    + New playlist
                  </button>
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => addTrackToPlaylist(index, pl.id)}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                    >
                      Add to {pl.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
