"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Music,
  ListMusic,
} from "lucide-react";
import QueueSheet from "./QueueSheet";

export default function Player() {
  const { currentTrack, isPlaying, pause, resume, playNext } =
    usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastVideoRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const barRef = useRef<HTMLDivElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);
  const barThumbRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const durRef = useRef<HTMLSpanElement>(null);
  const mobileFillRef = useRef<HTMLDivElement>(null);
  const mobileTimeRef = useRef<HTMLSpanElement>(null);
  const mobileDurRef = useRef<HTMLSpanElement>(null);
  const progressData = useRef({ progress: 0, duration: 0 });

  const [volume, setVolume] = useState(80);
  const [showQueue, setShowQueue] = useState(false);
  const [loading, setLoading] = useState(false);

  const playNextRef = useRef(playNext);
  playNextRef.current = playNext;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.8;
    audio.addEventListener("ended", () => playNextRef.current());
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Load new track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (lastVideoRef.current === currentTrack.videoId) return;

    lastVideoRef.current = currentTrack.videoId;
    progressData.current = { progress: 0, duration: 0 };
    updateBarDOM(0, 0);
    setLoading(true);

    fetch(`/api/stream?v=${currentTrack.videoId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.url && lastVideoRef.current === currentTrack.videoId) {
          audio.src = data.url;
          audio.play().catch(() => {});
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [currentTrack]);

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // Media Session API
  useEffect(() => {
    if (!currentTrack || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.channelName,
      artwork: currentTrack.thumbnail
        ? [
            { src: currentTrack.thumbnail, sizes: "96x96", type: "image/jpeg" },
            { src: currentTrack.thumbnail, sizes: "256x256", type: "image/jpeg" },
            { src: currentTrack.thumbnail, sizes: "512x512", type: "image/jpeg" },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => resume());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => playNextRef.current());
    navigator.mediaSession.setActionHandler("previoustrack", null);
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
      }
    });
  }, [currentTrack, pause, resume]);

  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  // Progress polling
  function updateBarDOM(t: number, d: number) {
    const pct = d > 0 ? Math.min((t / d) * 100, 100) : 0;
    if (barFillRef.current) barFillRef.current.style.width = `${pct}%`;
    if (barThumbRef.current) barThumbRef.current.style.left = `calc(${pct}% - 6px)`;
    if (mobileFillRef.current) mobileFillRef.current.style.width = `${pct}%`;
    if (timeRef.current) timeRef.current.textContent = fmt(t);
    if (durRef.current) durRef.current.textContent = fmt(d);
    if (mobileTimeRef.current) mobileTimeRef.current.textContent = fmt(t);
    if (mobileDurRef.current) mobileDurRef.current.textContent = fmt(d);
  }

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!isPlaying) return;

    const poll = () => {
      const audio = audioRef.current;
      if (!audio) return;
      const t = audio.currentTime || 0;
      const d = audio.duration || 0;
      if (isFinite(d) && d > 0) {
        progressData.current = { progress: t, duration: d };
        updateBarDOM(t, d);
        if ("mediaSession" in navigator) {
          navigator.mediaSession.setPositionState({
            duration: d,
            playbackRate: 1,
            position: Math.min(t, d),
          });
        }
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, currentTrack]);

  function seekFromBar(clientX: number, bar: HTMLDivElement | null) {
    if (!bar || !audioRef.current || progressData.current.duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const val = x * progressData.current.duration;
    audioRef.current.currentTime = val;
    progressData.current.progress = val;
    updateBarDOM(val, progressData.current.duration);
  }

  function handleVolume(val: number) {
    setVolume(val);
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  if (!currentTrack) {
    return (
      <footer className="h-14 md:h-20 bg-[#181818] border-t border-[#282828] flex items-center justify-center mb-[60px] md:mb-0">
        <p className="text-[#b3b3b3] text-xs md:text-sm">
          Select a song to start playing
        </p>
      </footer>
    );
  }

  return (
    <>
      {/* Mobile */}
      <footer className="md:hidden flex flex-col bg-[#181818] border-t border-[#282828] mb-[60px]">
        <div className="flex items-center px-3 py-2 gap-3">
          <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
            {currentTrack.thumbnail ? (
              <Image
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                fill
                className="object-cover"
                sizes="40px"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-[#282828] flex items-center justify-center text-[#b3b3b3]">
                <Music size={16} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {currentTrack.title}
            </p>
            <p className="text-[10px] text-[#b3b3b3] truncate">
              {currentTrack.channelName}
            </p>
          </div>
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`p-1.5 ${showQueue ? "text-[#1DB954]" : "text-[#b3b3b3]"}`}
          >
            <ListMusic size={18} />
          </button>
          <button
            onClick={isPlaying ? pause : resume}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0"
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={14} fill="black" color="black" />
            ) : (
              <Play size={14} fill="black" color="black" className="ml-0.5" />
            )}
          </button>
          <button onClick={playNext} className="text-[#b3b3b3] shrink-0">
            <SkipForward size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 mx-3 mb-1">
          <span ref={mobileTimeRef} className="text-[10px] text-[#b3b3b3] tabular-nums w-7 text-right">0:00</span>
          <div
            className="relative flex-1 h-1 bg-[#404040] rounded-full cursor-pointer"
            onClick={(e) => seekFromBar(e.clientX, e.currentTarget)}
            onTouchStart={(e) => seekFromBar(e.touches[0].clientX, e.currentTarget)}
            onTouchMove={(e) => seekFromBar(e.touches[0].clientX, e.currentTarget)}
          >
            <div
              ref={mobileFillRef}
              className="absolute top-0 left-0 h-full bg-[#1DB954] rounded-full"
              style={{ width: "0%" }}
            />
          </div>
          <span ref={mobileDurRef} className="text-[10px] text-[#b3b3b3] tabular-nums w-7">0:00</span>
        </div>
      </footer>

      {/* Desktop */}
      <footer className="hidden md:flex h-24 bg-[#181818] border-t border-[#282828] items-center px-4 gap-4">
        <div className="flex items-center gap-3 w-72 shrink-0">
          <div className="relative w-14 h-14 rounded-md overflow-hidden shadow-lg">
            {currentTrack.thumbnail ? (
              <Image
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                fill
                className="object-cover"
                sizes="56px"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-[#282828] flex items-center justify-center text-[#b3b3b3]">
                <Music size={20} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentTrack.title}
            </p>
            <p className="text-xs text-[#b3b3b3] truncate">
              {currentTrack.channelName}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1.5 max-w-2xl">
          <div className="flex items-center gap-5">
            <button
              onClick={playNext}
              className="text-[#b3b3b3] hover:text-white transition-colors"
              title="Previous"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={isPlaying ? pause : resume}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={16} fill="black" color="black" />
              ) : (
                <Play size={16} fill="black" color="black" className="ml-0.5" />
              )}
            </button>
            <button
              onClick={playNext}
              className="text-[#b3b3b3] hover:text-white transition-colors"
              title="Next"
            >
              <SkipForward size={18} />
            </button>
          </div>
          <div className="w-full flex items-center gap-2 text-xs text-[#b3b3b3]">
            <span ref={timeRef} className="w-10 text-right tabular-nums">0:00</span>
            <div
              ref={barRef}
              className="relative flex-1 h-1 bg-[#404040] rounded-full group cursor-pointer"
              onClick={(e) => seekFromBar(e.clientX, barRef.current)}
            >
              <div
                ref={barFillRef}
                className="absolute top-0 left-0 h-full bg-white group-hover:bg-[#1DB954] rounded-full"
                style={{ width: "0%" }}
              />
              <div
                ref={barThumbRef}
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: "-6px" }}
              />
            </div>
            <span ref={durRef} className="w-10 tabular-nums">0:00</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-48 shrink-0 justify-end">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`p-1.5 rounded transition-colors ${showQueue ? "text-[#1DB954]" : "text-[#b3b3b3] hover:text-white"}`}
            title="Queue"
          >
            <ListMusic size={18} />
          </button>
          <Volume2 size={16} className="text-[#b3b3b3] shrink-0" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolume(Number(e.target.value))}
            className="w-24 h-1 cursor-pointer"
          />
        </div>
      </footer>

      {showQueue && <QueueSheet onClose={() => setShowQueue(false)} />}
    </>
  );
}
