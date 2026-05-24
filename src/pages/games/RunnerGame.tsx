import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { playFeedback, playSpeech } from "@/lib/audio";
import { gamePool, pickN } from "./_shared";
import { pickNextLetter, recordSrsAnswer } from "@/data/srs";
import type { ContentItem } from "@/data/types";
import { cn } from "@/lib/utils";
import { Heart, Volume2, ChevronUp, ChevronDown } from "lucide-react";

/**
 * 🏃 Koşan Çocuk — 2D yan-kaydırma, 2 şeritli (üst/alt) sonsuz koşu.
 * - Chrome Dinozor stili: engel (kaktüs/kutu) gelirse zıplayarak aş.
 * - Subway Surfers stili "eğitici faz": iki şeritte iki hedef belirir; doğru şeride geç ve doğru olanı topla.
 * - Karakter sabit X'te; arka plan kayar; Yukarı/Aşağı tuşları şerit değiştirir, Boşluk zıplatır.
 */
const TICK_MS = 32;
const BASE_SPEED = 0.55;
const JUMP_V = -4.5;
const GRAVITY = 0.28;

// Şerit dikey konumları (% top — yerden)
const LANE_Y: Record<0 | 1, number> = { 0: 48, 1: 78 }; // üst, alt
const CHAR_X = 16;
const CHAR_W = 11;

const SRS_TOPIC = "runner-game";

type Phase = "obstacle" | "edu";
interface Obj {
  uid: number;
  x: number;
  lane: 0 | 1;
  kind: "obstacle" | "target" | "wrong";
  item?: ContentItem;
}
interface Pop { id: number; x: number; y: number; text: string; good: boolean }

const OBSTACLE_EMOJIS = ["🌵", "📦", "🪨", "🛢️"];

let UID = 1;
let POP_UID = 1;

const RunnerGame = () => {
  const [lane, setLane] = useState<0 | 1>(1);
  const [y, setY] = useState(0);
  const [vel, setVel] = useState(0);
  const [objs, setObjs] = useState<Obj[]>([]);
  const [phase, setPhase] = useState<Phase>("obstacle");
  const [target, setTarget] = useState<ContentItem | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(true);
  const [pops, setPops] = useState<Pop[]>([]);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);

  const laneRef = useRef<0 | 1>(1); laneRef.current = lane;
  const yRef = useRef(0); yRef.current = y;
  const velRef = useRef(0); velRef.current = vel;
  const phaseRef = useRef<Phase>("obstacle"); phaseRef.current = phase;
  const targetRef = useRef<ContentItem | null>(null); targetRef.current = target;
  const pausedRef = useRef(true); pausedRef.current = paused;
  const scoreRef = useRef(0); scoreRef.current = score;
  const tickRef = useRef(0);
  const eduPairSpawnedRef = useRef(false);
  const phaseTimerRef = useRef(0);

  const speed = BASE_SPEED + Math.min(0.4, scoreRef.current * 0.012);

  const pickTarget = useCallback(() => {
    const pool = gamePool();
    if (pool.length === 0) return;
    const id = pickNextLetter("games", SRS_TOPIC, pool.map((p) => p.id));
    const item = pool.find((p) => p.id === id) || pool[0];
    setTarget(item);
    return item;
  }, []);

  // Eğitici faza geçiş
  const enterEdu = useCallback(() => {
    const item = pickTarget();
    setPhase("edu");
    eduPairSpawnedRef.current = false;
    phaseTimerRef.current = 0;
    if (item && !pausedRef.current) {
      setTimeout(() => playSpeech(`Hangisi ${item.speech}?`, item.lang), 120);
    }
  }, [pickTarget]);

  const exitEdu = useCallback(() => {
    setPhase("obstacle");
    phaseTimerRef.current = 0;
  }, []);

  const jump = useCallback(() => {
    if (gameOver) return;
    if (paused) { setPaused(false); enterEdu(); return; }
    if (yRef.current >= -1) setVel(JUMP_V);
  }, [gameOver, paused, enterEdu]);

  const switchLane = useCallback((dir: -1 | 1) => {
    if (gameOver) return;
    if (paused) { setPaused(false); enterEdu(); return; }
    setLane((l) => {
      const n = l + dir;
      if (n < 0 || n > 1) return l;
      return n as 0 | 1;
    });
  }, [gameOver, paused, enterEdu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); jump(); }
      if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); switchLane(-1); }
      if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); switchLane(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump, switchLane]);

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
      phaseTimerRef.current += 1;

      // Fizik
      let ny = yRef.current + velRef.current;
      let nv = velRef.current + GRAVITY;
      if (ny >= 0) { ny = 0; nv = 0; }
      setY(ny); setVel(nv);

      const curPhase = phaseRef.current;

      // Spawn mantığı
      if (curPhase === "obstacle") {
        const spawnEvery = Math.max(55, 95 - Math.floor(scoreRef.current * 0.8));
        if (tickRef.current % spawnEvery === 0) {
          setObjs((prev) => {
            if (prev.some((o) => o.x > 70)) return prev;
            const emoji = OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)];
            const lane = (Math.random() < 0.5 ? 0 : 1) as 0 | 1;
            return [...prev, { uid: UID++, x: 110, lane, kind: "obstacle",
              item: { id: `obs-${UID}`, label: emoji, speech: "", emoji, lang: "tr" } }];
          });
        }
        // Her ~12 sn'de eğitici faz
        if (phaseTimerRef.current > 360) {
          enterEdu();
        }
      } else {
        // Eğitici faz — bir kez hedef + yanlış çifti spawn et
        if (!eduPairSpawnedRef.current && targetRef.current) {
          const pool = gamePool();
          const wrong = pickN(pool.filter((p) => p.id !== targetRef.current!.id), 1)[0] || targetRef.current;
          const targetLane = (Math.random() < 0.5 ? 0 : 1) as 0 | 1;
          setObjs((prev) => [
            ...prev,
            { uid: UID++, x: 115, lane: targetLane, kind: "target", item: targetRef.current! },
            { uid: UID++, x: 115, lane: (1 - targetLane) as 0 | 1, kind: "wrong", item: wrong },
          ]);
          eduPairSpawnedRef.current = true;
        }
        // Faz zaman aşımı (~6sn) → tekrar engel fazı
        if (phaseTimerRef.current > 200) {
          exitEdu();
        }
      }

      // Hareket + çarpışma
      setObjs((prev) => {
        const next: Obj[] = [];
        let hitObstacle = false;
        let hitTarget: Obj | null = null;
        let hitWrong: Obj | null = null;
        let missedTarget = false;

        const charJumping = yRef.current < -10;

        for (const o of prev) {
          const nx = o.x - speed;
          if (nx < -8) {
            if (o.kind === "target") missedTarget = true;
            continue;
          }
          const inX = Math.abs(nx - CHAR_X) < CHAR_W / 2 + 5;
          const sameLane = o.lane === laneRef.current;
          if (inX && sameLane) {
            if (o.kind === "obstacle") {
              if (!charJumping) { hitObstacle = true; continue; }
            } else if (o.kind === "target") {
              hitTarget = { ...o, x: nx }; continue;
            } else if (o.kind === "wrong") {
              hitWrong = { ...o, x: nx }; continue;
            }
          }
          next.push({ ...o, x: nx });
        }

        if (hitObstacle) {
          playFeedback(false);
          setCombo(0);
          addPop(CHAR_X, LANE_Y[laneRef.current] - 8, "💥", false);
          flashFx("bad");
          setLives((l) => { const nl = l - 1; if (nl <= 0) setGameOver(true); return nl; });
        }
        if (hitTarget && hitTarget.item) {
          recordSrsAnswer("games", SRS_TOPIC, hitTarget.item.id, true);
          playSpeech(hitTarget.item.speech, hitTarget.item.lang);
          setScore((s) => s + 2);
          setCombo((c) => c + 1);
          addPop(CHAR_X, LANE_Y[laneRef.current] - 8, "+2", true);
          flashFx("good");
          // Filtrele: aynı edu çiftindeki diğer nesneleri de temizle
          eduPairSpawnedRef.current = true;
          setTimeout(exitEdu, 300);
          return next.filter((o) => o.kind !== "wrong");
        }
        if (hitWrong && hitWrong.item && targetRef.current) {
          recordSrsAnswer("games", SRS_TOPIC, targetRef.current.id, false);
          playFeedback(false);
          setCombo(0);
          addPop(CHAR_X, LANE_Y[laneRef.current] - 8, "✗", false);
          flashFx("bad");
          setLives((l) => { const nl = l - 1; if (nl <= 0) setGameOver(true); return nl; });
          setTimeout(exitEdu, 300);
          return next.filter((o) => o.kind !== "target");
        }
        if (missedTarget && targetRef.current) {
          recordSrsAnswer("games", SRS_TOPIC, targetRef.current.id, false);
          setCombo(0);
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameOver, paused, enterEdu, exitEdu, speed]);

  const reset = () => {
    setLane(1); setY(0); setVel(0); setObjs([]);
    setScore(0); setCombo(0); setLives(3); setGameOver(false); setPaused(true);
    setPhase("obstacle"); setTarget(null); setPops([]);
    UID = 1; POP_UID = 1; tickRef.current = 0;
    phaseTimerRef.current = 0; eduPairSpawnedRef.current = false;
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
            disabled={!target || phase !== "edu"}
            className="rounded-xl bg-primary text-primary-foreground p-2 shadow-soft border-2 border-primary font-bold flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>

        <div className={cn(
          "rounded-2xl p-3 mb-3 border-2 text-center min-h-[64px] transition-colors",
          phase === "edu"
            ? "bg-warning/20 border-warning"
            : "bg-muted/40 border-muted-foreground/20",
        )}>
          {phase === "edu" && target ? (
            <>
              <p className="text-xs font-bold text-muted-foreground">🎯 Doğru yola geç!</p>
              <p className="text-3xl mt-1">{target.emoji} <span className="text-base font-bold text-foreground/70">{target.label}</span></p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-muted-foreground">⚠️ Engellerden zıplayarak kaç!</p>
              <p className="text-2xl mt-1">🌵 📦 🪨</p>
            </>
          )}
        </div>

        <div
          onPointerDown={(e) => { e.preventDefault(); jump(); }}
          className="relative w-full overflow-hidden rounded-2xl shadow-card border-4 border-sky-400/60 select-none touch-none"
          style={{ aspectRatio: "5 / 4", maxHeight: "55vh", margin: "0 auto" }}
        >
          {/* Gökyüzü */}
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(200_85%_75%)] via-[hsl(195_90%_85%)] to-[hsl(85_60%_75%)]" />
          <div className="absolute top-[8%] right-[10%] w-14 h-14 rounded-full bg-yellow-200 shadow-[0_0_40px_rgba(255,230,100,0.8)]" />

          {/* Bulutlar */}
          <div className="absolute top-[10%] left-0 w-[200%] animate-cloud text-3xl opacity-85 pointer-events-none">
            <span className="mr-[45%]">☁️</span><span className="mr-[45%]">☁️</span><span>☁️</span>
          </div>

          {/* Şerit ayraç çizgisi (üst yol ile alt yol arası) */}
          <div
            className={cn("absolute left-0 right-0 border-t-2 border-dashed border-white/70", !paused && "animate-road-dash")}
            style={{ top: "63%" }}
          />

          {/* Yer — alt yol zemini */}
          <div
            className={cn("absolute left-0 right-0 border-t-4 border-green-700", !paused && "animate-ground")}
            style={{
              top: `83%`, bottom: 0,
              backgroundImage: `linear-gradient(to bottom, hsl(120 60% 45%), hsl(120 65% 35%)),
                                repeating-linear-gradient(90deg, transparent 0 32px, hsl(120 60% 30% / 0.4) 32px 34px)`,
              backgroundBlendMode: "normal, overlay",
            }}
          />
          {/* Üst yol zemini (köprü/platform) */}
          <div
            className={cn("absolute left-0 right-0 border-t-4 border-amber-700/70", !paused && "animate-ground")}
            style={{
              top: "53%", height: "10%",
              backgroundImage: `linear-gradient(to bottom, hsl(35 50% 55%), hsl(30 50% 40%)),
                                repeating-linear-gradient(90deg, transparent 0 28px, hsl(30 50% 25% / 0.4) 28px 30px)`,
              backgroundBlendMode: "normal, overlay",
            }}
          />

          {/* Hız çizgileri */}
          {!paused && !gameOver && combo >= 2 && (
            <div className="absolute inset-0 pointer-events-none">
              {[30, 50, 65].map((t, i) => (
                <div key={i} className="absolute h-0.5 bg-white/70 rounded-full animate-speed-line"
                  style={{ top: `${t}%`, width: "28%", left: "65%", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}

          {/* Karakter gölgesi */}
          <div
            className="absolute rounded-full bg-black/30 blur-sm"
            style={{
              left: `${CHAR_X}%`,
              top: `${LANE_Y[lane] + 3}%`,
              width: `${charJumping ? 6 : 9}%`,
              height: "2%",
              transform: "translate(-50%, 0)",
              opacity: charJumping ? 0.25 : 0.5,
            }}
          />

          {/* Karakter */}
          <div
            className={cn("absolute text-5xl leading-none transition-[top] duration-200", !paused && !charJumping && "animate-run-bob")}
            style={{
              left: `${CHAR_X}%`,
              top: `${LANE_Y[lane] + y}%`,
              transform: `translate(-50%, -100%) rotate(${charTilt}deg)`,
              transformOrigin: "center bottom",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
              zIndex: 50,
            }}
          >
            🏃
          </div>

          {/* Nesneler */}
          {objs.map((o) => (
            <div key={o.uid} className="absolute leading-none"
              style={{
                left: `${o.x}%`,
                top: `${LANE_Y[o.lane]}%`,
                transform: "translate(-50%, -100%)",
                fontSize: o.kind === "obstacle" ? "40px" : "48px",
                filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
                zIndex: 30,
              }}>
              {o.kind === "target" && (
                <div className="absolute -inset-2 rounded-full border-4 border-warning/80 animate-pulse" />
              )}
              <span className={cn(o.kind === "target" && "animate-float")}>
                {o.item?.emoji}
              </span>
            </div>
          ))}

          {/* Pop'lar */}
          {pops.map((p) => (
            <div key={p.id}
              className={cn("absolute text-2xl font-extrabold pointer-events-none animate-bounce-in",
                p.good ? "text-success" : "text-destructive")}
              style={{
                left: `${p.x}%`, top: `${p.y}%`,
                transform: "translate(-50%, -100%)",
                textShadow: "0 2px 4px rgba(0,0,0,0.4)",
                zIndex: 100,
              }}>
              {p.text}
            </div>
          ))}

          {flash && (
            <div className={cn("absolute inset-0 pointer-events-none animate-fade-in",
              flash === "good" ? "bg-success/20" : "bg-destructive/30")} />
          )}

          {paused && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm">
              <div className="text-6xl mb-3 animate-bounce">🏃</div>
              <div className="text-2xl font-extrabold text-info mb-1">Hazır?</div>
              <div className="text-xs font-bold text-muted-foreground mb-1">▲▼ şerit değiştir • Space zıpla</div>
              <button onClick={jump} className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-extrabold shadow-elegant animate-pulse mt-3">
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

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={() => switchLane(-1)} className="rounded-2xl bg-secondary text-secondary-foreground py-5 font-extrabold shadow-soft active:scale-95 flex items-center justify-center">
            <ChevronUp className="h-7 w-7" />
          </button>
          <button onClick={jump} className="rounded-2xl bg-primary text-primary-foreground py-5 font-extrabold shadow-soft active:scale-95 text-xl">
            🚀 ZIPLA
          </button>
          <button onClick={() => switchLane(1)} className="rounded-2xl bg-secondary text-secondary-foreground py-5 font-extrabold shadow-soft active:scale-95 flex items-center justify-center">
            <ChevronDown className="h-7 w-7" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default RunnerGame;
