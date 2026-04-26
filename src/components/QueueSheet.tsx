"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import { X, Music } from "lucide-react";
import Image from "next/image";

export default function QueueSheet({ onClose }: { onClose: () => void }) {
  const { currentTrack, queue, recommendations, removeFromQueue, play, playWithQueue, clearQueue } =
    usePlayerStore();

  function playFromQueueIndex(index: number) {
    const track = queue[index];
    const remaining = queue.filter((_, i) => i !== index).slice(index > 0 ? index - 1 : 0);
    playWithQueue(track, queue.filter((_, i) => i > index));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#181818] rounded-t-2xl max-h-[85vh] md:max-h-[70vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#282828]">
          <h2 className="text-lg font-bold text-white">Queue</h2>
          <button
            onClick={onClose}
            className="text-[#b3b3b3] hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-2 py-2">
          {currentTrack && (
            <div className="px-3 mb-4">
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                Now playing
              </p>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-[#282828]">
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
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1DB954] truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-[#b3b3b3] truncate">
                    {currentTrack.channelName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {queue.length > 0 && (
            <div className="px-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Next up
                </p>
                <button
                  onClick={clearQueue}
                  className="text-xs text-[#b3b3b3] hover:text-white transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-0.5">
                {queue.map((track, i) => (
                  <div
                    key={`${track.videoId}-${i}`}
                    className="group flex items-center gap-3 p-2 rounded-lg hover:bg-[#282828] transition-colors cursor-pointer"
                    onClick={() => playFromQueueIndex(i)}
                  >
                    <span className="w-5 text-center text-xs text-[#b3b3b3] tabular-nums">
                      {i + 1}
                    </span>
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
                        <div className="w-full h-full bg-[#282828] flex items-center justify-center text-[#b3b3b3]">
                          <Music size={14} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-xs text-[#b3b3b3] truncate">
                        {track.channelName}
                      </p>
                    </div>
                    <span className="text-xs text-[#b3b3b3]/60 tabular-nums mr-1">
                      {track.duration}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(i);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[#b3b3b3] hover:text-white p-1 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="px-3 mb-4">
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                Recommended
              </p>
              <div className="space-y-0.5">
                {recommendations.slice(0, 10).map((track) => (
                  <div
                    key={track.videoId}
                    className="group flex items-center gap-3 p-2 rounded-lg hover:bg-[#282828] transition-colors cursor-pointer"
                    onClick={() => play(track)}
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
                        <div className="w-full h-full bg-[#282828] flex items-center justify-center text-[#b3b3b3]">
                          <Music size={14} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-xs text-[#b3b3b3] truncate">
                        {track.channelName}
                      </p>
                    </div>
                    <span className="text-xs text-[#b3b3b3]/60 tabular-nums">
                      {track.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {queue.length === 0 && recommendations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#b3b3b3] text-sm">Queue is empty</p>
              <p className="text-[#b3b3b3]/60 text-xs mt-1">
                Add songs to see them here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
