import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { playFeedback, playSpeech } from "@/lib/audio";
import { gamePool, pickN } from "./_shared";
import { pickNextLetter, recordSrsAnswer } from "@/data/srs";
import type { ContentItem } from "@/data/types";
import { cn } from "@/lib/utils";
import { Heart, Volume2, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * 🚀 Uzay Savaşı — Space Invaders tarzı eğitici nişancı.
 * - Alt: uzay gemisi, sağa/sola hareket eder, boşluk ile ateş.
 * - Üst: emoji "düşmanlar" aşağı iner.
 * - Ses ile hedef söylenir ("Vur: polis 👮"). Doğru hedefi vur → +puan,
 *   yanlışı vur → can azalır. Hedef yere ulaşırsa can azalır.
 */
const TICK_MS = 32;
const SHIP_W = 12; // %
const ENEMY_SIZE = 10; // %
const ENEMY_FALL = 0.35; // %/tick
const BULLET_SPEED = 2.2; // %/tick
const SHIP_SPEED = 1.8; // %/tick
const SRS_TOPIC = "space-shooter";
const MAX_ENEMIES = 5;

interface Enemy { uid: number; x: number; y: number; item: ContentItem; isTarget: boolean }
interface Bullet { uid: number; x: number; y: number }
interface Pop { id: number; x: number; y: number; text: string; good: boolean }

let UID = 1;
let POP_UID = 1;

const RunnerGame = () => {
  const [shipX, setShipX] = useState(50);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [target, setTarget] = useState<ContentItem | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(true);
  const [pops, setPops] = useState<Pop[]>([]);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);

  const shipXRef = useRef(50); shipXRef.current = shipX;
  const targetRef = useRef<ContentItem | null>(null); targetRef.current = target;
  const pausedRef = useRef(true); pausedRef.current = paused;
  const enemiesRef = useRef<Enemy[]>([]); enemiesRef.current = enemies;
  const tickRef = useRef(0);
  const moveDirRef = useRef<-1 | 0 | 1>(0);
  const lastShotRef = useRef(0);

  const pickTarget = useCallback(() => {
    const pool = gamePool();
    if (pool.length === 0) return null;
    const id = pickNextLetter("games", SRS_TOPIC, pool.map((p) => p.id));
    const item = pool.find((p) => p.id === id) || pool[0];
    setTarget(item);
    return item;
  }, []);

  const announce = useCallback((item: ContentItem) => {
    setTimeout(() => playSpeech(`Vur: ${item.speech}`, item.lang), 100);
  }, []);

  const nextRound = useCallback(() => {
    const item = pickTarget();
    if (!item) return;
    if (!pausedRef.current) announce(item);
  }, [pickTarget, announce]);

  const addPop = (x: number, y: number, text: string, good: boolean) => {
    const p: Pop = { id: POP_UID++, x, y, text, good };
    setPops((prev) => [...prev, p]);
    setTimeout(() => setPops((prev) => prev.filter((q) => q.id !== p.id)), 800);
  };
  const flashFx = (k: "good" | "bad") => { setFlash(k); setTimeout(() => setFlash(null), 200); };

  const fire = useCallback(() => {
    if (gameOver) return;
    if (pausedRef.current) { setPaused(false); nextRound(); return; }
    const now = Date.now();
    if (now - lastShotRef.current < 220) return;
    lastShotRef.current = now;
    setBullets((b) => [...b, { uid: UID++, x: shipXRef.current, y: 88 }]);
  }, [gameOver, nextRound]);

  const startMove = (dir: -1 | 1) => { moveDirRef.current = dir; if (pausedRef.current) { setPaused(false); nextRound(); } };
  const stopMove = () => { moveDirRef.current = 0; };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); fire(); }
      if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); moveDirRef.current = -1; if (pausedRef.current) { setPaused(false); nextRound(); } }
      if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); moveDirRef.current = 1; if (pausedRef.current) { setPaused(false); nextRound(); } }
    };
    const up = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) moveDirRef.current = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [fire, nextRound]);

  // Ana döngü
  useEffect(() => {
    if (gameOver || paused) return;
    const id = setInterval(() => {
      tickRef.current += 1;

      // Gemi hareketi
      if (moveDirRef.current !== 0) {
        setShipX((x) => Math.max(SHIP_W / 2, Math.min(100 - SHIP_W / 2, x + moveDirRef.current * SHIP_SPEED)));
      }

      // Düşman üret
      const spawnEvery = Math.max(35, 70 - Math.floor(score * 0.5));
      if (tickRef.current % spawnEvery === 0 && enemiesRef.current.length < MAX_ENEMIES) {
        const pool = gamePool();
        const t = targetRef.current;
        if (t && pool.length > 1) {
          // ~%40 olasılıkla hedefi koy (eğer zaten yoksa)
          const hasTarget = enemiesRef.current.some((e) => e.isTarget);
          const putTarget = !hasTarget && Math.random() < 0.55;
          const item = putTarget ? t : pickN(pool.filter((p) => p.id !== t.id), 1)[0] || t;
          setEnemies((arr) => [...arr, {
            uid: UID++,
            x: 10 + Math.random() * 80,
            y: -5,
            item,
            isTarget: item.id === t.id,
          }]);
        }
      }

      // Düşmanları indir
      setEnemies((arr) => {
        let lostLife = false;
        const survivors: Enemy[] = [];
        for (const e of arr) {
          const ny = e.y + ENEMY_FALL;
          if (ny > 92) {
            if (e.isTarget) {
              lostLife = true;
              if (targetRef.current) recordSrsAnswer("games", SRS_TOPIC, targetRef.current.id, false);
            }
            continue;
          }
          survivors.push({ ...e, y: ny });
        }
        if (lostLife) {
          playFeedback(false);
          setCombo(0);
          flashFx("bad");
          setLives((l) => { const nl = l - 1; if (nl <= 0) setGameOver(true); return nl; });
          // yeni hedef seç
          setTimeout(nextRound, 250);
        }
        return survivors;
      });

      // Mermileri yukarı götür + çarpışma
      setBullets((bs) => {
        const movedBullets: Bullet[] = [];
        const removeEnemyUids = new Set<number>();
        let hitTarget = false;
        let hitWrong = false;
        const curEnemies = enemiesRef.current;
        for (const b of bs) {
          const ny = b.y - BULLET_SPEED;
          if (ny < -3) continue;
          let consumed = false;
          for (const e of curEnemies) {
            if (removeEnemyUids.has(e.uid)) continue;
            if (Math.abs(e.x - b.x) < ENEMY_SIZE / 2 + 2 && Math.abs(e.y - ny) < ENEMY_SIZE / 2 + 2) {
              removeEnemyUids.add(e.uid);
              if (e.isTarget) hitTarget = true; else hitWrong = true;
              addPop(e.x, e.y, e.isTarget ? "+3" : "✗", e.isTarget);
              consumed = true;
              break;
            }
          }
          if (!consumed) movedBullets.push({ ...b, y: ny });
        }

        if (removeEnemyUids.size > 0) {
          setEnemies((arr) => arr.filter((e) => !removeEnemyUids.has(e.uid)));
        }
        if (hitTarget && targetRef.current) {
          const t = targetRef.current;
          recordSrsAnswer("games", SRS_TOPIC, t.id, true);
          playSpeech(t.speech, t.lang);
          setScore((s) => s + 3);
          setCombo((c) => c + 1);
          flashFx("good");
          setTimeout(nextRound, 400);
        }
        if (hitWrong && !hitTarget) {
          if (targetRef.current) recordSrsAnswer("games", SRS_TOPIC, targetRef.current.id, false);
          playFeedback(false);
          setCombo(0);
          flashFx("bad");
          setLives((l) => { const nl = l - 1; if (nl <= 0) setGameOver(true); return nl; });
        }
        return movedBullets;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameOver, paused, score, nextRound]);

  const reset = () => {
    setShipX(50); setEnemies([]); setBullets([]); setTarget(null);
    setScore(0); setCombo(0); setLives(3); setGameOver(false); setPaused(true);
    setPops([]); UID = 1; POP_UID = 1; tickRef.current = 0; moveDirRef.current = 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="🚀 Uzay Savaşı" backTo="/oyunlar" centered onReset={reset} />

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
            onClick={() => target && playSpeech(`Vur: ${target.speech}`, target.lang)}
            disabled={!target}
            className="rounded-xl bg-primary text-primary-foreground p-2 shadow-soft border-2 border-primary font-bold flex items-center justify-center disabled:opacity-40"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl p-3 mb-3 border-2 border-warning bg-warning/20 text-center min-h-[64px]">
          {target ? (
            <>
              <p className="text-xs font-bold text-muted-foreground">🎯 Hedef</p>
              <p className="text-3xl mt-1">{target.emoji} <span className="text-base font-bold text-foreground/70">{target.label}</span></p>
            </>
          ) : (
            <p className="text-xs font-bold text-muted-foreground mt-3">Başlamak için ateş et veya yön tuşuna bas</p>
          )}
        </div>

        <div
          className="relative w-full overflow-hidden rounded-2xl shadow-card border-4 border-indigo-500/60 select-none touch-none"
          style={{ aspectRatio: "5 / 6", maxHeight: "60vh", margin: "0 auto",
            background: "radial-gradient(ellipse at top, hsl(250 60% 25%), hsl(240 70% 8%) 75%)" }}
        >
          {/* Yıldızlar */}
          <div className="absolute inset-0 pointer-events-none opacity-80"
            style={{ backgroundImage: `radial-gradient(white 1px, transparent 1px), radial-gradient(white 1px, transparent 1px)`,
              backgroundSize: `40px 40px, 60px 60px`, backgroundPosition: `0 0, 20px 30px` }} />

          {/* Düşmanlar */}
          {enemies.map((e) => (
            <div key={e.uid} className="absolute leading-none"
              style={{ left: `${e.x}%`, top: `${e.y}%`, transform: "translate(-50%, -50%)",
                fontSize: "40px", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}>
              {e.isTarget && (<div className="absolute -inset-2 rounded-full border-4 border-warning/70 animate-pulse" />)}
              <span className="animate-float">{e.item.emoji}</span>
            </div>
          ))}

          {/* Mermiler */}
          {bullets.map((b) => (
            <div key={b.uid} className="absolute rounded-full bg-yellow-300 shadow-[0_0_12px_rgba(255,230,80,0.9)]"
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: "8px", height: "16px",
                transform: "translate(-50%, -50%)" }} />
          ))}

          {/* Gemi */}
          <div className="absolute text-5xl leading-none"
            style={{ left: `${shipX}%`, top: "92%", transform: "translate(-50%, -100%)",
              filter: "drop-shadow(0 4px 10px rgba(0,200,255,0.6))", zIndex: 50 }}>
            🚀
          </div>

          {/* Pop'lar */}
          {pops.map((p) => (
            <div key={p.id}
              className={cn("absolute text-2xl font-extrabold pointer-events-none animate-bounce-in",
                p.good ? "text-success" : "text-destructive")}
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -100%)",
                textShadow: "0 2px 4px rgba(0,0,0,0.6)", zIndex: 100 }}>
              {p.text}
            </div>
          ))}

          {flash && (
            <div className={cn("absolute inset-0 pointer-events-none animate-fade-in",
              flash === "good" ? "bg-success/20" : "bg-destructive/30")} />
          )}

          {paused && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm">
              <div className="text-6xl mb-3 animate-bounce">🚀</div>
              <div className="text-2xl font-extrabold text-info mb-1">Hazır?</div>
              <div className="text-xs font-bold text-muted-foreground mb-1">◀ ▶ hareket • Space ateş</div>
              <button onClick={fire} className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-extrabold shadow-elegant animate-pulse mt-3">
                ▶ Başla
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
              <div className="text-5xl mb-2">💥</div>
              <div className="text-2xl font-extrabold text-destructive mb-1">Oyun Bitti</div>
              <div className="text-sm font-bold text-muted-foreground mb-4">Puan: {score}</div>
              <button onClick={reset} className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-extrabold shadow-elegant">
                🔁 Tekrar Oyna
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onPointerDown={(e) => { e.preventDefault(); startMove(-1); }}
            onPointerUp={stopMove} onPointerLeave={stopMove} onPointerCancel={stopMove}
            className="rounded-2xl bg-secondary text-secondary-foreground py-5 font-extrabold shadow-soft active:scale-95 flex items-center justify-center">
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); fire(); }}
            className="rounded-2xl bg-primary text-primary-foreground py-5 font-extrabold shadow-soft active:scale-95 text-xl">
            🔥 ATEŞ
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); startMove(1); }}
            onPointerUp={stopMove} onPointerLeave={stopMove} onPointerCancel={stopMove}
            className="rounded-2xl bg-secondary text-secondary-foreground py-5 font-extrabold shadow-soft active:scale-95 flex items-center justify-center">
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default RunnerGame;
