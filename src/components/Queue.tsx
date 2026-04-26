"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import TrackCard from "./TrackCard";

export default function Queue() {
  const { queue, clearQueue, recommendations } = usePlayerStore();

  return (
    <div className="space-y-6">
      {queue.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Queue</h3>
            <button
              onClick={clearQueue}
              className="text-xs text-[#b3b3b3] hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1">
            {queue.map((track, i) => (
              <TrackCard key={`${track.videoId}-${i}`} track={track} />
            ))}
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3">
            Recommended
          </h3>
          <div className="space-y-1">
            {recommendations.map((track) => (
              <TrackCard key={track.videoId} track={track} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
