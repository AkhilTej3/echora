"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Track, usePlayerStore } from "@/store/usePlayerStore";
import { Play, Music, ChevronLeft, ChevronRight } from "lucide-react";

interface HomeAlbum {
  id: string;
  name: string;
  artist: string;
  artwork: string;
  year: string;
  songCount: string;
}

interface HomeData {
  trending: Track[];
  newReleases: HomeAlbum[];
  telugu: HomeAlbum[];
  hindi: HomeAlbum[];
  english: HomeAlbum[];
  punjabi: HomeAlbum[];
  bollywood: HomeAlbum[];
  tamil: HomeAlbum[];
  kpop: HomeAlbum[];
  chill: Track[];
  workout: Track[];
  romance: Track[];
}

const MOOD_CARDS = [
  { label: "Chill", query: "chill vibes lofi", gradient: "from-blue-600 to-cyan-500", emoji: "\u2601" },
  { label: "Workout", query: "workout motivation", gradient: "from-orange-500 to-red-500", emoji: "\u26A1" },
  { label: "Romance", query: "romantic songs", gradient: "from-pink-500 to-rose-400", emoji: "\u2665" },
  { label: "Focus", query: "focus study", gradient: "from-violet-600 to-purple-400", emoji: "\u25CE" },
  { label: "Party", query: "party dance", gradient: "from-yellow-400 to-orange-500", emoji: "\u2605" },
  { label: "Sad", query: "sad emotional", gradient: "from-slate-600 to-blue-800", emoji: "\u2614" },
];

const GENRE_PILLS = [
  { label: "Pop", query: "pop hits 2025" },
  { label: "Hip Hop", query: "hip hop songs 2025" },
  { label: "R&B", query: "r and b songs" },
  { label: "Rock", query: "rock hits classic" },
  { label: "EDM", query: "edm electronic dance" },
  { label: "Jazz", query: "jazz classics" },
  { label: "Classical", query: "classical music" },
  { label: "Latin", query: "latin reggaeton" },
  { label: "Indie", query: "indie pop songs" },
  { label: "Lofi", query: "lofi hip hop beats" },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { recentlyPlayed, setRecentlyPlayed, play, currentTrack } =
    usePlayerStore();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [genreResults, setGenreResults] = useState<Record<string, Track[]>>({});
  const [loadingGenre, setLoadingGenre] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/recently-played")
      .then((res) => res.json())
      .then((d) => {
        if (d.tracks) {
          setRecentlyPlayed(
            d.tracks.map((t: Record<string, unknown>) => ({
              videoId: t.video_id,
              title: t.title,
              thumbnail: t.thumbnail,
              channelName: t.channel_name,
              duration: t.duration,
              moodTags: t.mood_tags ? JSON.parse(t.mood_tags as string) : [],
            }))
          );
        }
      })
      .catch(() => {});
  }, [setRecentlyPlayed]);

  async function loadGenre(label: string, query: string) {
    if (genreResults[label]?.length) return;
    setLoadingGenre(label);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=songs`
      );
      if (!res.ok) throw new Error("Search failed");
      const d = await res.json();
      const tracks = d.results || [];
      if (tracks.length > 0) {
        setGenreResults((prev) => ({ ...prev, [label]: tracks }));
      }
    } catch {}
    setLoadingGenre(null);
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-8 space-y-6 md:space-y-10">
      <section className="animate-fade-in-up">
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-1">{getGreeting()}</h1>
        <p className="text-[#b3b3b3] text-sm md:text-lg">
          Feel every frequency.
        </p>
      </section>

      <section className="animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <SectionHeader title="Browse by mood" />
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          {MOOD_CARDS.map((mood) => (
            <Link
              key={mood.label}
              href={`/search?q=${encodeURIComponent(mood.query)}`}
              className={`relative h-20 md:h-28 rounded-xl bg-gradient-to-br ${mood.gradient} p-3 md:p-4 overflow-hidden group hover:scale-[1.03] transition-transform cursor-pointer`}
            >
              <span className="text-sm md:text-lg font-bold text-white relative z-10">
                {mood.label}
              </span>
              <span className="absolute -bottom-2 -right-2 text-4xl md:text-6xl text-white/15 select-none">
                {mood.emoji}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {loading ? (
        <SongRowSkeleton title="Trending now" />
      ) : (
        data?.trending &&
        data.trending.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <SectionHeader title="Trending now" subtitle="Popular songs right now" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {data.trending.slice(0, 10).map((track, i) => (
                <SongRow
                  key={track.videoId}
                  track={track}
                  index={i + 1}
                  isActive={currentTrack?.videoId === track.videoId}
                  onClick={() => play(track)}
                />
              ))}
            </div>
          </section>
        )
      )}

      {recentlyPlayed.length > 0 && (
        <section className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <SectionHeader title="Recently played" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {recentlyPlayed.slice(0, 8).map((track) => (
              <button
                key={track.videoId}
                onClick={() => play(track)}
                className={`group flex items-center gap-3 bg-[#282828]/70 hover:bg-[#3a3a3a] rounded-md overflow-hidden transition-all h-12 md:h-14 ${
                  currentTrack?.videoId === track.videoId
                    ? "ring-1 ring-[#1DB954]/40 bg-[#3a3a3a]"
                    : ""
                }`}
              >
                <div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0">
                  {track.thumbnail ? (
                    <Image
                      src={track.thumbnail}
                      alt={track.title}
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-[#282828] flex items-center justify-center text-[#b3b3b3]/70">
                      <Music size={18} />
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-white truncate pr-3">
                  {track.title.split(/[-\u2013\u2014]/)[0].trim()}
                </span>
                <div className="ml-auto mr-3 w-8 h-8 rounded-full bg-[#1DB954] items-center justify-center shadow-lg shadow-black/40 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 hidden group-hover:flex shrink-0">
                  <Play size={14} fill="black" color="black" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <AlbumCarouselSkeleton title="New releases" />
      ) : (
        data?.newReleases &&
        data.newReleases.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <SectionHeader title="New releases" subtitle="Fresh albums & singles" />
            <AlbumScroll albums={data.newReleases} />
          </section>
        )
      )}

      {!loading &&
        data?.chill &&
        data.chill.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
            <SectionHeader title="Chill vibes" subtitle="Relax and unwind" />
            <SongCardScroll songs={data.chill} onPlay={play} />
          </section>
        )}

      {!loading &&
        data?.telugu &&
        data.telugu.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.28s" }}>
            <SectionHeader title="Telugu" subtitle="Tollywood hits & more" />
            <AlbumScroll albums={data.telugu} />
          </section>
        )}

      {!loading &&
        data?.hindi &&
        data.hindi.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.31s" }}>
            <SectionHeader title="Hindi" subtitle="Bollywood & indie Hindi" />
            <AlbumScroll albums={data.hindi} />
          </section>
        )}

      {!loading &&
        data?.english &&
        data.english.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.34s" }}>
            <SectionHeader title="English" subtitle="Pop, rock & global hits" />
            <AlbumScroll albums={data.english} />
          </section>
        )}

      {!loading &&
        data?.punjabi &&
        data.punjabi.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.37s" }}>
            <SectionHeader title="Punjabi" subtitle="Bhangra & Punjabi pop" />
            <AlbumScroll albums={data.punjabi} />
          </section>
        )}

      {!loading &&
        data?.bollywood &&
        data.bollywood.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <SectionHeader title="Bollywood" subtitle="Hindi hits & soundtracks" />
            <AlbumScroll albums={data.bollywood} />
          </section>
        )}

      {!loading &&
        data?.tamil &&
        data.tamil.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.43s" }}>
            <SectionHeader title="Tamil" subtitle="Kollywood & indie Tamil" />
            <AlbumScroll albums={data.tamil} />
          </section>
        )}

      {!loading &&
        data?.workout &&
        data.workout.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.46s" }}>
            <SectionHeader title="Workout energy" subtitle="Pump up the intensity" />
            <SongCardScroll songs={data.workout} onPlay={play} />
          </section>
        )}

      {!loading &&
        data?.kpop &&
        data.kpop.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.49s" }}>
            <SectionHeader title="K-Pop" subtitle="Korean pop & idol hits" />
            <AlbumScroll albums={data.kpop} />
          </section>
        )}

      {!loading &&
        data?.romance &&
        data.romance.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.52s" }}>
            <SectionHeader title="Romantic" subtitle="Love songs & ballads" />
            <SongCardScroll songs={data.romance} onPlay={play} />
          </section>
        )}

      <section className="animate-fade-in-up" style={{ animationDelay: "0.55s" }}>
        <SectionHeader title="Explore genres" />
        <div className="flex flex-wrap gap-2 mb-4">
          {GENRE_PILLS.map((g) => (
            <button
              key={g.label}
              onClick={() => loadGenre(g.label, g.query)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                genreResults[g.label]
                  ? "bg-[#1DB954] text-black scale-[0.97]"
                  : loadingGenre === g.label
                  ? "bg-[#282828] text-[#b3b3b3]"
                  : "bg-[#282828] text-[#b3b3b3] hover:bg-[#3a3a3a] hover:text-white hover:scale-[1.03]"
              }`}
            >
              {loadingGenre === g.label ? "Loading..." : g.label}
            </button>
          ))}
        </div>

        {Object.entries(genreResults).map(([label, tracks]) => (
          <div key={label} className="mb-6 animate-fade-in-up">
            <h4 className="text-base font-semibold text-white mb-3">{label}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {tracks.slice(0, 6).map((track) => (
                <div
                  key={track.videoId}
                  onClick={() => play(track)}
                  className="group flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[#282828] transition-colors"
                >
                  <div className="relative w-11 h-11 rounded overflow-hidden shrink-0">
                    {track.thumbnail && (
                      <Image
                        src={track.thumbnail}
                        alt={track.title}
                        fill
                        className="object-cover"
                        sizes="44px"
                        unoptimized
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={16} fill="white" color="white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-xs text-[#b3b3b3] truncate">
                      {track.channelName}
                    </p>
                  </div>
                  <span className="text-xs text-[#b3b3b3]/70">{track.duration}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-lg md:text-2xl font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="text-xs md:text-sm text-[#b3b3b3] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="text-sm font-semibold text-[#b3b3b3] hover:text-white transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

function AlbumScroll({ albums }: { albums: HomeAlbum[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative group/scroll">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 scroll-smooth"
      >
        {albums.map((album) => (
          <Link
            key={album.id}
            href={`/album/${album.id}`}
            className="shrink-0 w-[160px] group"
          >
            <div className="relative w-[160px] h-[160px] rounded-lg overflow-hidden shadow-lg mb-2 bg-[#282828]">
              <Image
                src={album.artwork}
                alt={album.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="160px"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1DB954] items-center justify-center shadow-xl shadow-black/30 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 hidden group-hover:flex">
                <Play size={18} fill="black" color="black" />
              </div>
            </div>
            <p className="text-sm font-medium text-white truncate">
              {album.name}
            </p>
            <p className="text-xs text-[#b3b3b3] truncate">{album.artist}</p>
          </Link>
        ))}
      </div>
      <ScrollButtons scrollRef={scrollRef} />
    </div>
  );
}

function ScrollButtons({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const scroll = useCallback(
    (dir: "left" | "right") => {
      if (!scrollRef.current) return;
      const amount = dir === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    },
    [scrollRef]
  );

  return (
    <>
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-[60px] w-9 h-9 rounded-full bg-[#121212]/90 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:scale-110 hover:bg-[#282828] z-10 -translate-x-2"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-[60px] w-9 h-9 rounded-full bg-[#121212]/90 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:scale-110 hover:bg-[#282828] z-10 translate-x-2"
      >
        <ChevronRight size={18} />
      </button>
    </>
  );
}

function SongCardScroll({
  songs,
  onPlay,
}: {
  songs: Track[];
  onPlay: (track: Track) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative group/scroll">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 scroll-smooth"
      >
        {songs.map((track) => (
          <div
            key={track.videoId}
            onClick={() => onPlay(track)}
            className="shrink-0 w-[160px] group cursor-pointer"
          >
            <div className="relative w-[160px] h-[160px] rounded-lg overflow-hidden shadow-lg mb-2 bg-[#282828]">
              {track.thumbnail && (
                <Image
                  src={track.thumbnail}
                  alt={track.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="160px"
                  unoptimized
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1DB954] items-center justify-center shadow-xl shadow-black/30 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 hidden group-hover:flex">
                <Play size={18} fill="black" color="black" />
              </div>
            </div>
            <p className="text-sm font-medium text-white truncate">
              {track.title}
            </p>
            <p className="text-xs text-[#b3b3b3] truncate">{track.channelName}</p>
          </div>
        ))}
      </div>
      <ScrollButtons scrollRef={scrollRef} />
    </div>
  );
}

function SongRow({
  track,
  index,
  isActive,
  onClick,
}: {
  track: Track;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive ? "bg-[#282828] ring-1 ring-[#1DB954]/30" : "hover:bg-[#282828]/60"
      }`}
    >
      <span className="w-6 text-center text-sm text-[#b3b3b3]/70 tabular-nums shrink-0">
        <span className="group-hover:hidden">{index}</span>
        <span className="hidden group-hover:inline text-white"><Play size={14} fill="white" /></span>
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
        <p className={`text-sm font-medium truncate ${isActive ? "text-[#1DB954]" : "text-white"}`}>
          {track.title}
        </p>
        <p className="text-xs text-[#b3b3b3] truncate">{track.channelName}</p>
      </div>
      <span className="text-xs text-[#b3b3b3]/70 tabular-nums shrink-0">
        {track.duration}
      </span>
    </div>
  );
}

function SongRowSkeleton({ title }: { title: string }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <div className="w-6 h-4 skeleton" />
            <div className="w-10 h-10 skeleton rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 skeleton w-3/4" />
              <div className="h-3 skeleton w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AlbumCarouselSkeleton({ title }: { title: string }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[160px]">
            <div className="w-[160px] h-[160px] skeleton rounded-lg mb-2" />
            <div className="h-3.5 skeleton w-3/4 mb-1" />
            <div className="h-3 skeleton w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}
