import { flattenItems } from "@/data/subjects";
import type { ContentItem, Lang } from "@/data/types";

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const LANG_KEY = "games-lang";

export function getGameLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "en" || v === "tr") return v;
  } catch { /* ignore */ }
  return "tr";
}

export function setGameLang(l: Lang) {
  try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event("games-lang-change")); } catch { /* ignore */ }
}

// Görsel-olarak oyunda kullanılabilecek itemlar (emojili, harf/hece/alfabe değil)
// Dil parametresi opsiyonel — verilmezse seçili dile göre filtrelenir
export function gamePool(lang?: Lang): ContentItem[] {
  const target = lang ?? getGameLang();
  return flattenItems().filter(
    (it) =>
      it.lang === target &&
      !!it.emoji &&
      !it.id.startsWith("harf-") &&
      !it.id.startsWith("ilkses-") &&
      !it.id.startsWith("hece-") &&
      !it.id.startsWith("en-letter-") &&
      !it.id.startsWith("top-") &&
      !it.id.startsWith("cik-") &&
      !it.id.startsWith("karsi-")
  );
}

export function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}
