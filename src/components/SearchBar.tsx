"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Track, usePlayerStore } from "@/store/usePlayerStore";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Music, Search as SearchIcon } from "lucide-react";

interface Album {
  id: number;
  name: string;
  artistName: string;
  artistId: number;
  artwork: string;
  trackCount: number;
  releaseDate: string;
  type: string;
}

interface Artist {
  id: number;
  name: string;
  genre: string;
}

interface Song {
  id: number;
  trackNumber: number;
  name: string;
  artistName: string;
  duration: number;
  artwork: string;
}

export default function SearchBar({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [videos, setVideos] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [resolving, setResolving] = useState<number | null>(null);
  const { play, addToQueue, currentTrack, isPlaying } = usePlayerStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setAlbums([]);
      setArtists([]);
      setSongs([]);
      setVideos([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setAlbums(data.albums || []);
      setArtists(data.artists || []);
      setSongs(data.songs || []);
      setVideos(data.videos || []);
    } catch {
      setAlbums([]);
      setArtists([]);
      setSongs([]);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  async function resolveAndPlay(song: Song) {
    setResolving(song.id);
    try {
      const res = await fetch(
        `/api/resolve?track=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artistName)}`
      );
      const yt = await res.json();
      if (yt.videoId) {
        play({
          videoId: yt.videoId,
          title: `${song.name} - ${song.artistName}`,
          thumbnail: song.artwork,
          channelName: song.artistName,
          duration: yt.duration,
        });
      }
    } catch {}
    setResolving(null);
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const hasResults =
    albums.length > 0 ||
    artists.length > 0 ||
    songs.length > 0 ||
    videos.length > 0;

  return (
    <div>
      <div className="relative mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?"
          className="w-full bg-[#282828] text-white rounded-full py-3.5 px-5 pl-12 text-sm outline-none focus:ring-2 focus:ring-[#1DB954] placeholder-[#b3b3b3]/70"
          autoFocus
        />
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && searched && !hasResults && (
        <p className="text-[#b3b3b3]/70 text-center py-12">
          No results found. Try a different search.
        </p>
      )}

      {!loading && hasResults && (
        <div className="space-y-10">
          {artists.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-white mb-4">Artists</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {artists.slice(0, 6).map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artist/${artist.id}`}
                    className="group shrink-0 w-36"
                  >
                    <div className="w-36 h-36 rounded-full bg-[#282828] flex items-center justify-center mb-3 overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                      <Music size={32} className="text-[#b3b3b3]/60 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-sm font-medium text-white text-center truncate group-hover:underline">
                      {artist.name}
                    </p>
                    <p className="text-xs text-[#b3b3b3] text-center">Artist</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {albums.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-white mb-4">Albums</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
                {albums.slice(0, 10).map((album) => (
                  <Link
                    key={album.id}
                    href={`/album/${album.id}`}
                    className="group"
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden shadow-lg mb-3">
                      {album.artwork ? (
                        <Image
                          src={album.artwork}
                          alt={album.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="200px"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                          <Music size={32} className="text-[#b3b3b3]/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <button className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl shadow-black/30">
                        <Play size={16} fill="black" color="black" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-white truncate group-hover:underline">
                      {album.name}
                    </p>
                    <p className="text-xs text-[#b3b3b3] mt-0.5 truncate">
                      {album.releaseDate.substring(0, 4)} •{" "}
                      {album.artistName}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {songs.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-white mb-4">Songs</h3>
              <div className="space-y-1">
                {songs.slice(0, 10).map((song) => {
                  const isActive =
                    currentTrack?.title ===
                    `${song.name} - ${song.artistName}`;
                  const isLoading = resolving === song.id;

                  return (
                    <div
                      key={song.id}
                      onClick={() => !isLoading && resolveAndPlay(song)}
                      className={`group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                        isActive
                          ? "bg-[#282828] ring-1 ring-[#1DB954]/30"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                        {song.artwork ? (
                          <Image
                            src={song.artwork}
                            alt={song.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-[#282828]/60 flex items-center justify-center text-[#b3b3b3] text-xs">
                            <Music size={14} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {isLoading ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : isActive && isPlaying ? (
                            <Pause size={12} className="text-[#1DB954]" />
                          ) : (
                            <Play size={12} fill="white" color="white" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isActive ? "text-[#1DB954]" : "text-white"
                          }`}
                        >
                          {song.name}
                        </p>
                        <p className="text-xs text-[#b3b3b3] truncate">
                          {song.artistName}
                        </p>
                      </div>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetch(
                              `/api/resolve?track=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artistName)}`
                            );
                            const yt = await res.json();
                            if (yt.videoId) {
                              addToQueue({
                                videoId: yt.videoId,
                                title: `${song.name} - ${song.artistName}`,
                                thumbnail: song.artwork,
                                channelName: song.artistName,
                                duration: yt.duration,
                              });
                            }
                          } catch {}
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[#b3b3b3] hover:text-white text-xs transition-opacity"
                      >
                        + Queue
                      </button>

                      <span className="text-xs text-[#b3b3b3]/70 tabular-nums">
                        {formatDuration(song.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {videos.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-white mb-4">
                Videos
              </h3>
              <div className="space-y-1">
                {videos.slice(0, 8).map((track) => {
                  const isActive =
                    currentTrack?.videoId === track.videoId;
                  return (
                    <div
                      key={track.videoId}
                      onClick={() => play(track)}
                      className={`group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                        isActive
                          ? "bg-[#282828] ring-1 ring-[#1DB954]/30"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                        {track.thumbnail ? (
                          <Image
                            src={track.thumbnail}
                            alt={track.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-[#282828]/60 flex items-center justify-center text-[#b3b3b3] text-xs">
                            <Music size={14} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {isActive && isPlaying ? (
                            <Pause size={12} className="text-[#1DB954]" />
                          ) : (
                            <Play size={12} fill="white" color="white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToQueue(track);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[#b3b3b3] hover:text-white text-xs transition-opacity"
                      >
                        + Queue
                      </button>
                      <span className="text-xs text-[#b3b3b3]/70 tabular-nums">
                        {track.duration}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
