"use client";

import { useEffect, useState } from "react";
import { Track, usePlayerStore } from "@/store/usePlayerStore";
import TrackCard from "@/components/TrackCard";

interface Playlist {
  id: string;
  name: string;
  track_count: number;
}

export default function LibraryPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { recentlyPlayed, setRecentlyPlayed } = usePlayerStore();

  useEffect(() => {
    fetchPlaylists();
    fetch("/api/recently-played")
      .then((res) => res.json())
      .then((data) => {
        if (data.tracks) {
          const mapped = data.tracks.map(
            (t: Record<string, unknown>) => ({
              videoId: t.video_id,
              title: t.title,
              thumbnail: t.thumbnail,
              channelName: t.channel_name,
              duration: t.duration,
              moodTags: t.mood_tags ? JSON.parse(t.mood_tags as string) : [],
            })
          );
          setRecentlyPlayed(mapped);
        }
      })
      .catch(() => {});
  }, [setRecentlyPlayed]);

  async function fetchPlaylists() {
    const res = await fetch("/api/playlists");
    const data = await res.json();
    setPlaylists(data.playlists || []);
  }

  async function loadPlaylistTracks(playlistId: string) {
    setSelectedPlaylist(playlistId);
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists?id=${playlistId}`);
      const data = await res.json();
      setPlaylistTracks(data.tracks || []);
    } catch {
      setPlaylistTracks([]);
    } finally {
      setLoading(false);
    }
  }

  async function createPlaylist() {
    const name = prompt("Playlist name:");
    if (!name) return;
    await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    fetchPlaylists();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold">Your Library</h2>
        <button
          onClick={createPlaylist}
          className="px-4 py-2 bg-[#282828] hover:bg-white/10 text-white rounded-full text-sm font-medium transition-colors"
        >
          + New Playlist
        </button>
      </div>

      {playlists.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3">Playlists</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => loadPlaylistTracks(pl.id)}
                className={`text-left p-4 rounded-lg transition-colors ${
                  selectedPlaylist === pl.id
                    ? "bg-[#1DB954]/20 ring-1 ring-[#1DB954]/50"
                    : "bg-[#282828]/60 hover:bg-[#282828]"
                }`}
              >
                <p className="font-medium text-white truncate">{pl.name}</p>
                <p className="text-xs text-[#b3b3b3] mt-1">
                  {pl.track_count} track{pl.track_count !== 1 ? "s" : ""}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedPlaylist && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3">
            Playlist Tracks
          </h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : playlistTracks.length > 0 ? (
            <div className="space-y-1">
              {playlistTracks.map((track) => (
                <TrackCard key={track.videoId} track={track} />
              ))}
            </div>
          ) : (
            <p className="text-[#b3b3b3]/70">No tracks in this playlist yet.</p>
          )}
        </section>
      )}

      {recentlyPlayed.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3">
            Recently Played
          </h3>
          <div className="space-y-1">
            {recentlyPlayed.slice(0, 20).map((track) => (
              <TrackCard key={track.videoId} track={track} />
            ))}
          </div>
        </section>
      )}

      {playlists.length === 0 && recentlyPlayed.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#b3b3b3] text-lg mb-2">Your library is empty</p>
          <p className="text-[#b3b3b3]/70 text-sm">
            Search for songs and start building your collection!
          </p>
        </div>
      )}
    </div>
  );
}
