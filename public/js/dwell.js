// Hover-dwell (D1): facts about a word of the galaxy, shown under the lamp — its rank in the verse and in the
// surah, and how many times its exact written form (Tanzil Uthmani text, 77,433 words) occurs in the Quran.
// Pure functions; computed in the browser from data/words.json, nothing generated.

let counts = null, countsOf = null;
export function formCount(words, i) {
  if (countsOf !== words) {
    counts = new Map();
    for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
    countsOf = words;
  }
  return counts.get(words[i]) || 0;
}

// i: word index; [v0, v1): words of its verse; s0: first word of its surah
export function wordFacts(words, i, [v0, v1], s0) {
  return { word: words[i], inVerse: i - v0 + 1, verseWords: v1 - v0, inSura: i - s0 + 1, occurrences: formCount(words, i) };
}
