"use client";

import Image from "next/image";
import { Track, usePlayerStore } from "@/store/usePlayerStore";
import { useState, useRef, useEffect } from "react";
import { Play, Pause, Music, MoreHorizontal, ListPlus, Plus } from "lucide-react";

export default function TrackCard({
  track,
  showAdd = true,
}: {
  track: Track;
  showAdd?: boolean;
}) {
  const { play, addToQueue, currentTrack, isPlaying } = usePlayerStore();
  const isActive = currentTrack?.videoId === track.videoId;
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlists, setPlaylists] = useState<
    { id: string; name: string }[]
  >([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleMenu() {
    setMenuOpen(!menuOpen);
    if (!menuOpen) {
      const res = await fetch("/api/playlists");
      const data = await res.json();
      setPlaylists(data.playlists || []);
    }
  }

  async function addToPlaylist(playlistId: string) {
    await fetch("/api/playlists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, track }),
    });
    setMenuOpen(false);
  }

  async function createAndAdd() {
    const name = prompt("Playlist name:");
    if (!name) return;
    await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, track }),
    });
    setMenuOpen(false);
  }

  return (
    <div
      className={`group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/5 ${
        isActive ? "bg-[#282828] ring-1 ring-[#1DB954]/30" : ""
      }`}
    >
      <div
        className="relative w-12 h-12 rounded overflow-hidden shrink-0"
        onClick={() => play(track)}
      >
        {track.thumbnail ? (
          <Image
            src={track.thumbnail}
            alt={track.title}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-[#282828]/60 flex items-center justify-center text-[#b3b3b3]">
            <Music size={18} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isActive && isPlaying ? (
            <Pause size={16} className="text-[#1DB954]" />
          ) : (
            <Play size={16} fill="white" className="text-white ml-0.5" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0" onClick={() => play(track)}>
        <p
          className={`text-sm font-medium truncate ${
            isActive ? "text-[#1DB954]" : "text-white"
          }`}
        >
          {track.title}
        </p>
        <p className="text-xs text-[#b3b3b3] truncate">{track.channelName}</p>
      </div>

      <span className="text-xs text-[#b3b3b3]/70 tabular-nums mr-1">
        {track.duration}
      </span>

      {showAdd && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMenu();
            }}
            className="opacity-0 group-hover:opacity-100 text-[#b3b3b3] hover:text-white p-1 transition-opacity"
            title="More options"
          >
            <MoreHorizontal size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-50 w-52 bg-[#282828] border border-[#282828]/50 rounded-lg shadow-xl py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToQueue(track);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-[#282828]/60"
              >
                Add to queue
              </button>
              <div className="border-t border-[#282828]/50 my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  createAndAdd();
                }}
                className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-[#282828]/60"
              >
                + New playlist
              </button>
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    addToPlaylist(pl.id);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-[#282828]/60"
                >
                  Add to {pl.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
