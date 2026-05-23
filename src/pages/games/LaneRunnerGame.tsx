import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { playFeedback, playSpeech } from "@/lib/audio";
import { gamePool, pickN } from "./_shared";
import { pickNextLetter, recordSrsAnswer } from "@/data/srs";
import type { ContentItem } from "@/data/types";
import { cn } from "@/lib/utils";
import { Heart, Volume2, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * İki Yol Koşusu — Subway Surfers benzeri 2.5D (CSS perspective).
 * Sesli soru: "Hangisi ___?" — doğru olanı topla, yanlıştan kaç.
 */
const LANES = [0, 1] as const; // sol, sağ
const SPEED = 1.6;             // z artış hızı
const SPAWN_EVERY = 28;        // tick
const TICK_MS = 33;
const SRS_TOPIC = "lane-runner";

interface Obj {
  uid: number;
  lane: 0 | 1;
  z: number;       // 0 = uzak, 100 = ön
  item: ContentItem;
  isTarget: boolean;
}

let UID = 1;

const LaneRunnerGame = () => {
  const [lane, setLane] = useState<0 | 1>(0);
  const [objs, setObjs] = useState<Obj[]>([]);
  const [target, setTarget] = useState<ContentItem | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(true);

  const laneRef = useRef<0 | 1>(0); laneRef.current = lane;
  const targetRef = useRef<ContentItem | null>(null); targetRef.current = target;
  const pausedRef = useRef(true); pausedRef.current = paused;
  const tickRef = useRef(0);

  const pickTarget = useCallback((silent = false) => {
    const pool = gamePool();
    if (pool.length === 0) return;
    const id = pickNextLetter("games", SRS_TOPIC, pool.map((p) => p.id));
    const item = pool.find((p) => p.id === id) || pool[0];
    setTarget(item);
    if (!silent && !pausedRef.current) {
      setTimeout(() => playSpeech(`Hangisi ${item.speech}?`, item.lang), 50);
    }
  }, []);

  useEffect(() => { pickTarget(true); }, [pickTarget]);

  const switchLane = useCallback((dir: -1 | 1) => {
    if (gameOver) return;
    if (paused) {
      setPaused(false);
      if (target) setTimeout(() => playSpeech(`Hangisi ${target.speech}?`, target.lang), 100);
    }
    setLane((l) => {
      const n = l + dir;
      if (n < 0 || n > 1) return l;
      return n as 0 | 1;
    });
  }, [gameOver, paused, target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft") { e.preventDefault(); switchLane(-1); }
      if (e.code === "ArrowRight") { e.preventDefault(); switchLane(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [switchLane]);

  useEffect(() => {
    if (gameOver || paused) return;
    const id = setInterval(() => {
      tickRef.current += 1;

      // Spawn
      if (tickRef.current % SPAWN_EVERY === 0 && targetRef.current) {
        setObjs((prev) => {
          const pool = gamePool();
          const useTarget = Math.random() < 0.5;
          let item: ContentItem;
          if (useTarget) item = targetRef.current!;
          else {
            const wrongs = pickN(pool.filter((p) => p.id !== targetRef.current!.id), 1);
            item = wrongs[0] || targetRef.current!;
          }
          const newLane = (Math.random() < 0.5 ? 0 : 1) as 0 | 1;
          // Aynı yolda yakın obje varsa atla
          if (prev.some((o) => o.lane === newLane && o.z < 25)) return prev;
          return [...prev, {
            uid: UID++, lane: newLane, z: 0, item,
            isTarget: item.id === targetRef.current!.id,
          }];
        });
      }

      // Hareket + çarpışma
      setObjs((prev) => {
        const curTarget = targetRef.current?.id;
        const next: Obj[] = [];
        let hitTarget: Obj | null = null;
        let hitWrong: Obj | null = null;
        let missedTarget = false;
        for (const o of prev) {
          const nz = o.z + SPEED;
          if (nz >= 100) {
            // ön plana ulaştı
            if (o.lane === laneRef.current) {
              if (o.item.id === curTarget) hitTarget = o;
              else hitWrong = o;
            } else {
              if (o.item.id === curTarget) missedTarget = true;
            }
            continue;
          }
          next.push({ ...o, z: nz, isTarget: o.item.id === curTarget });
        }

        if (hitTarget) {
          recordSrsAnswer("games", SRS_TOPIC, hitTarget.item.id, true);
          playSpeech(hitTarget.item.speech, hitTarget.item.lang);
          setScore((s) => s + 1);
          setTimeout(pickTarget, 400);
        }
        if (hitWrong) {
          recordSrsAnswer("games", SRS_TOPIC, targetRef.current!.id, false);
          playFeedback(false);
          setLives((l) => { const nl = l - 1; if (nl <= 0) setGameOver(true); return nl; });
        }
        if (missedTarget && !hitTarget) {
          recordSrsAnswer("games", SRS_TOPIC, targetRef.current!.id, false);
          setLives((l) => { const nl = l - 1; if (nl <= 0) setGameOver(true); return nl; });
          setTimeout(pickTarget, 400);
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameOver, paused, pickTarget]);

  const reset = () => {
    setLane(0); setObjs([]); setScore(0);
    setLives(3); setGameOver(false); setPaused(true);
    UID = 1; tickRef.current = 0;
    setTimeout(() => pickTarget(true), 0);
  };

  // z → ekran konumu (perspektif)
  const zToTop = (z: number) => 20 + (z / 100) * 65;      // %
  const zToScale = (z: number) => 0.25 + (z / 100) * 1.1;
  const laneX = (l: 0 | 1) => (l === 0 ? 30 : 70);         // %

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-200/40 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="🛤️ İki Yol Koşusu" backTo="/oyunlar" centered onReset={reset} />

        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-success/30">
            <div className="text-[10px] font-bold text-muted-foreground">Puan</div>
            <div className="text-xl font-extrabold text-success">{score}</div>
          </div>
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-destructive/30 flex flex-col items-center">
            <div className="text-[10px] font-bold text-muted-foreground">Can</div>
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart key={i} className={cn("h-4 w-4", i < lives ? "fill-destructive text-destructive" : "text-muted")} />
              ))}
            </div>
          </div>
          <button
            onClick={() => target && playSpeech(`Hangisi ${target.speech}?`, target.lang)}
            disabled={!target}
            className="rounded-xl bg-primary text-primary-foreground p-2 shadow-soft border-2 border-primary font-bold flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <Volume2 className="h-4 w-4" /> Dinle
          </button>
        </div>

        <div className="rounded-2xl p-3 mb-3 border-2 bg-warning/15 border-warning/50 text-center min-h-[64px]">
          <p className="text-xs font-bold text-muted-foreground">🎯 Doğru yola geç, yanlışı kaçır!</p>
          <p className="text-3xl mt-1">{target?.emoji ?? "—"}</p>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-2xl shadow-card border-4 border-indigo-400/50 bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-200 select-none touch-none"
          style={{ aspectRatio: "5 / 6", maxHeight: "60vh", margin: "0 auto", perspective: "600px" }}
        >
          {/* Yol — trapez şekil */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <polygon points="38,20 62,20 95,95 5,95" fill="hsl(var(--muted))" opacity="0.85" />
            <line x1="50" y1="20" x2="50" y2="95" stroke="white" strokeWidth="0.4" strokeDasharray="3 2" opacity="0.8" />
            <polygon points="38,20 62,20 95,95 5,95" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          </svg>

          {/* Nesneler */}
          {objs.map((o) => {
            const s = zToScale(o.z);
            return (
              <div
                key={o.uid}
                className={cn(
                  "absolute leading-none rounded-full",
                  o.isTarget && "ring-4 ring-warning/70",
                )}
                style={{
                  left: `${laneX(o.lane)}%`,
                  top: `${zToTop(o.z)}%`,
                  transform: `translate(-50%, -50%) scale(${s})`,
                  fontSize: "44px",
                  zIndex: Math.floor(o.z),
                }}
              >
                {o.item.emoji}
              </div>
            );
          })}

          {/* Karakter — önde */}
          <div
            className="absolute text-6xl leading-none transition-all duration-150"
            style={{
              left: `${laneX(lane)}%`,
              top: "88%",
              transform: "translate(-50%, -100%)",
              zIndex: 200,
            }}
          >
            🏃
          </div>

          {paused && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-[300]">
              <div className="text-5xl mb-2">🛤️</div>
              <div className="text-xl font-extrabold text-info mb-1">Hazır?</div>
              <div className="text-sm font-bold text-muted-foreground">Başlamak için ◀ ▶ tuşla</div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 z-[300]">
              <div className="text-4xl mb-2">😢</div>
              <div className="text-2xl font-extrabold text-destructive mb-2">Oyun Bitti</div>
              <div className="text-sm font-bold text-muted-foreground mb-4">Puan: {score}</div>
              <button onClick={reset} className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-extrabold shadow-soft">
                Tekrar Oyna
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => switchLane(-1)} className="rounded-2xl bg-primary text-primary-foreground py-5 font-extrabold shadow-soft active:scale-95 flex items-center justify-center gap-1">
            <ChevronLeft className="h-7 w-7" /> Sol
          </button>
          <button onClick={() => switchLane(1)} className="rounded-2xl bg-primary text-primary-foreground py-5 font-extrabold shadow-soft active:scale-95 flex items-center justify-center gap-1">
            Sağ <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default LaneRunnerGame;
