import { LETTERS } from "@/data/letters";
import type { ContentItem, Lang } from "@/data/types";

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// Tek dilli — eski API uyumu için
export function getGameLang(): Lang { return "tr"; }
export function setGameLang(_l: Lang) { /* no-op */ }

// Oyunlarda kullanılan havuz: 28 temel harf (lamelif hariç) — uzun isimleri sesli
const LONG_NAMES: Record<string, string> = {
  elif: "أَلِف", be: "بَاء", te: "تَاء", se: "ثَاء", cim: "جِيم", ha: "حَاء", hi: "خَاء",
  dal: "دَال", zel: "ذَال", ra: "رَاء", ze: "زَاي", sin: "سِين", sin2: "شِين",
  sad: "صَاد", dad: "ضَاد", ti: "طَاء", zi: "ظَاء", ayin: "عَيْن", gayin: "غَيْن",
  fe: "فَاء", kaf: "قَاف", kef: "كَاف", lam: "لاَم", mim: "مِيم", nun: "نُون",
  vav: "وَاو", he: "هَاء", ye: "يَاء",
};

const POOL: ContentItem[] = LETTERS.filter((l) => l.id !== "lamelif").map((l) => ({
  id: `pool-${l.id}`,
  label: l.name,         // Türkçe ismi (be, te, cim...)
  subLabel: l.name,
  speech: LONG_NAMES[l.id] ?? l.letter,
  lang: "tr" as const,
  emoji: l.letter,        // Oyunlar emoji alanını büyük gösterir → Arapça harfi göster
}));

export function gamePool(_lang?: Lang): ContentItem[] {
  return POOL;
}

export function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}
