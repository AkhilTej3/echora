import { NextRequest, NextResponse } from "next/server";
import { searchSongs } from "@/lib/jiosaavn";
import { generateMoodTags } from "@/lib/mood";
import { isDuplicate } from "@/lib/dedup";

interface SessionTrack {
  videoId: string;
  title: string;
  channelName: string;
  language?: string;
}

interface QuerySlot {
  category: string;
  query: string;
  weight: number;
}

export async function POST(req: NextRequest) {
  try {
    const { current, queue, history } = await req.json();

    if (!current?.title) {
      return NextResponse.json({ error: "current track required" }, { status: 400 });
    }

    const allTracks: SessionTrack[] = [current, ...(queue || []), ...(history || [])];
    const excludeIds = new Set(allTracks.map((t) => t.videoId));
    const playedTitles = allTracks.map((t) => t.title);

    const artist = extractArtist(current.title, current.channelName);
    const songName = extractSongName(current.title);
    const mood = generateMoodTags(current.title, current.channelName);

    const sessionText = allTracks.map((t) => `${t.title} ${t.channelName}`).join(" ");
    const genre = detectGenre(sessionText);

    const langCounts = new Map<string, number>();
    for (const t of allTracks) {
      const tl = (t.language || "").toLowerCase().trim();
      if (tl) langCounts.set(tl, (langCounts.get(tl) || 0) + 1);
    }
    let lang = "";
    if (langCounts.size > 0) {
      lang = [...langCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    if (!lang) {
      lang = detectLanguage(sessionText);
    }

    const sessionArtists = new Map<string, number>();
    for (const t of allTracks) {
      const a = extractArtist(t.title, t.channelName);
      if (a) sessionArtists.set(a, (sessionArtists.get(a) || 0) + 1);
    }
    const topSessionArtists = [...sessionArtists.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([a]) => a);

    const collaborators = extractCollaborators(current.channelName);
    const relatedArtists = getRelatedArtists(artist, genre, lang);

    const slots = buildDiverseQueries({
      songName,
      artist,
      collaborators,
      relatedArtists,
      mood,
      genre,
      lang,
      topSessionArtists,
      historyLen: (history || []).length,
    });

    const searchPromises = slots.map((s) =>
      searchSongs(s.query, 8)
        .then((results) => ({ ...s, results }))
        .catch(() => ({ ...s, results: [] as ReturnType<typeof searchSongs> extends Promise<infer T> ? T : never[] }))
    );
    const slotResults = await Promise.all(searchPromises);

    const seen = new Set<string>();
    const acceptedTitles: string[] = [];

    interface ScoredResult {
      track: (typeof slotResults)[0]["results"][0];
      score: number;
      category: string;
    }
    const scored: ScoredResult[] = [];

    for (const slot of slotResults) {
      for (const track of slot.results) {
        if (!track.videoId || excludeIds.has(track.videoId) || seen.has(track.videoId)) continue;
        if (isDuplicate(track.title, playedTitles)) continue;
        if (isDuplicate(track.title, acceptedTitles)) continue;

        seen.add(track.videoId);
        acceptedTitles.push(track.title);

        let score = slot.weight;

        const trackArtist = track.channelName?.toLowerCase() || "";
        const currentArtist = artist.toLowerCase();

        if (trackArtist && currentArtist && trackArtist.includes(currentArtist)) {
          score += 8;
        } else {
          for (const t of allTracks) {
            const sa = extractArtist(t.title, t.channelName).toLowerCase();
            if (trackArtist && sa && trackArtist.includes(sa)) {
              score += 4;
              break;
            }
          }
        }

        scored.push({ track, score, category: slot.category });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const picked = [];
    const usedCategories = new Map<string, number>();
    const remaining = [...scored];

    while (picked.length < 20 && remaining.length > 0) {
      let bestIdx = -1;
      let bestScore = -1;

      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i];
        const catCount = usedCategories.get(r.category) || 0;
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
      picked.push(chosen.track);
    }

    return NextResponse.json({ results: picked });
  } catch (error) {
    console.error("Related error:", error);
    return NextResponse.json({ error: "Failed", results: [] }, { status: 500 });
  }
}

interface QueryContext {
  songName: string;
  artist: string;
  collaborators: string[];
  relatedArtists: string[];
  mood: string[];
  genre: string;
  lang: string;
  topSessionArtists: string[];
  historyLen: number;
}

function buildDiverseQueries(ctx: QueryContext): QuerySlot[] {
  const slots: QuerySlot[] = [];
  const lang = ctx.lang;
  const genre = ctx.genre;
  const langPrefix = lang ? `${lang} ` : "";

  if (ctx.songName) {
    slots.push({ category: "song-similar", query: `${ctx.songName} ${ctx.artist}`, weight: 20 });
  }

  if (ctx.artist) {
    slots.push({ category: "same-artist", query: `${ctx.artist} best songs`, weight: 18 });
    slots.push({ category: "same-artist", query: `${ctx.artist} hit songs`, weight: 17 });
  }

  for (const collab of ctx.collaborators.slice(0, 2)) {
    slots.push({ category: "collaborator", query: `${collab} popular songs`, weight: 12 });
  }

  for (const ra of ctx.relatedArtists.slice(0, 3)) {
    slots.push({ category: "related-artist", query: `${ra} hit songs`, weight: 10 });
  }

  for (const sa of ctx.topSessionArtists.slice(0, 2)) {
    if (sa.toLowerCase() !== ctx.artist.toLowerCase()) {
      slots.push({ category: "session-artist", query: `${sa} songs`, weight: 9 });
    }
  }

  if (lang) {
    slots.push({ category: "lang", query: `${lang} hits ${new Date().getFullYear()}`, weight: 14 });
    slots.push({ category: "lang", query: `${lang} trending songs`, weight: 13 });
    slots.push({ category: "lang", query: `best ${lang} songs`, weight: 11 });
    slots.push({ category: "lang", query: `${lang} new releases ${new Date().getFullYear()}`, weight: 9 });

    if (genre) {
      slots.push({ category: "lang-genre", query: `${lang} ${genre} hits`, weight: 12 });
    }

    if (ctx.mood.length > 0 && ctx.mood[0] !== "vibes") {
      slots.push({ category: "lang-mood", query: `${lang} ${ctx.mood[0]} songs`, weight: 8 });
    }
  }

  if (genre) {
    slots.push({
      category: "genre",
      query: `${langPrefix}${genre} hits ${new Date().getFullYear()}`,
      weight: 6,
    });
  }

  if (!lang && ctx.mood.length > 0 && ctx.mood[0] !== "vibes") {
    slots.push({
      category: "mood",
      query: `${ctx.mood[0]} ${genre || ""} songs`,
      weight: 5,
    });
  }

  if (ctx.historyLen > 5) {
    const drift = buildDriftQuery(genre, lang, ctx.historyLen);
    if (drift) {
      slots.push({ category: "drift", query: drift, weight: 2 });
    }
  }

  return slots;
}

function buildDriftQuery(genre: string, lang: string, historyLen: number): string {
  const pool: string[] = [];

  if (lang) {
    pool.push(`${lang} indie music hidden gems`);
    pool.push(`${lang} new releases ${new Date().getFullYear()}`);
    pool.push(`best ${lang} songs all time`);
  }

  if (genre) {
    const adjacent: Record<string, string[]> = {
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
    const adj = adjacent[genre];
    if (adj) {
      for (const g of adj) {
        pool.push(`${g} music best songs`);
      }
    }
  }

  pool.push("viral music trending songs");
  pool.push("discover new artists music");

  if (historyLen > 8) {
    pool.push("best songs across all genres");
    pool.push("world music fusion");
  }

  const idx = (Date.now() + historyLen) % pool.length;
  return pool[idx];
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
  "sid sriram": ["anirudh ravichander", "pradeep kumar", "chinmayi", "haricharan"],
  "pritam": ["arijit singh", "vishal-shekhar", "amit trivedi", "sachin-jigar"],
  "amit trivedi": ["pritam", "ar rahman", "vishal-shekhar", "shankar ehsaan loy"],
  "diljit dosanjh": ["ap dhillon", "sidhu moose wala", "karan aujla", "guru randhawa"],
  "ap dhillon": ["diljit dosanjh", "karan aujla", "shubh", "imran khan"],
  "thaman s": ["devi sri prasad", "mickey j meyer", "anirudh ravichander"],
  "devi sri prasad": ["thaman s", "mickey j meyer", "mani sharma"],
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
    malayalam: ["sushin shyam", "vineeth sreenivasan"],
    kannada: ["d imman", "v harikrishna"],
  };
  if (lang && langArtists[lang]) {
    return langArtists[lang].filter((a) => a.toLowerCase() !== key);
  }

  return [];
}

function extractSongName(title: string): string {
  let t = title;
  t = t.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");

  const dashMatch = t.match(/^(.+?)\s*[-\u2013\u2014]\s*(.+)/);
  if (dashMatch) {
    const left = dashMatch[1].trim();
    const right = dashMatch[2].trim();
    return left.length <= right.length ? left : right;
  }

  return t.replace(/official|music|video|lyrics|audio|song/gi, "").replace(/\s+/g, " ").trim();
}

function extractArtist(title: string, channelName: string): string {
  const dashMatch = title.match(/^(.+?)\s*[-\u2013\u2014]\s*/);
  if (dashMatch) {
    const before = dashMatch[1].replace(/@/g, "").replace(/\(.*?\)/g, "").trim();
    if (before.length > 1 && before.length < 40) return before;
  }

  const clean = channelName
    .replace(/[-\u2013]?\s*(topic|official|music|vevo|records|entertainment)$/i, "")
    .trim();
  if (clean && clean !== "Unknown") return clean;

  return channelName || "";
}

function extractCollaborators(channelName: string): string[] {
  if (!channelName) return [];
  const parts = channelName.split(/[,&]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.slice(1);
  }
  return [];
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
