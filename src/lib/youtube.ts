import YouTube from "youtube-sr";
import { isDuplicate } from "./dedup";
import { generateMoodTags } from "./mood";

export interface SearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: string;
  viewCount: number;
}

export async function searchYouTube(query: string): Promise<SearchResult[]> {
  const results = await YouTube.search(`${query} music`, {
    limit: 20,
    type: "video",
  });

  return results
    .filter((v) => v.id && v.title)
    .map((v) => ({
      videoId: v.id!,
      title: v.title!,
      thumbnail:
        v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      channelName: v.channel?.name || "Unknown",
      duration: v.durationFormatted || formatDuration(v.duration || 0),
      viewCount: v.views || 0,
    }));
}

interface SessionTrack {
  videoId: string;
  title: string;
  channelName: string;
}

interface SongContext {
  songName: string;
  artist: string;
  album: string;
  tags: string[];
  mood: string[];
  genre: string;
  lang: string;
  collaborators: string[];
}

async function enrichCurrentTrack(track: SessionTrack): Promise<SongContext> {
  const ctx: SongContext = {
    songName: extractSongName(track.title),
    artist: extractArtist(track.title, track.channelName),
    album: "",
    tags: [],
    mood: generateMoodTags(track.title, track.channelName),
    genre: "",
    lang: "",
    collaborators: [],
  };

  try {
    const video = await YouTube.getVideo(
      `https://www.youtube.com/watch?v=${track.videoId}`
    );

    if (video?.music?.length) {
      const m = video.music[0];
      if (m.artist) ctx.artist = m.artist;
      if (m.title) ctx.songName = m.title;
      if (m.album) ctx.album = m.album;
    }

    if (video?.tags?.length) {
      ctx.tags = video.tags
        .filter((t) => t.length > 2 && t.length < 50)
        .slice(0, 15);
    }

    if (ctx.artist) {
      const parts = ctx.artist.split(/[,&]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        ctx.artist = parts[0];
        ctx.collaborators = parts.slice(1);
      }
    }
  } catch {}

  const allText = [track.title, track.channelName, ...ctx.tags].join(" ");
  ctx.genre = detectGenre(allText);
  ctx.lang = detectLanguage(allText);

  return ctx;
}

interface QuerySlot {
  category: string;
  query: string;
  weight: number;
}

function buildDiverseQueries(
  ctx: SongContext,
  sessionArtists: string[],
  sessionGenre: string,
  sessionLang: string,
  historyLen: number
): QuerySlot[] {
  const slots: QuerySlot[] = [];

  // --- CORE: directly related to what's playing (highest priority) ---
  if (ctx.songName) {
    slots.push({
      category: "song-similar",
      query: `${ctx.songName} ${ctx.artist} similar songs`,
      weight: 20,
    });
  }

  if (ctx.artist) {
    slots.push({
      category: "same-artist",
      query: `${ctx.artist} best songs`,
      weight: 18,
    });
    slots.push({
      category: "same-artist",
      query: `${ctx.artist} hit songs playlist`,
      weight: 17,
    });
  }

  if (ctx.album && ctx.album !== ctx.songName) {
    slots.push({
      category: "same-album",
      query: `${ctx.album} ${ctx.artist} songs`,
      weight: 16,
    });
  }

  // --- EXPAND: collaborators and closely related artists ---
  for (const collab of ctx.collaborators.slice(0, 2)) {
    slots.push({
      category: "collaborator",
      query: `${collab} popular songs`,
      weight: 12,
    });
  }

  const relatedArtists = getRelatedArtists(ctx.artist, ctx.genre, ctx.lang);
  for (const ra of relatedArtists.slice(0, 2)) {
    slots.push({
      category: "related-artist",
      query: `${ra} hit songs`,
      weight: 10,
    });
  }

  // --- SESSION: other artists from queue/history ---
  for (const sa of sessionArtists.slice(0, 2)) {
    if (sa.toLowerCase() !== ctx.artist.toLowerCase()) {
      slots.push({
        category: "session-artist",
        query: `${sa} songs`,
        weight: 9,
      });
    }
  }

  // --- TAGS: use YouTube's own tags for discovery ---
  const goodTags = ctx.tags.filter(
    (t) =>
      t.length > 4 &&
      !t.toLowerCase().includes(ctx.artist.toLowerCase()) &&
      !t.toLowerCase().includes(ctx.songName.toLowerCase())
  );
  if (goodTags.length > 0) {
    const tagQuery = goodTags.slice(0, 3).join(" ");
    slots.push({
      category: "tag-based",
      query: `${tagQuery} songs`,
      weight: 8,
    });
  }

  // --- GENRE & MOOD (lower priority) ---
  const genre = ctx.genre || sessionGenre;
  const lang = ctx.lang || sessionLang;

  if (genre) {
    slots.push({
      category: "genre",
      query: `${lang ? lang + " " : ""}${genre} hits ${new Date().getFullYear()}`,
      weight: 5,
    });
  }

  if (ctx.mood.length > 0 && ctx.mood[0] !== "vibes") {
    slots.push({
      category: "mood",
      query: `${ctx.mood[0]} ${lang || genre || ""} music playlist`,
      weight: 4,
    });
  }

  // --- DRIFT: only after enough session history, very low priority ---
  if (historyLen > 5) {
    const driftQuery = buildDriftQuery(ctx, lang, genre, historyLen);
    if (driftQuery) {
      slots.push({
        category: "drift",
        query: driftQuery,
        weight: 2,
      });
    }
  }

  return slots;
}

function buildDriftQuery(
  ctx: SongContext,
  lang: string,
  genre: string,
  historyLen: number
): string {
  const driftPool: string[] = [];

  if (lang) {
    driftPool.push(`${lang} indie music hidden gems`);
    driftPool.push(`${lang} new releases music ${new Date().getFullYear()}`);
    driftPool.push(`best ${lang} songs all time`);
  }

  if (genre) {
    const adjacentGenres: Record<string, string[]> = {
      "lofi hip hop": ["jazz hop", "chillwave", "ambient"],
      bollywood: ["indie hindi", "ghazal", "sufi"],
      tamil: ["tamil indie", "carnatic fusion", "tamil rap"],
      telugu: ["telugu indie", "telugu folk fusion"],
      "k-pop": ["j-pop", "c-pop", "korean indie"],
      "hip hop": ["r&b", "neo soul", "jazz rap"],
      pop: ["indie pop", "synth pop", "dream pop"],
      rock: ["indie rock", "shoegaze", "post rock"],
      edm: ["chillstep", "synthwave", "future bass"],
      classical: ["neo classical", "ambient", "film score"],
      jazz: ["neo soul", "acid jazz", "bossa nova"],
      rnb: ["neo soul", "alternative r&b", "jazz"],
      latin: ["bossa nova", "flamenco", "cumbia"],
    };
    const adjacent = adjacentGenres[genre];
    if (adjacent) {
      for (const g of adjacent) {
        driftPool.push(`${g} music best songs`);
      }
    }
  }

  driftPool.push("music discover weekly new artists");
  driftPool.push("underrated songs you need to hear");
  driftPool.push("viral music trending songs");

  // Drift more as session goes on
  if (historyLen > 8) {
    driftPool.push("best songs across all genres");
    driftPool.push("world music fusion");
  }

  const idx = (Date.now() + historyLen) % driftPool.length;
  return driftPool[idx];
}

const ARTIST_PEERS: Record<string, string[]> = {
  "anirudh ravichander": ["yuvan shankar raja", "harris jayaraj", "d imman", "hip hop tamizha", "santhosh narayanan"],
  "anirudh": ["yuvan shankar raja", "harris jayaraj", "d imman", "hip hop tamizha"],
  "ar rahman": ["ilayaraja", "harris jayaraj", "shankar ehsaan loy", "amit trivedi"],
  "arijit singh": ["atif aslam", "jubin nautiyal", "shreya ghoshal", "armaan malik"],
  "taylor swift": ["olivia rodrigo", "billie eilish", "dua lipa", "sabrina carpenter"],
  "drake": ["the weeknd", "kendrick lamar", "j cole", "travis scott"],
  "the weeknd": ["drake", "dua lipa", "post malone", "bruno mars"],
  "ed sheeran": ["shawn mendes", "sam smith", "lewis capaldi", "john mayer"],
  "bts": ["stray kids", "seventeen", "txt", "blackpink", "twice"],
  "blackpink": ["twice", "itzy", "aespa", "red velvet", "bts"],
  "eminem": ["kendrick lamar", "j cole", "nas", "jay z"],
  "billie eilish": ["olivia rodrigo", "lorde", "lana del rey", "clairo"],
  "dua lipa": ["the weeknd", "harry styles", "lizzo", "doja cat"],
  "bad bunny": ["j balvin", "ozuna", "daddy yankee", "rauw alejandro"],
  "sai abhyankkar": ["pradeep kumar", "sid sriram", "anirudh ravichander", "jonita gandhi"],
};

function getRelatedArtists(artist: string, genre: string, lang: string): string[] {
  const key = artist.toLowerCase();
  if (ARTIST_PEERS[key]) return ARTIST_PEERS[key];

  for (const [k, v] of Object.entries(ARTIST_PEERS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }

  const langArtists: Record<string, string[]> = {
    tamil: ["anirudh ravichander", "yuvan shankar raja", "sid sriram", "ar rahman"],
    hindi: ["arijit singh", "ar rahman", "pritam", "amit trivedi"],
    telugu: ["thaman s", "devi sri prasad", "mickey j meyer"],
    korean: ["bts", "blackpink", "stray kids", "iu"],
    spanish: ["bad bunny", "j balvin", "rosalia", "shakira"],
    punjabi: ["diljit dosanjh", "ap dhillon", "sidhu moose wala"],
  };
  if (lang && langArtists[lang]) {
    return langArtists[lang].filter((a) => a.toLowerCase() !== key);
  }

  return [];
}

export async function getSmartRecommendations(
  current: SessionTrack,
  queue: SessionTrack[],
  history: SessionTrack[]
): Promise<SearchResult[]> {
  const allTracks = [current, ...queue, ...history];
  const excludeIds = new Set(allTracks.map((t) => t.videoId));
  const playedTitles = allTracks.map((t) => t.title);

  const [ctx] = await Promise.all([enrichCurrentTrack(current)]);

  const sessionArtists = new Map<string, number>();
  for (const t of allTracks) {
    const a = extractArtist(t.title, t.channelName);
    if (a) sessionArtists.set(a, (sessionArtists.get(a) || 0) + 1);
  }
  const topSessionArtists = [...sessionArtists.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([a]) => a);

  const sessionText = allTracks.map((t) => `${t.title} ${t.channelName}`).join(" ");
  const sessionGenre = detectGenre(sessionText);
  const sessionLang = detectLanguage(sessionText);

  const slots = buildDiverseQueries(
    ctx,
    topSessionArtists,
    sessionGenre,
    sessionLang,
    history.length
  );

  const limitPerSlot = 6;
  const searchPromises = slots.map((s) =>
    YouTube.search(s.query, { limit: limitPerSlot, type: "video" })
      .then((results) => ({ ...s, results }))
      .catch(() => ({ ...s, results: [] as Awaited<ReturnType<typeof YouTube.search>> }))
  );
  const slotResults = await Promise.all(searchPromises);

  const seen = new Set<string>();
  const acceptedTitles: string[] = [];

  interface ScoredResult extends SearchResult {
    score: number;
    category: string;
  }
  const scored: ScoredResult[] = [];

  for (const slot of slotResults) {
    for (const v of slot.results) {
      const vid = v as { id?: string; title?: string; thumbnail?: { url?: string }; channel?: { name?: string }; durationFormatted?: string; duration?: number; views?: number };
      if (!vid.id || !vid.title || excludeIds.has(vid.id) || seen.has(vid.id)) continue;
      if (isDuplicate(vid.title, playedTitles)) continue;
      if (isDuplicate(vid.title, acceptedTitles)) continue;

      seen.add(vid.id);
      acceptedTitles.push(vid.title);

      const result: SearchResult = {
        videoId: vid.id,
        title: vid.title,
        thumbnail:
          vid.thumbnail?.url || `https://i.ytimg.com/vi/${vid.id}/hqdefault.jpg`,
        channelName: vid.channel?.name || "Unknown",
        duration: vid.durationFormatted || formatDuration(vid.duration || 0),
        viewCount: vid.views || 0,
      };

      let score = slot.weight;

      const resultArtist = extractArtist(result.title, result.channelName).toLowerCase();
      const currentArtist = ctx.artist.toLowerCase();

      if (resultArtist && currentArtist && resultArtist === currentArtist) {
        score += 8;
      } else {
        for (const t of allTracks) {
          const sa = extractArtist(t.title, t.channelName).toLowerCase();
          if (resultArtist && sa && resultArtist === sa) { score += 4; break; }
        }
      }

      if (result.viewCount > 1_000_000) score += 1;
      if (result.viewCount > 10_000_000) score += 1;

      scored.push({ ...result, score, category: slot.category });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // Pick top results, with a soft cap per category to allow some variety
  const picked: SearchResult[] = [];
  const usedCategories = new Map<string, number>();
  const remaining = [...scored];

  while (picked.length < 20 && remaining.length > 0) {
    let bestIdx = -1;
    let bestScore = -1;

    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i];
      const catCount = usedCategories.get(r.category) || 0;
      // Soft penalty after 6 from same category; hard block after 8
      const penalty = catCount >= 8 ? -100 : catCount >= 6 ? -3 : 0;
      const adjusted = r.score + penalty;

      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIdx = i;
      }
    }

    if (bestIdx === -1 || bestScore <= 0) break;

    const chosen = remaining.splice(bestIdx, 1)[0];
    usedCategories.set(chosen.category, (usedCategories.get(chosen.category) || 0) + 1);
    const { score: _s, category: _c, ...track } = chosen;
    picked.push(track);
  }

  return picked;
}

function extractSongName(title: string): string {
  let t = title;
  t = t.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");

  const pipeIdx = t.indexOf("|");
  if (pipeIdx > 2) t = t.substring(0, pipeIdx);

  const dashMatch = t.match(/^(.+?)\s*[-–—]\s*(.+)/);
  if (dashMatch) {
    const left = dashMatch[1].replace(/@/g, "").trim();
    const right = dashMatch[2].trim();
    const noisePattern = /official|music|video|lyrics|audio|song/i;
    if (!noisePattern.test(left) && left.length > 1) {
      return left.length <= right.length ? left : right.split(/[-–—|]/)[0].trim();
    }
    return right.split(/[-–—|]/)[0].trim();
  }

  return t
    .replace(/official|music|video|lyrics|audio|hd|4k|full|song/gi, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractArtist(title: string, channelName: string): string {
  const dashMatch = title.match(/^(.+?)\s*[-–—]\s*/);
  if (dashMatch) {
    const before = dashMatch[1]
      .replace(/@/g, "")
      .replace(/\(.*?\)/g, "")
      .trim();
    if (before.length > 1 && before.length < 40) return before;
  }

  const byMatch = title.match(/by\s+(.+?)(?:\s*[-–—(|]|$)/i);
  if (byMatch) return byMatch[1].trim();

  const cleanChannel = channelName
    .replace(/[-–]?\s*(topic|official|music|vevo|records|entertainment)$/i, "")
    .trim();
  if (cleanChannel && cleanChannel !== "Unknown") return cleanChannel;

  return "";
}

const GENRE_KEYWORDS: Record<string, string[]> = {
  "lofi hip hop": ["lofi", "lo-fi", "lo fi", "chillhop"],
  bollywood: ["bollywood", "hindi", "filmi"],
  tamil: ["tamil", "kollywood"],
  telugu: ["telugu", "tollywood"],
  "k-pop": ["kpop", "k-pop", "korean"],
  "hip hop": ["rap", "hip hop", "trap", "drill"],
  pop: ["pop"],
  rock: ["rock", "metal", "punk"],
  edm: ["edm", "electronic", "house", "techno", "trance", "dubstep"],
  classical: ["classical", "raag", "raga", "carnatic", "hindustani"],
  jazz: ["jazz", "blues"],
  rnb: ["r&b", "rnb", "soul"],
  latin: ["reggaeton", "latin", "bachata", "salsa"],
};

function detectGenre(text: string): string {
  const lower = text.toLowerCase();
  const scores: [string, number][] = [];
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    const count = keywords.filter((kw) => lower.includes(kw)).length;
    if (count > 0) scores.push([genre, count]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0]?.[0] || "";
}

const LANG_SIGNALS: Record<string, string[]> = {
  tamil: ["tamil", "kollywood", "think music", "sun music", "think indie"],
  hindi: ["bollywood", "hindi", "t-series", "zee music", "tips official"],
  telugu: ["telugu", "tollywood", "aditya music", "mango music"],
  korean: ["kpop", "k-pop", "korean", "hybe", "jyp", "sm entertainment"],
  spanish: ["reggaeton", "latin", "bachata", "spanish"],
  punjabi: ["punjabi", "bhangra", "speed records"],
  malayalam: ["malayalam", "muzik247"],
  kannada: ["kannada", "anand audio"],
};

function detectLanguage(text: string): string {
  const lower = text.toLowerCase();
  for (const [lang, signals] of Object.entries(LANG_SIGNALS)) {
    if (signals.some((s) => lower.includes(s))) return lang;
  }
  return "";
}

function formatDuration(ms: number): string {
  if (!ms) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
