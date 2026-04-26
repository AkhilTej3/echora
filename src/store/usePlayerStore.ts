import { create } from "zustand";
import { isDuplicate } from "@/lib/dedup";

export interface Track {
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: string;
  streamUrl?: string;
  language?: string;
  moodTags?: string[];
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  recommendations: Track[];
  recentlyPlayed: Track[];
  sessionHistory: Track[];
  pendingRecommendations: Promise<void> | null;

  play: (track: Track) => void;
  playWithQueue: (track: Track, upcoming: Track[]) => void;
  pause: () => void;
  resume: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  playNext: () => void;
  clearQueue: () => void;
  setRecommendations: (tracks: Track[]) => void;
  setRecentlyPlayed: (tracks: Track[]) => void;
}

function getPlayedTitles(state: {
  currentTrack: Track | null;
  queue: Track[];
  sessionHistory: Track[];
}): string[] {
  const titles: string[] = [];
  if (state.currentTrack) titles.push(state.currentTrack.title);
  for (const t of state.queue) titles.push(t.title);
  for (const t of state.sessionHistory) titles.push(t.title);
  return titles;
}

function getPlayedIds(state: {
  currentTrack: Track | null;
  queue: Track[];
  sessionHistory: Track[];
}): Set<string> {
  const ids = new Set<string>();
  if (state.currentTrack) ids.add(state.currentTrack.videoId);
  for (const t of state.queue) ids.add(t.videoId);
  for (const t of state.sessionHistory) ids.add(t.videoId);
  return ids;
}

function filterFreshRecs(recs: Track[], state: {
  currentTrack: Track | null;
  queue: Track[];
  sessionHistory: Track[];
}): Track[] {
  const playedTitles = getPlayedTitles(state);
  const playedIds = getPlayedIds(state);
  const accepted: string[] = [];

  return recs.filter((t) => {
    if (playedIds.has(t.videoId)) return false;
    if (isDuplicate(t.title, playedTitles)) return false;
    if (isDuplicate(t.title, accepted)) return false;
    accepted.push(t.title);
    return true;
  });
}

function pickFreshRecommendation(
  recs: Track[],
  state: { currentTrack: Track | null; queue: Track[]; sessionHistory: Track[] }
): { next: Track; rest: Track[] } | null {
  const playedTitles = getPlayedTitles(state);
  const playedIds = getPlayedIds(state);

  for (let i = 0; i < recs.length; i++) {
    if (playedIds.has(recs[i].videoId)) continue;
    if (isDuplicate(recs[i].title, playedTitles)) continue;
    return {
      next: recs[i],
      rest: [...recs.slice(0, i), ...recs.slice(i + 1)],
    };
  }
  return null;
}

function fetchRecommendations(
  track: Track,
  queue: Track[],
  history: Track[],
  set: (partial: Partial<PlayerState>) => void,
  get: () => PlayerState
): Promise<void> {
  const promise = fetch("/api/related", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current: {
        videoId: track.videoId,
        title: track.title,
        channelName: track.channelName,
        language: track.language || "",
      },
      queue: queue.map((t) => ({
        videoId: t.videoId,
        title: t.title,
        channelName: t.channelName,
        language: t.language || "",
      })),
      history: history.map((t) => ({
        videoId: t.videoId,
        title: t.title,
        channelName: t.channelName,
        language: t.language || "",
      })),
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.results) {
        const state = get();
        const filtered = filterFreshRecs(data.results, state);
        set({ recommendations: filtered, pendingRecommendations: null });
      }
    })
    .catch(() => {
      set({ pendingRecommendations: null });
    });

  set({ pendingRecommendations: promise });
  return promise;
}

function fetchMoodTags(
  track: Track,
  set: (fn: (state: PlayerState) => Partial<PlayerState>) => void
) {
  fetch(
    `/api/tags?videoId=${track.videoId}&title=${encodeURIComponent(track.title)}&channel=${encodeURIComponent(track.channelName)}`
  )
    .then((res) => res.json())
    .then((data) => {
      if (data.tags) {
        set((state) => ({
          currentTrack: state.currentTrack
            ? { ...state.currentTrack, moodTags: data.tags }
            : null,
        }));
      }
    })
    .catch(() => {});
}

function saveRecentlyPlayed(track: Track) {
  fetch("/api/recently-played", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(track),
  }).catch(() => {});
}

function buildHistory(prev: Track | null, prevHistory: Track[]): Track[] {
  if (!prev) return prevHistory;
  return [prev, ...prevHistory.filter((t) => t.videoId !== prev.videoId)].slice(
    0,
    20
  );
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  recommendations: [],
  recentlyPlayed: [],
  sessionHistory: [],
  pendingRecommendations: null,

  play: (track) => {
    const { currentTrack: prev, sessionHistory: prevHistory } = get();
    const newHistory = buildHistory(prev, prevHistory);

    set({
      currentTrack: track,
      isPlaying: true,
      sessionHistory: newHistory,
    });

    saveRecentlyPlayed(track);
    fetchMoodTags(track, set);

    const { queue } = get();
    fetchRecommendations(track, queue, newHistory, set, get);
  },

  playWithQueue: (track, upcoming) => {
    const { currentTrack: prev, sessionHistory: prevHistory } = get();
    const newHistory = buildHistory(prev, prevHistory);

    set({
      currentTrack: track,
      isPlaying: true,
      queue: upcoming,
      sessionHistory: newHistory,
    });

    saveRecentlyPlayed(track);
    fetchMoodTags(track, set);

    if (upcoming.length === 0) {
      fetchRecommendations(track, [], newHistory, set, get);
    }
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  addToQueue: (track) =>
    set((state) => ({ queue: [...state.queue, track] })),

  removeFromQueue: (index) =>
    set((state) => ({
      queue: state.queue.filter((_, i) => i !== index),
    })),

  playNext: async () => {
    const { queue, recommendations, currentTrack, sessionHistory, pendingRecommendations } =
      get();

    if (queue.length > 0) {
      const [next, ...rest] = queue;
      const newHistory = buildHistory(currentTrack, sessionHistory);

      set({
        currentTrack: next,
        queue: rest,
        isPlaying: true,
        sessionHistory: newHistory,
      });

      saveRecentlyPlayed(next);
      fetchMoodTags(next, set);

      if (rest.length === 0) {
        fetchRecommendations(next, [], newHistory, set, get);
      }
      return;
    }

    const pick = pickFreshRecommendation(recommendations, get());
    if (pick) {
      set({ recommendations: pick.rest });
      get().play(pick.next);
      return;
    }

    if (pendingRecommendations) {
      await pendingRecommendations;
      const freshPick = pickFreshRecommendation(get().recommendations, get());
      if (freshPick) {
        set({ recommendations: freshPick.rest });
        get().play(freshPick.next);
        return;
      }
    }

    if (currentTrack) {
      const newHistory = buildHistory(currentTrack, sessionHistory);
      fetchRecommendations(currentTrack, [], newHistory, set, get);

      try {
        await get().pendingRecommendations;
        const lastPick = pickFreshRecommendation(get().recommendations, get());
        if (lastPick) {
          set({ recommendations: lastPick.rest });
          get().play(lastPick.next);
          return;
        }
      } catch {}
    }

    set({ currentTrack: null, isPlaying: false });
  },

  clearQueue: () => set({ queue: [] }),
  setRecommendations: (tracks) => set({ recommendations: tracks }),
  setRecentlyPlayed: (tracks) => set({ recentlyPlayed: tracks }),
}));
