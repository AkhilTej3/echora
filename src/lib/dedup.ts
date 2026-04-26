const NOISE_WORDS = new Set([
  "official", "music", "video", "lyrics", "lyrical", "audio", "hd", "4k",
  "full", "song", "songs", "mv", "ft", "feat", "from", "original", "motion",
  "picture", "soundtrack", "the", "and", "a", "of", "in", "with", "by",
  "theme", "instrumental", "unplugged", "acoustic", "remix", "reprise",
  "version", "cover", "karaoke", "live",
]);

function cleanWords(text: string): string[] {
  return text
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 1 && !NOISE_WORDS.has(w));
}

function extractCoreName(title: string): string {
  let t = title.toLowerCase();

  t = t.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");
  t = t.replace(/@\w+/g, "");

  const pipeIdx = t.indexOf("|");
  if (pipeIdx > 2) t = t.substring(0, pipeIdx);

  // "Artist - Song Name" → take the right side (song name)
  // "Song Name - Artist" → take the left side (song name)
  // Heuristic: the song name is usually the longer/more descriptive side
  const dashMatch = t.match(/^(.+?)\s*[-–—]\s*(.+)/);
  if (dashMatch) {
    const left = dashMatch[1].trim();
    const right = dashMatch[2].trim();
    const leftWords = cleanWords(left);
    const rightWords = cleanWords(right);

    if (leftWords.length > 0 && rightWords.length > 0) {
      // Right side is almost always the song name in "Artist - Song" format.
      // But if right side has further dashes/pipes, take just the first segment.
      const rightFirst = right.split(/[-–—|]/)[0].trim();
      const rightFirstWords = cleanWords(rightFirst);
      if (rightFirstWords.length > 0) {
        return rightFirstWords.join(" ");
      }
      return rightWords.join(" ");
    }

    // Only one side has meaningful words
    if (leftWords.length > 0) return leftWords.join(" ");
    if (rightWords.length > 0) return rightWords.join(" ");
  }

  return cleanWords(t).join(" ");
}

function getSignificantWords(title: string): Set<string> {
  const core = extractCoreName(title);
  return new Set(core.split(" ").filter((w) => w.length > 2));
}

function extractParts(title: string): { left: string; right: string } | null {
  let t = title.toLowerCase();
  t = t.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");
  t = t.replace(/@\w+/g, "");
  const pipeIdx = t.indexOf("|");
  if (pipeIdx > 2) t = t.substring(0, pipeIdx);

  const dashMatch = t.match(/^(.+?)\s*[-–—]\s*(.+)/);
  if (!dashMatch) return null;

  const leftWords = cleanWords(dashMatch[1].trim());
  const rightFirst = dashMatch[2].trim().split(/[-–—|]/)[0].trim();
  const rightWords = cleanWords(rightFirst);

  if (leftWords.length === 0 || rightWords.length === 0) return null;

  return {
    left: leftWords.join(" "),
    right: rightWords.join(" "),
  };
}

function partsContain(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) {
    if (b.includes(a) && a.length / b.length > 0.5) return true;
    if (a.includes(b) && b.length / a.length > 0.5) return true;
  }
  return false;
}

export function isSameSong(titleA: string, titleB: string): boolean {
  if (titleA === titleB) return true;

  const partsA = extractParts(titleA);
  const partsB = extractParts(titleB);

  if (partsA && partsB) {
    const sameOrder =
      partsContain(partsA.left, partsB.left) &&
      partsContain(partsA.right, partsB.right);
    const crossOrder =
      partsContain(partsA.left, partsB.right) &&
      partsContain(partsA.right, partsB.left);
    return sameOrder || crossOrder;
  }

  const coreA = extractCoreName(titleA);
  const coreB = extractCoreName(titleB);

  if (!coreA || !coreB) return false;

  if (partsA || partsB) {
    const parts = (partsA || partsB)!;
    const core = partsA ? coreB : coreA;
    if (partsContain(core, parts.left) || partsContain(core, parts.right))
      return true;
  }

  if (coreA === coreB) return true;

  if (coreA.length >= 6 && coreB.length >= 6) {
    if (coreB.includes(coreA) && coreA.length / coreB.length > 0.5) return true;
    if (coreA.includes(coreB) && coreB.length / coreA.length > 0.5) return true;
  }

  const wordsA = getSignificantWords(titleA);
  const wordsB = getSignificantWords(titleB);

  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }

  const smaller = Math.min(wordsA.size, wordsB.size);
  const larger = Math.max(wordsA.size, wordsB.size);

  return smaller > 0 && shared / smaller >= 0.7 && shared / larger >= 0.5;
}

export function isDuplicate(
  title: string,
  playedTitles: string[]
): boolean {
  for (const played of playedTitles) {
    if (isSameSong(title, played)) return true;
  }
  return false;
}
