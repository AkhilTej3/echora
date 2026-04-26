"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Music, Play } from "lucide-react";

interface Artist {
  id: number;
  name: string;
  genre: string;
}

interface Album {
  id: number;
  name: string;
  artistName: string;
  artwork: string;
  trackCount: number;
  releaseDate: string;
  type: string;
}

export default function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "album" | "single">("all");

  useEffect(() => {
    Promise.all([
      fetch(`/api/artists/${id}`).then((r) => r.json()),
      fetch(`/api/artists/${id}/albums`).then((r) => r.json()),
    ])
      .then(([artistData, albumsData]) => {
        setArtist(artistData.artist);
        setAlbums(albumsData.albums || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = albums.filter((a) => {
    if (filter === "all") return true;
    return a.type === filter;
  });

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

  const heroAlbum = albums[0];

  return (
    <div className="max-w-5xl mx-auto pb-8">
      <div className="relative mb-8 pb-8 border-b border-[#282828]">
        {heroAlbum?.artwork && (
          <div className="absolute inset-0 overflow-hidden rounded-xl opacity-20 blur-3xl -z-10">
            <Image
              src={heroAlbum.artwork}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 pt-8 sm:pt-12">
          <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-[#282828] flex items-center justify-center shadow-2xl overflow-hidden shrink-0">
            {heroAlbum?.artwork ? (
              <Image
                src={heroAlbum.artwork}
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
              Artist
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">
              {artist.name}
            </h1>
            {artist.genre && (
              <p className="text-xs sm:text-sm text-[#b3b3b3]">{artist.genre}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 mb-6 flex-wrap">
        <h2 className="text-lg sm:text-xl font-bold text-white mr-2 sm:mr-4">Discography</h2>
        {(["all", "album", "single"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-white text-black"
                : "bg-[#282828] text-[#b3b3b3] hover:bg-white/5"
            }`}
          >
            {f === "all" ? "All" : f === "album" ? "Albums" : "Singles"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-[#b3b3b3]/70">No releases found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {filtered.map((album) => (
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
                {album.releaseDate.substring(0, 4)} •{" "}
                <span className="capitalize">{album.type}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
