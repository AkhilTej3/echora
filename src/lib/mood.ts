const MOOD_KEYWORDS: Record<string, string[]> = {
  chill: [
    "chill", "relax", "lofi", "lo-fi", "ambient", "calm", "peaceful",
    "mellow", "soft", "gentle", "acoustic", "slow", "easy listening",
    "smooth", "jazzy", "bossa", "rainy", "cozy",
  ],
  energetic: [
    "energetic", "hype", "pump", "workout", "gym", "edm", "dance",
    "upbeat", "party", "bass", "drop", "rave", "electronic", "fast",
    "power", "intense", "remix", "club", "techno", "house",
  ],
  sad: [
    "sad", "heartbreak", "lonely", "crying", "pain", "broken",
    "melancholy", "depressed", "emotional", "tears", "miss you",
    "goodbye", "lost", "grief", "sorrow", "blue",
  ],
  focus: [
    "focus", "study", "concentration", "productive", "work", "coding",
    "reading", "instrumental", "piano", "classical", "meditation",
    "deep work", "binaural", "alpha waves",
  ],
  happy: [
    "happy", "joy", "fun", "smile", "sunshine", "good vibes",
    "feel good", "positive", "cheerful", "bright", "summer",
    "celebration", "dancing", "groovy",
  ],
  romantic: [
    "love", "romantic", "romance", "heart", "valentine", "wedding",
    "serenade", "passion", "intimate", "couple", "duet",
  ],
};

export function generateMoodTags(title: string, channel: string): string[] {
  const text = `${title} ${channel}`.toLowerCase();
  const tags: string[] = [];

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    const matchCount = keywords.filter((kw) => text.includes(kw)).length;
    if (matchCount >= 1) {
      tags.push(mood);
    }
  }

  if (tags.length === 0) {
    tags.push("vibes");
  }

  return tags.slice(0, 3);
}
