import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { playItem, playFeedback } from "@/lib/audio";
import { gamePool, shuffle } from "./_shared";
import { useAge } from "@/lib/age";
import type { ContentItem } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * Yapboz oyunu — yaşa göre NxN parçalı emoji/resim yapbozu.
 * Tap-to-swap mekanik: oyuncu önce bir parçaya, sonra diğerine dokunur, takas olur.
 * Bittiğinde nesnenin sesi söylenir.
 */
function gridForAge(age: number): number {
  if (age <= 4) return 2; // 4 parça
  if (age === 5) return 3; // 9 parça
  return 4; // 16 parça
}

const PuzzleGame = () => {
  const [age] = useAge();
  const N = gridForAge(age);

  const pool = useMemo(
    () => gamePool().filter((p) => p.emoji && [...p.emoji].length <= 2),
    [],
  );
  const [item, setItem] = useState<ContentItem | null>(null);
  const [tiles, setTiles] = useState<number[]>([]); // value = original index
  const [first, setFirst] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);

  const sizeRef = useRef<HTMLDivElement>(null);

  const startNew = () => {
    if (pool.length === 0) return;
    const it = pool[Math.floor(Math.random() * pool.length)];
    setItem(it);
    const total = N * N;
    let arr = Array.from({ length: total }, (_, i) => i);
    // İyi karıştır — zaten çözülmüş olmasın
    do { arr = shuffle(arr); } while (arr.every((v, i) => v === i));
    setTiles(arr);
    setFirst(null);
    setSolved(false);
  };

  useEffect(() => { startNew(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [N]);

  const tap = (i: number) => {
    if (solved) return;
    if (first === null) { setFirst(i); return; }
    if (first === i) { setFirst(null); return; }
    setTiles((prev) => {
      const next = [...prev];
      [next[first], next[i]] = [next[i], next[first]];
      // Çözüm kontrolü
      if (next.every((v, idx) => v === idx)) {
        setSolved(true);
        setScore((s) => s + 1);
        if (item) {
          setTimeout(() => playItem(item), 200);
          setTimeout(() => playFeedback(true), 1400);
        }
      }
      return next;
    });
    setFirst(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-warning/15 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="🧩 Yapboz" backTo="/oyunlar" centered onReset={startNew} />

        <div className="mb-3 flex items-center justify-between text-sm font-bold">
          <span>⭐ {score}</span>
          <span className="text-muted-foreground">{N}×{N}</span>
        </div>

        <div
          ref={sizeRef}
          className="relative mx-auto aspect-square w-full max-w-sm rounded-3xl bg-card border-4 border-warning/40 shadow-card p-2 overflow-hidden"
        >
          <div
            className="grid gap-1 h-full w-full"
            style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
          >
            {tiles.map((val, idx) => {
              const row = Math.floor(val / N);
              const col = val % N;
              const correct = val === idx;
              return (
                <button
                  key={idx}
                  onClick={() => tap(idx)}
                  className={cn(
                    "relative overflow-hidden rounded-lg border-2 transition-bouncy",
                    first === idx
                      ? "border-primary scale-95 ring-4 ring-primary/40"
                      : solved && correct
                      ? "border-success"
                      : "border-border/40",
                    "bg-gradient-to-br from-card to-muted/50",
                  )}
                  aria-label={`Parça ${idx + 1}`}
                >
                  {item?.emoji && (
                    <span
                      aria-hidden
                      className="absolute leading-none select-none"
                      style={{
                        fontSize: `${N * 100}%`,
                        // Konteyner = tile boyutu; emojiyi N× büyüt ve doğru parçayı göster
                        top: `-${row * 100}%`,
                        left: `-${col * 100}%`,
                        width: `${N * 100}%`,
                        height: `${N * 100}%`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.emoji}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {solved && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-success/85 backdrop-blur-sm animate-bounce-in">
              <div className="text-7xl mb-2">{item?.emoji}</div>
              <div className="text-3xl font-extrabold text-white text-shadow-soft mb-4">
                🎉 Aferin!
              </div>
              <button
                onClick={startNew}
                className="rounded-full bg-white text-success px-6 py-3 font-extrabold shadow-soft active:scale-95"
              >
                Yeni Yapboz
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-sm font-bold text-muted-foreground">
          İki parçaya dokun → yerleri değişir
        </p>
      </main>
    </div>
  );
};

export default PuzzleGame;
