"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePlayerStore, Track } from "@/store/usePlayerStore";
import { Play, Loader2, MoreHorizontal } from "lucide-react";

interface AlbumData {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  artwork: string;
  year: string;
  songCount: string;
  tracks: Track[];
}

export default function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuTrackId, setMenuTrackId] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const { playWithQueue, addToQueue, currentTrack } = usePlayerStore();

  useEffect(() => {
    function handleClick() { setMenuTrackId(null); }
    if (menuTrackId !== null) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuTrackId]);

  useEffect(() => {
    fetch(`/api/albums/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAlbum(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function playFromTrack(startIndex: number) {
    if (!album) return;
    const tracks = album.tracks;
    const clicked = tracks[startIndex];
    const remaining = tracks.slice(startIndex + 1);
    playWithQueue(clicked, remaining);
  }

  function playAll() {
    if (!album || album.tracks.length === 0) return;
    playWithQueue(album.tracks[0], album.tracks.slice(1));
  }

  function totalDuration() {
    if (!album) return "";
    const total = album.tracks.reduce((sum, t) => {
      const parts = t.duration.split(":");
      return sum + (parseInt(parts[0]) * 60 + parseInt(parts[1] || "0"));
    }, 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `${h} hr ${m} min`;
    return `${m} min`;
  }

  async function openTrackMenu(trackId: string) {
    setMenuTrackId(menuTrackId === trackId ? null : trackId);
    if (menuTrackId !== trackId) {
      const res = await fetch("/api/playlists");
      const data = await res.json();
      setPlaylists(data.playlists || []);
    }
  }

  async function addTrackToPlaylist(trackIndex: number, playlistId: string) {
    if (!album) return;
    const track = album.tracks[trackIndex];
    await fetch("/api/playlists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, track }),
    });
    setMenuTrackId(null);
  }

  async function createPlaylistWithTrack(trackIndex: number) {
    if (!album) return;
    const name = prompt("Playlist name:");
    if (!name) return;
    const track = album.tracks[trackIndex];
    await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, track }),
    });
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
            Album
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-3 leading-tight">
            {album.name}
          </h1>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-[#b3b3b3] flex-wrap">
            {album.artistId ? (
              <Link
                href={`/artist/${album.artistId}`}
                className="font-semibold hover:underline text-white"
              >
                {album.artist}
              </Link>
            ) : (
              <span className="font-semibold text-white">{album.artist}</span>
            )}
            <span className="text-[#b3b3b3]/70">&bull;</span>
            <span>{album.year}</span>
            <span className="text-[#b3b3b3]/70">&bull;</span>
            <span>
              {album.songCount} song{album.songCount !== "1" && "s"}
            </span>
            <span className="text-[#b3b3b3]/70 hidden sm:inline">&bull;</span>
            <span className="text-[#b3b3b3] hidden sm:inline">{totalDuration()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center sm:justify-start gap-4 mb-6">
        <button
          onClick={playAll}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1DB954] flex items-center justify-center hover:scale-105 transition-all shadow-lg"
        >
          <Play size={22} fill="black" color="black" />
        </button>
      </div>

      <div className="border-b border-[#282828] pb-2 mb-2 flex items-center text-xs text-[#b3b3b3] font-medium px-4">
        <span className="w-8 text-center">#</span>
        <span className="flex-1 ml-4">Title</span>
        <span className="w-20 text-right">Duration</span>
      </div>

      {album.tracks.map((track, index) => {
        const isActive = currentTrack?.videoId === track.videoId;

        return (
          <div
            key={track.videoId}
            onClick={() => playFromTrack(index)}
            className={`group flex items-center px-4 py-2.5 rounded-md cursor-pointer transition-colors ${
              isActive ? "bg-[#282828]/80" : "hover:bg-white/5"
            }`}
          >
            <span
              className={`w-8 text-center text-sm tabular-nums ${
                isActive ? "text-[#1DB954]" : "text-[#b3b3b3]"
              }`}
            >
              <span className="group-hover:hidden">{index + 1}</span>
              <span className="hidden group-hover:inline text-white">
                <Play size={14} fill="white" color="white" />
              </span>
            </span>

            <div className="flex-1 ml-4 min-w-0">
              <p
                className={`text-sm font-medium truncate ${
                  isActive ? "text-[#1DB954]" : "text-white"
                }`}
              >
                {track.title}
              </p>
              <p className="text-xs text-[#b3b3b3] truncate">
                {track.channelName}
              </p>
            </div>

            <span className="w-16 text-right text-sm text-[#b3b3b3] tabular-nums">
              {track.duration}
            </span>

            <div className="relative w-8 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openTrackMenu(track.videoId);
                }}
                className="opacity-0 group-hover:opacity-100 text-[#b3b3b3] hover:text-white p-1 transition-opacity"
              >
                <MoreHorizontal size={16} />
              </button>

              {menuTrackId === track.videoId && (
                <div
                  className="absolute right-0 top-8 z-50 w-52 bg-[#282828] rounded-lg shadow-xl py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      addToQueue(track);
                      setMenuTrackId(null);
                    }}
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
