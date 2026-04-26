"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Play, Pause, SkipBack, SkipForward, Volume2, Music, ListMusic } from "lucide-react";
import QueueSheet from "./QueueSheet";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function Player() {
  const { currentTrack, isPlaying, pause, resume, playNext, queue } =
    usePlayerStore();
  const playerRef = useRef<YT.Player | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [showQueue, setShowQueue] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const currentVideoRef = useRef<string | null>(null);
  const playNextRef = useRef(playNext);
  playNextRef.current = playNext;

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }
    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => setApiReady(true);
  }, []);

  useEffect(() => {
    if (!apiReady || playerRef.current) return;
    const host = document.createElement("div");
    host.id = "yt-player-host";
    host.style.position = "fixed";
    host.style.top = "-9999px";
    host.style.left = "-9999px";
    host.style.width = "1px";
    host.style.height = "1px";
    host.style.overflow = "hidden";
    document.body.appendChild(host);

    playerRef.current = new window.YT.Player(host, {
      height: "1",
      width: "1",
      playerVars: {
        autoplay: 0, controls: 0, disablekb: 1, fs: 0,
        modestbranding: 1, rel: 0, showinfo: 0, origin: window.location.origin,
      },
      events: {
        onReady: () => {
          setPlayerReady(true);
          playerRef.current?.setVolume(80);
        },
        onStateChange: (event: YT.OnStateChangeEvent) => {
          if (event.data === YT.PlayerState.ENDED) playNextRef.current();
          if (event.data === YT.PlayerState.PLAYING)
            setDuration(playerRef.current?.getDuration() || 0);
        },
      },
    });
  }, [apiReady]);

  useEffect(() => {
    if (!playerReady || !playerRef.current || !currentTrack) return;
    if (currentVideoRef.current !== currentTrack.videoId) {
      currentVideoRef.current = currentTrack.videoId;
      playerRef.current.loadVideoById(currentTrack.videoId);
    }
  }, [currentTrack, playerReady]);

  useEffect(() => {
    if (!playerReady || !playerRef.current) return;
    try {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch {}
  }, [isPlaying, playerReady]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPlaying && playerRef.current) {
      intervalRef.current = setInterval(() => {
        try {
          if (playerRef.current?.getCurrentTime)
            setProgress(playerRef.current.getCurrentTime());
        } catch {}
      }, 500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  function handleVolumeChange(val: number) {
    setVolume(val);
    try { playerRef.current?.setVolume(val); } catch {}
  }

  function handleSeek(val: number) {
    try { playerRef.current?.seekTo(val, true); } catch {}
    setProgress(val);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  if (!currentTrack) {
    return (
      <footer className="h-14 md:h-20 bg-[#181818] border-t border-[#282828] flex items-center justify-center mb-[52px] md:mb-0">
        <p className="text-[#b3b3b3] text-xs md:text-sm">Select a song to start playing</p>
      </footer>
    );
  }

  return (
    <>
      {/* Mobile player */}
      <footer className="md:hidden flex flex-col bg-[#181818] border-t border-[#282828] mb-[52px]">
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
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0"
          >
            {isPlaying ? (
              <Pause size={14} fill="black" color="black" />
            ) : (
              <Play size={14} fill="black" color="black" className="ml-0.5" />
            )}
          </button>
          <button onClick={playNext} className="text-[#b3b3b3] shrink-0">
            <SkipForward size={18} />
          </button>
        </div>
        <div className="px-3 -mt-1 pb-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full h-0.5 cursor-pointer"
          />
        </div>
      </footer>

      {/* Desktop player */}
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
            <button onClick={playNext} className="text-[#b3b3b3] hover:text-white transition-colors" title="Previous">
              <SkipBack size={18} />
            </button>
            <button
              onClick={isPlaying ? pause : resume}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause size={16} fill="black" color="black" />
              ) : (
                <Play size={16} fill="black" color="black" className="ml-0.5" />
              )}
            </button>
            <button onClick={playNext} className="text-[#b3b3b3] hover:text-white transition-colors" title="Next">
              <SkipForward size={18} />
            </button>
          </div>
          <div className="w-full flex items-center gap-2 text-xs text-[#b3b3b3]">
            <span className="w-10 text-right tabular-nums">{formatTime(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="flex-1 h-1 cursor-pointer"
            />
            <span className="w-10 tabular-nums">{formatTime(duration)}</span>
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
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-24 h-1 cursor-pointer"
          />
        </div>
      </footer>

      {showQueue && <QueueSheet onClose={() => setShowQueue(false)} />}
    </>
  );
}
