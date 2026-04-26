"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Track, usePlayerStore } from "@/store/usePlayerStore";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Music, Search as SearchIcon } from "lucide-react";

interface JioAlbum {
  id: string;
  name: string;
  artist: string;
  artwork: string;
  year: string;
  songCount: string;
}

interface JioArtist {
  id: string;
  name: string;
  artwork: string;
}

interface JioSong extends Track {
  streamUrl?: string;
}

export default function SearchBar({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [albums, setAlbums] = useState<JioAlbum[]>([]);
  const [artists, setArtists] = useState<JioArtist[]>([]);
  const [songs, setSongs] = useState<JioSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { play, addToQueue, currentTrack, isPlaying } = usePlayerStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setAlbums([]);
      setArtists([]);
      setSongs([]);
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
    } catch {
      setAlbums([]);
      setArtists([]);
      setSongs([]);
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

  const hasResults =
    albums.length > 0 || artists.length > 0 || songs.length > 0;

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
                    <div className="w-36 h-36 rounded-full bg-[#282828] flex items-center justify-center mb-3 overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow relative">
                      {artist.artwork ? (
                        <Image
                          src={artist.artwork}
                          alt={artist.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform"
                          sizes="144px"
                          unoptimized
                        />
                      ) : (
                        <Music size={32} className="text-[#b3b3b3]/60 group-hover:scale-110 transition-transform" />
                      )}
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
                      {album.year} • {album.artist}
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
                  const isActive = currentTrack?.videoId === song.videoId;

                  return (
                    <div
                      key={song.videoId}
                      onClick={() => play(song)}
                      className={`group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                        isActive
                          ? "bg-[#282828] ring-1 ring-[#1DB954]/30"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                        {song.thumbnail ? (
                          <Image
                            src={song.thumbnail}
                            alt={song.title}
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
                          {song.title}
                        </p>
                        <p className="text-xs text-[#b3b3b3] truncate">
                          {song.channelName}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToQueue(song);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[#b3b3b3] hover:text-white text-xs transition-opacity"
                      >
                        + Queue
                      </button>

                      <span className="text-xs text-[#b3b3b3]/70 tabular-nums">
                        {song.duration}
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
