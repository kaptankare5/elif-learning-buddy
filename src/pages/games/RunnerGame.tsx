import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { playFeedback, playSpeech } from "@/lib/audio";
import { gamePool, pickN } from "./_shared";
import { pickNextLetter, recordSrsAnswer } from "@/data/srs";
import type { ContentItem } from "@/data/types";
import { cn } from "@/lib/utils";
import { Heart, Volume2 } from "lucide-react";

/**
 * 🏃 Koşan Çocuk — geliştirilmiş 2D yan-kaydırma.
 * - Parallax katmanlar: gökyüzü → dağlar → tepeler → ağaçlar → yer
 * - Karakter sabit X, sabit hızda koşar (hafif salınım + zıplama eğimi + gölge)
 * - Sesli soru: "Hangisi ___?" → doğru emojiye yerden değ, yanlıştan zıpla
 */
const GROUND_Y = 78;
const CHAR_X = 18;
const CHAR_W = 12;
const BASE_SPEED = 0.55;
const GRAVITY = 0.32;
const JUMP_V = -4.8;
const TICK_MS = 33;
const SPAWN_EVERY = 90;
const MAX_OBJS = 5;
const SRS_TOPIC = "runner-game";

interface Obj {
  uid: number;
  x: number;
  item: ContentItem;
  isTarget: boolean;
  collected?: boolean;
}
interface Pop { id: number; x: number; y: number; text: string; good: boolean }

let UID = 1;
let POP_UID = 1;

const RunnerGame = () => {
  const [y, setY] = useState(0);
  const [vel, setVel] = useState(0);
  const [objs, setObjs] = useState<Obj[]>([]);
  const [target, setTarget] = useState<ContentItem | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(true);
  const [pops, setPops] = useState<Pop[]>([]);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);

  const yRef = useRef(0); yRef.current = y;
  const velRef = useRef(0); velRef.current = vel;
  const targetRef = useRef<ContentItem | null>(null); targetRef.current = target;
  const pausedRef = useRef(true); pausedRef.current = paused;
  const scoreRef = useRef(0); scoreRef.current = score;
  const tickRef = useRef(0);

  const speed = BASE_SPEED + Math.min(0.35, scoreRef.current * 0.015);

  const pickTarget = useCallback((silent = false) => {
    const pool = gamePool();
    if (pool.length === 0) return;
    const id = pickNextLetter("games", SRS_TOPIC, pool.map((p) => p.id));
    const item = pool.find((p) => p.id === id) || pool[0];
    setTarget(item);
    if (!silent && !pausedRef.current) {
      setTimeout(() => playSpeech(`Hangisi ${item.speech}?`, item.lang), 80);
    }
  }, []);

  useEffect(() => { pickTarget(true); }, [pickTarget]);

  const jump = useCallback(() => {
    if (gameOver) return;
    if (paused) {
      setPaused(false);
      if (target) setTimeout(() => playSpeech(`Hangisi ${target.speech}?`, target.lang), 120);
      return;
    }
    if (yRef.current >= -1) setVel(JUMP_V);
  }, [gameOver, paused, target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  const addPop = (x: number, y: number, text: string, good: boolean) => {
    const p: Pop = { id: POP_UID++, x, y, text, good };
    setPops((prev) => [...prev, p]);
    setTimeout(() => setPops((prev) => prev.filter((q) => q.id !== p.id)), 900);
  };

  const flashFx = (k: "good" | "bad") => {
    setFlash(k); setTimeout(() => setFlash(null), 220);
  };

  // Ana döngü
  useEffect(() => {
    if (gameOver || paused) return;
    const id = setInterval(() => {
      tickRef.current += 1;

      // Karakter fizik
      let ny = yRef.current + velRef.current;
      let nv = velRef.current + GRAVITY;
      if (ny >= 0) { ny = 0; nv = 0; }
      setY(ny); setVel(nv);

      // Spawn
      const spawnEvery = Math.max(55, SPAWN_EVERY - scoreRef.current * 1.2);
      if (tickRef.current % Math.floor(spawnEvery) === 0 && targetRef.current) {
        setObjs((prev) => {
          if (prev.length >= MAX_OBJS) return prev;
          if (prev.some((o) => o.x > 100 - 22)) return prev;
          const pool = gamePool();
          const useTarget = Math.random() < 0.5;
          let item: ContentItem;
          if (useTarget) item = targetRef.current!;
          else {
            const wrongs = pickN(pool.filter((p) => p.id !== targetRef.current!.id), 1);
            item = wrongs[0] || targetRef.current!;
          }
          return [...prev, { uid: UID++, x: 110, item, isTarget: item.id === targetRef.current!.id }];
        });
      }

      // Hareket + çarpışma
      setObjs((prev) => {
        const curTarget = targetRef.current?.id;
        const next: Obj[] = [];
        let missedTarget = false;
        let collidedWrong: Obj | null = null;
        let collidedTarget: Obj | null = null;
        const charJumping = yRef.current < -8;
        for (const o of prev) {
          if (o.collected) continue;
          const nx = o.x - speed;
          if (nx < -8) {
            if (o.item.id === curTarget) missedTarget = true;
            continue;
          }
          const inX = Math.abs(nx - CHAR_X) < CHAR_W / 2 + 5;
          if (inX && !charJumping) {
            if (o.item.id === curTarget) collidedTarget = { ...o, x: nx };
            else collidedWrong = { ...o, x: nx };
            continue;
          }
          next.push({ ...o, x: nx, isTarget: o.item.id === curTarget });
        }

        if (collidedTarget) {
          recordSrsAnswer("games", SRS_TOPIC, collidedTarget.item.id, true);
          playSpeech(collidedTarget.item.speech, collidedTarget.item.lang);
          setScore((s) => s + 1);
          setCombo((c) => c + 1);
          addPop(CHAR_X, GROUND_Y - 5, "+1", true);
          flashFx("good");
          setTimeout(pickTarget, 350);
        }
        if (collidedWrong) {
          recordSrsAnswer("games", SRS_TOPIC, targetRef.current!.id, false);
          playFeedback(false);
          setCombo(0);
          addPop(CHAR_X, GROUND_Y - 5, "✗", false);
          flashFx("bad");
          setLives((l) => { const nl = l - 1; if (nl <= 0) setGameOver(true); return nl; });
        }
        if (missedTarget && !collidedTarget) {
          recordSrsAnswer("games", SRS_TOPIC, targetRef.current!.id, false);
          setCombo(0);
          setLives((l) => { const nl = l - 1; if (nl <= 0) setGameOver(true); return nl; });
          setTimeout(pickTarget, 350);
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameOver, paused, pickTarget, speed]);

  const reset = () => {
    setY(0); setVel(0); setObjs([]); setScore(0); setCombo(0);
    setLives(3); setGameOver(false); setPaused(true); setPops([]);
    UID = 1; POP_UID = 1; tickRef.current = 0;
    setTimeout(() => pickTarget(true), 0);
  };

  const charJumping = y < -3;
  const charTilt = Math.max(-20, Math.min(20, vel * 4));

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200/40 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="🏃 Koşan Çocuk" backTo="/oyunlar" centered onReset={reset} />

        <div className="mb-3 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-success/30">
            <div className="text-[10px] font-bold text-muted-foreground">Puan</div>
            <div className="text-xl font-extrabold text-success">{score}</div>
          </div>
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-warning/40">
            <div className="text-[10px] font-bold text-muted-foreground">Seri</div>
            <div className="text-xl font-extrabold text-warning">x{combo}</div>
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
            <Volume2 className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl p-3 mb-3 border-2 bg-warning/15 border-warning/50 text-center min-h-[64px]">
          <p className="text-xs font-bold text-muted-foreground">🎯 Doğruya koş, yanlıştan zıpla!</p>
          <p className="text-3xl mt-1">{target?.emoji ?? "—"} <span className="text-base font-bold text-foreground/70">{target?.label ?? ""}</span></p>
        </div>

        <div
          onPointerDown={(e) => { e.preventDefault(); jump(); }}
          className="relative w-full overflow-hidden rounded-2xl shadow-card border-4 border-sky-400/60 select-none touch-none"
          style={{ aspectRatio: "5 / 4", maxHeight: "55vh", margin: "0 auto" }}
        >
          {/* Gökyüzü gradyan + güneş */}
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(200_85%_75%)] via-[hsl(195_90%_85%)] to-[hsl(85_60%_75%)]" />
          <div className="absolute top-[8%] right-[10%] w-16 h-16 rounded-full bg-yellow-200 shadow-[0_0_40px_rgba(255,230,100,0.8)]" />

          {/* Bulutlar — parallax (yavaş) */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[10%] left-0 w-[200%] animate-cloud flex gap-[40%] text-4xl opacity-90">
              <span>☁️</span><span>☁️</span><span>☁️</span><span>☁️</span>
            </div>
            <div className="absolute top-[22%] left-0 w-[200%] animate-cloud text-2xl opacity-70" style={{ animationDuration: "60s" }}>
              <span className="mr-[55%]">☁️</span><span className="mr-[55%]">☁️</span><span>☁️</span>
            </div>
          </div>

          {/* Uzak dağlar */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <polygon points="0,70 15,45 30,62 45,40 60,58 80,42 100,65 100,80 0,80"
              fill="hsl(220 25% 55%)" opacity="0.55" />
            <polygon points="0,75 12,55 25,70 40,52 55,68 70,55 85,72 100,60 100,82 0,82"
              fill="hsl(220 30% 50%)" opacity="0.7" />
            {/* Tepeler */}
            <ellipse cx="20" cy="80" rx="35" ry="10" fill="hsl(120 50% 55%)" opacity="0.9" />
            <ellipse cx="75" cy="80" rx="40" ry="10" fill="hsl(120 55% 50%)" opacity="0.9" />
          </svg>

          {/* Ağaçlar parallax — orta katman */}
          <div className="absolute left-0 right-0 overflow-hidden" style={{ top: `${GROUND_Y - 6}%`, height: "8%" }}>
            <div
              className="absolute inset-y-0 w-[300%] flex items-end text-2xl"
              style={{
                animation: `ground-scroll 4s linear infinite`,
                backgroundSize: "120px 100%",
              }}
            >
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} style={{ marginRight: "60px" }}>{i % 2 ? "🌳" : "🌲"}</span>
              ))}
            </div>
          </div>

          {/* Yer — dokulu çim, kayar */}
          <div
            className={cn("absolute left-0 right-0 border-t-4 border-green-700", paused ? "" : "animate-ground")}
            style={{
              top: `${GROUND_Y + 5}%`,
              bottom: 0,
              backgroundImage: `
                linear-gradient(to bottom, hsl(120 60% 45%), hsl(120 65% 35%)),
                repeating-linear-gradient(90deg, transparent 0 30px, hsl(120 60% 30% / 0.4) 30px 32px),
                repeating-linear-gradient(45deg, hsl(120 65% 38%) 0 8px, hsl(120 60% 42%) 8px 16px)
              `,
              backgroundBlendMode: "normal, overlay, overlay",
              backgroundSize: "100% 100%, 80px 100%, 24px 24px",
            }}
          />
          {/* Yer dokusu — çakıllar */}
          <div
            className={cn("absolute left-0 right-0 opacity-60", paused ? "" : "animate-ground-fast")}
            style={{
              top: `${GROUND_Y + 5}%`,
              height: "4%",
              backgroundImage: "radial-gradient(circle, hsl(30 40% 25%) 1.5px, transparent 2px)",
              backgroundSize: "20px 100%",
            }}
          />

          {/* Hız çizgileri */}
          {!paused && !gameOver && combo >= 3 && (
            <div className="absolute inset-0 pointer-events-none">
              {[20, 35, 55].map((t, i) => (
                <div key={i} className="absolute h-0.5 bg-white/70 rounded-full animate-speed-line"
                  style={{ top: `${t}%`, width: "30%", left: "60%", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}

          {/* Karakter gölgesi */}
          <div
            className="absolute rounded-full bg-black/30 blur-sm"
            style={{
              left: `${CHAR_X}%`,
              top: `${GROUND_Y + 3}%`,
              width: `${charJumping ? 7 : 10}%`,
              height: "2.5%",
              transform: "translate(-50%, 0)",
              opacity: charJumping ? 0.25 : 0.5,
              transition: "opacity 0.1s, width 0.1s",
            }}
          />

          {/* Karakter */}
          <div
            className={cn("absolute text-6xl leading-none", !paused && !charJumping && "animate-run-bob")}
            style={{
              left: `${CHAR_X}%`,
              top: `${GROUND_Y + y}%`,
              transform: charJumping
                ? `translate(-50%, -100%) rotate(${charTilt}deg) scale(${vel < 0 ? 1.08 : 0.95}, ${vel < 0 ? 0.92 : 1.05})`
                : undefined,
              transformOrigin: "center bottom",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))",
              transition: "none",
            }}
          >
            🏃
          </div>

          {/* Nesneler */}
          {objs.map((o) => (
            <div key={o.uid} className="absolute" style={{ left: `${o.x}%`, top: `${GROUND_Y}%`, transform: "translate(-50%, -100%)" }}>
              {/* gölge */}
              <div className="absolute left-1/2 top-full -translate-x-1/2 w-8 h-1.5 rounded-full bg-black/30 blur-[2px]" />
              {/* halka — sadece target */}
              {o.isTarget && (
                <div className="absolute -inset-2 rounded-full border-4 border-warning/80 animate-pulse" />
              )}
              <div className={cn("text-5xl leading-none", o.isTarget && "animate-float")}>
                {o.item.emoji}
              </div>
            </div>
          ))}

          {/* Skor pop'ları */}
          {pops.map((p) => (
            <div key={p.id}
              className={cn("absolute text-2xl font-extrabold pointer-events-none animate-bounce-in",
                p.good ? "text-success" : "text-destructive")}
              style={{
                left: `${p.x}%`, top: `${p.y}%`,
                transform: "translate(-50%, -100%)",
                textShadow: "0 2px 4px rgba(0,0,0,0.4)",
              }}>
              {p.text}
            </div>
          ))}

          {/* Flash overlay */}
          {flash && (
            <div className={cn("absolute inset-0 pointer-events-none animate-fade-in",
              flash === "good" ? "bg-success/20" : "bg-destructive/30")} />
          )}

          {paused && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm">
              <div className="text-6xl mb-3 animate-bounce">🏃</div>
              <div className="text-2xl font-extrabold text-info mb-1">Hazır?</div>
              <div className="text-sm font-bold text-muted-foreground mb-4">Zıplamak için dokun / Space</div>
              <button onClick={jump} className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-extrabold shadow-elegant animate-pulse">
                ▶ Başla
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
              <div className="text-5xl mb-2">🏁</div>
              <div className="text-2xl font-extrabold text-destructive mb-1">Oyun Bitti</div>
              <div className="text-sm font-bold text-muted-foreground mb-4">Puan: {score}</div>
              <button onClick={reset} className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-extrabold shadow-elegant">
                🔁 Tekrar Oyna
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={jump} className="rounded-2xl bg-primary text-primary-foreground py-5 font-extrabold shadow-soft active:scale-95 text-xl">
            🚀 ZIPLA
          </button>
          <button onClick={() => setPaused((p) => !p)} className="rounded-2xl bg-muted py-5 font-extrabold shadow-soft active:scale-95 text-xl">
            {paused ? "▶" : "⏸"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default RunnerGame;
