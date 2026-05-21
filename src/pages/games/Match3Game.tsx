import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LangToggle } from "@/components/LangToggle";
import { playItem, playFeedback } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { gamePool, getGameLang, pickN } from "./_shared";
import type { ContentItem } from "@/data/types";

// =============================================================
// Üçlü Eşleştir — Candy-Crush tarzı, 5x6 grid, 3-4 farklı nesne türü.
// Komşu kutuları takas et; yatay/dikey 3'lü oluşunca patlar ve adı söylenir.
// =============================================================

const COLS = 5;
const ROWS = 6;
const TYPES_COUNT = 4;

type Cell = { id: number; item: ContentItem | null };

let _uid = 0;
const nid = () => ++_uid;

function rand<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

function makeCell(types: ContentItem[], avoid?: { left?: ContentItem | null; left2?: ContentItem | null; up?: ContentItem | null; up2?: ContentItem | null }): Cell {
  let it: ContentItem;
  let tries = 0;
  do {
    it = rand(types);
    tries++;
  } while (
    tries < 20 && (
      (avoid?.left && avoid.left2 && avoid.left.id === it.id && avoid.left2.id === it.id) ||
      (avoid?.up && avoid.up2 && avoid.up.id === it.id && avoid.up2.id === it.id)
    )
  );
  return { id: nid(), item: it };
}

function buildGrid(types: ContentItem[]): Cell[][] {
  const g: Cell[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push(makeCell(types, {
        left: c >= 1 ? row[c - 1].item : null,
        left2: c >= 2 ? row[c - 2].item : null,
        up: r >= 1 ? g[r - 1][c].item : null,
        up2: r >= 2 ? g[r - 2][c].item : null,
      }));
    }
    g.push(row);
  }
  return g;
}

// Returns cells (r,c) that are part of any 3+ in a row/col
function findMatches(g: Cell[][]): { r: number; c: number; item: ContentItem }[] {
  const matched = new Set<string>();
  const matchInfo: Record<string, ContentItem> = {};
  // horizontal
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const same = c < COLS && g[r][c].item && g[r][c - 1].item && g[r][c].item!.id === g[r][c - 1].item!.id;
      if (same) run++;
      else {
        if (run >= 3) {
          for (let k = c - run; k < c; k++) {
            const key = `${r},${k}`;
            matched.add(key);
            matchInfo[key] = g[r][k].item!;
          }
        }
        run = 1;
      }
    }
  }
  // vertical
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const same = r < ROWS && g[r][c].item && g[r - 1][c].item && g[r][c].item!.id === g[r - 1][c].item!.id;
      if (same) run++;
      else {
        if (run >= 3) {
          for (let k = r - run; k < r; k++) {
            const key = `${k},${c}`;
            matched.add(key);
            matchInfo[key] = g[k][c].item!;
          }
        }
        run = 1;
      }
    }
  }
  return [...matched].map((k) => {
    const [r, c] = k.split(",").map(Number);
    return { r, c, item: matchInfo[k] };
  });
}

function applyGravity(g: Cell[][], types: ContentItem[]): Cell[][] {
  const next = g.map((row) => row.map((cell) => ({ ...cell })));
  for (let c = 0; c < COLS; c++) {
    // collect non-null bottom-up
    const stack: Cell[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (next[r][c].item) stack.push(next[r][c]);
    }
    for (let r = ROWS - 1; r >= 0; r--) {
      if (stack.length) next[r][c] = stack.shift()!;
      else next[r][c] = { id: nid(), item: rand(types) };
    }
  }
  return next;
}

const Match3Game = () => {
  const [types, setTypes] = useState<ContentItem[]>(() => pickN(gamePool(), TYPES_COUNT));
  const [grid, setGrid] = useState<Cell[][]>(() => buildGrid(types));
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = () => {
      const t = pickN(gamePool(), TYPES_COUNT);
      setTypes(t); setGrid(buildGrid(t)); setScore(0); setSelected(null);
    };
    window.addEventListener("games-lang-change", h);
    return () => window.removeEventListener("games-lang-change", h);
  }, []);

  // resolve matches cascade
  const resolve = async (start: Cell[][]) => {
    let cur = start;
    let safety = 0;
    while (safety++ < 12) {
      const matches = findMatches(cur);
      if (!matches.length) break;
      // speak first matched item
      const spoken = new Set<string>();
      matches.forEach((m) => { if (!spoken.has(m.item.id)) { spoken.add(m.item.id); playItem(m.item); } });
      setScore((s) => s + matches.length);
      // null out matched
      cur = cur.map((row, r) => row.map((cell, c) => (
        matches.some((m) => m.r === r && m.c === c) ? { id: cell.id, item: null } : cell
      )));
      setGrid(cur);
      await new Promise((res) => setTimeout(res, 350));
      cur = applyGravity(cur, types);
      setGrid(cur);
      await new Promise((res) => setTimeout(res, 250));
    }
  };

  const tap = async (r: number, c: number) => {
    if (busy) return;
    if (!selected) { setSelected({ r, c }); return; }
    if (selected.r === r && selected.c === c) { setSelected(null); return; }
    const dr = Math.abs(selected.r - r), dc = Math.abs(selected.c - c);
    if (dr + dc !== 1) { setSelected({ r, c }); return; }
    const sel = selected;
    setBusy(true);
    setSelected(null);
    const swapped = grid.map((row) => row.slice());
    const a = swapped[sel.r][sel.c];
    swapped[sel.r][sel.c] = swapped[r][c];
    swapped[r][c] = a;
    setGrid(swapped);
    await new Promise((res) => setTimeout(res, 200));
    const matches = findMatches(swapped);
    if (!matches.length) {
      await playFeedback(false);
      // swap back
      const back = swapped.map((row) => row.slice());
      const tmp = back[sel.r][sel.c];
      back[sel.r][sel.c] = back[r][c];
      back[r][c] = tmp;
      setGrid(back);
      setBusy(false);
      return;
    }
    await resolve(swapped);
    setBusy(false);
  };

  const reset = () => {
    const t = pickN(gamePool(), TYPES_COUNT);
    setTypes(t); setGrid(buildGrid(t)); setScore(0); setSelected(null); setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-topic-pink/20 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="🍬 Üçlü Eşleştir" backTo="/oyunlar" centered onReset={reset} />

        <div className="flex justify-center mb-3">
          <LangToggle />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-primary/30">
            <div className="text-[10px] font-bold text-muted-foreground">Eşleşme</div>
            <div className="text-xl font-extrabold text-primary">{score}</div>
          </div>
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-warning/30 flex items-center justify-center gap-1">
            {types.map((t) => <span key={t.id} className="text-2xl">{t.emoji}</span>)}
          </div>
        </div>

        <p className="text-center text-sm font-bold text-muted-foreground mb-2">
          Komşu kutuları yer değiştir — 3'lü dizilim patlasın!
        </p>

        <div className="rounded-3xl bg-gradient-to-br from-topic-pink/30 to-warning/20 border-8 border-topic-pink/60 shadow-card p-2">
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          >
            {grid.map((row, r) => row.map((cell, c) => {
              const isSel = selected?.r === r && selected?.c === c;
              return (
                <button
                  key={cell.id}
                  onClick={() => tap(r, c)}
                  disabled={busy || !cell.item}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-3xl shadow-soft border-2 transition-bouncy",
                    !cell.item ? "bg-transparent border-transparent" :
                      isSel ? "bg-primary/30 border-primary scale-110 animate-pop" :
                        "bg-card border-primary/20 active:scale-95"
                  )}
                >
                  {cell.item?.emoji}
                </button>
              );
            }))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Match3Game;
