import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LangToggle } from "@/components/LangToggle";
import { playItem, playFeedback } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { gamePool, getGameLang, pickN, shuffle } from "./_shared";
import type { ContentItem } from "@/data/types";

// =============================================================
// Kutu Boşalt — kutu içinde 3-4 farklı nesne. Aynı nesneden 3'ünü
// üst üste seçince o nesnenin adını söyler ve siler. Kutu boşalınca kazan.
// =============================================================

const TOTAL_ITEMS = 18; // 6 of each across ~3 types

interface Cell { uid: string; item: ContentItem; selected: boolean; cleared: boolean; }

function buildBox(): { cells: Cell[]; types: ContentItem[] } {
  const lang = getGameLang();
  const pool = gamePool(lang);
  const types = pickN(pool, 3);
  // Each type appears exactly 6 times (so 3 sets of 3 per type) — 18 cells total
  const all: ContentItem[] = [];
  types.forEach((t) => { for (let i = 0; i < 6; i++) all.push(t); });
  const shuffled = shuffle(all);
  const cells: Cell[] = shuffled.map((it, i) => ({
    uid: `${it.id}-${i}`, item: it, selected: false, cleared: false,
  }));
  return { cells, types };
}

const SorterGame = () => {
  const [board, setBoard] = useState(() => buildBox());
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  // bump key to rebuild on lang change
  const [, setLangKey] = useState(0);
  useEffect(() => {
    const h = () => { setBoard(buildBox()); setScore(0); setLangKey((k) => k + 1); };
    window.addEventListener("games-lang-change", h);
    return () => window.removeEventListener("games-lang-change", h);
  }, []);

  const won = useMemo(
    () => board.cells.length > 0 && board.cells.every((c) => c.cleared),
    [board.cells]
  );

  const reset = () => { setBoard(buildBox()); setScore(0); setBusy(false); };

  const tap = async (c: Cell) => {
    if (busy || c.cleared || c.selected) return;
    // toggle select
    const updated = board.cells.map((x) => x.uid === c.uid ? { ...x, selected: true } : x);
    setBoard({ ...board, cells: updated });

    const selectedSame = updated.filter((x) => !x.cleared && x.selected && x.item.id === c.item.id);
    const otherSelected = updated.find((x) => !x.cleared && x.selected && x.item.id !== c.item.id);

    if (otherSelected) {
      // farklı nesne seçildi → seçimi sıfırla
      setBusy(true);
      await playFeedback(false);
      setTimeout(() => {
        setBoard((b) => ({ ...b, cells: b.cells.map((x) => ({ ...x, selected: false })) }));
        setBusy(false);
      }, 450);
      return;
    }

    if (selectedSame.length === 3) {
      setBusy(true);
      // ses + temizle
      playItem(c.item);
      setTimeout(() => {
        setBoard((b) => ({
          ...b,
          cells: b.cells.map((x) =>
            !x.cleared && x.item.id === c.item.id && x.selected
              ? { ...x, cleared: true, selected: false }
              : x
          ),
        }));
        setScore((s) => s + 1);
        setBusy(false);
      }, 600);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-success/15 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="📦 Kutu Boşalt" backTo="/oyunlar" centered onReset={reset} />

        <div className="flex justify-center mb-3">
          <LangToggle />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-primary/30">
            <div className="text-[10px] font-bold text-muted-foreground">Temizlenen</div>
            <div className="text-xl font-extrabold text-primary">{score}</div>
          </div>
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-success/30">
            <div className="text-[10px] font-bold text-muted-foreground">Kalan</div>
            <div className="text-xl font-extrabold text-success">{board.cells.filter((c) => !c.cleared).length}</div>
          </div>
        </div>

        <p className="text-center text-sm font-bold text-muted-foreground mb-2">
          Aynı nesneden 3 tane seç → kutudan silinir!
        </p>

        {won ? (
          <div className="rounded-3xl bg-card p-6 text-center shadow-card border-4 border-success/40 animate-bounce-in">
            <div className="text-6xl mb-2">🎉</div>
            <p className="text-xl font-extrabold">Kutu boşaldı!</p>
            <button onClick={reset} className="mt-3 rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground">Tekrar Oyna</button>
          </div>
        ) : (
          <div className="rounded-3xl bg-gradient-to-br from-warning/30 to-warning/10 border-8 border-warning/60 shadow-card p-3">
            <div className="grid grid-cols-3 gap-2">
              {board.cells.map((c) => (
                <button
                  key={c.uid}
                  onClick={() => tap(c)}
                  disabled={c.cleared}
                  className={cn(
                    "aspect-square rounded-2xl flex items-center justify-center text-4xl shadow-soft border-4 transition-bouncy",
                    c.cleared ? "opacity-0 pointer-events-none" :
                      c.selected ? "bg-success/30 border-success animate-pop scale-110" :
                        "bg-card border-primary/20 hover:-translate-y-1"
                  )}
                >
                  {!c.cleared && <span>{c.item.emoji}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SorterGame;
