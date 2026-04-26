"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePlayerStore, Track } from "@/store/usePlayerStore";
import { Music, Play } from "lucide-react";

interface ArtistData {
  id: string;
  name: string;
  artwork: string;
  fanCount: string;
  isVerified: boolean;
  topSongs: Track[];
  topAlbums: JioAlbum[];
}

interface JioAlbum {
  id: string;
  name: string;
  artist: string;
  artwork: string;
  year: string;
  songCount: string;
}

export default function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [extraAlbums, setExtraAlbums] = useState<JioAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const { play, playWithQueue, currentTrack } = usePlayerStore();

  useEffect(() => {
    Promise.all([
      fetch(`/api/artists/${id}`).then((r) => r.json()),
      fetch(`/api/artists/${id}/albums`).then((r) => r.json()),
    ])
      .then(([artistData, albumsData]) => {
        setArtist(artistData);
        setExtraAlbums(albumsData.albums || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const allAlbums = [
    ...(artist?.topAlbums || []),
    ...extraAlbums.filter(
      (ea) => !artist?.topAlbums?.some((ta) => ta.id === ea.id)
    ),
  ];

  function formatFanCount(count: string) {
    const n = parseInt(count);
    if (isNaN(n)) return "";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M fans`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K fans`;
    return `${n} fans`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="text-center py-16 text-[#b3b3b3]">Artist not found</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-8">
      <div className="relative mb-8 pb-8 border-b border-[#282828]">
        {artist.artwork && (
          <div className="absolute inset-0 overflow-hidden rounded-xl opacity-20 blur-3xl -z-10">
            <Image
              src={artist.artwork}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 pt-8 sm:pt-12">
          <div className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-[#282828] flex items-center justify-center shadow-2xl overflow-hidden shrink-0">
            {artist.artwork ? (
              <Image
                src={artist.artwork}
                alt={artist.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <Music size={48} className="text-[#b3b3b3]/60" />
            )}
          </div>
          <div className="text-center sm:text-left">
            <p className="text-[10px] sm:text-xs font-medium text-[#b3b3b3] uppercase tracking-wider mb-1">
              {artist.isVerified ? "Verified Artist" : "Artist"}
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">
              {artist.name}
            </h1>
            {artist.fanCount && artist.fanCount !== "0" && (
              <p className="text-xs sm:text-sm text-[#b3b3b3]">
                {formatFanCount(artist.fanCount)}
              </p>
            )}
          </div>
        </div>
      </div>

      {artist.topSongs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white">Popular</h2>
            {artist.topSongs.length > 1 && (
              <button
                onClick={() =>
                  playWithQueue(artist.topSongs[0], artist.topSongs.slice(1))
                }
                className="text-sm font-semibold text-[#b3b3b3] hover:text-white transition-colors"
              >
                Play all
              </button>
            )}
          </div>
          <div className="space-y-1">
            {artist.topSongs.slice(0, 10).map((track, i) => {
              const isActive = currentTrack?.videoId === track.videoId;
              return (
                <div
                  key={track.videoId}
                  onClick={() =>
                    playWithQueue(track, artist.topSongs.slice(i + 1))
                  }
                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[#282828] ring-1 ring-[#1DB954]/30"
                      : "hover:bg-[#282828]/60"
                  }`}
                >
                  <span className="w-6 text-center text-sm text-[#b3b3b3]/70 tabular-nums shrink-0">
                    <span className="group-hover:hidden">{i + 1}</span>
                    <span className="hidden group-hover:inline text-white">
                      <Play size={14} fill="white" />
                    </span>
                  </span>
                  <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                    {track.thumbnail && (
                      <Image
                        src={track.thumbnail}
                        alt={track.title}
                        fill
                        className="object-cover"
                        sizes="40px"
                        unoptimized
                      />
                    )}
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
                  <span className="text-xs text-[#b3b3b3]/70 tabular-nums shrink-0">
                    {track.duration}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {allAlbums.length > 0 && (
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4">
            Discography
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {allAlbums.map((album) => (
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
                  <button className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl">
                    <Play size={16} fill="black" color="black" />
                  </button>
                </div>
                <p className="text-sm font-medium text-white truncate group-hover:underline">
                  {album.name}
                </p>
                <p className="text-xs text-[#b3b3b3] mt-0.5">
                  {album.year}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
