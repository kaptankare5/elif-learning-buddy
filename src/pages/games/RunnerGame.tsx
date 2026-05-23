import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { playItem, playFeedback, playSpeech } from "@/lib/audio";
import { gamePool, pickN, shuffle } from "./_shared";
import { pickNextLetter, recordSrsAnswer } from "@/data/srs";
import type { ContentItem } from "@/data/types";
import { cn } from "@/lib/utils";
import { Heart, Volume2 } from "lucide-react";

/**
 * Koşan Çocuk — 2D yan-kaydırma. Çocuk sabit hızda koşar, sadece zıplayabilir.
 * Sesli soru: "Hangisi araba?" → doğru nesneye dokunarak (zıplayıp) topla,
 * yanlış nesnelerden zıplayarak kaç. Yere değen yanlış nesne = puan; doğru kaçırılırsa can gider.
 *
 * Fiziksel mantık (Flappy ile aynı stil):
 *   - Karakter sabit X'te, sabit hızda yer kayar.
 *   - Tap/space → zıpla. Yerdeyken çarpışma toplama sayılır.
 *   - Zıplarken nesne karakterin altından geçer → toplanmaz.
 */
const W = 100;
const H = 100;
const GROUND_Y = 82;        // yer çizgisi
const CHAR_X = 18;          // karakter sabit x
const CHAR_W = 12;          // çarpışma genişliği
const SPEED = 0.55;         // nesne hızı (sağdan sola)
const GRAVITY = 0.32;
const JUMP_V = -4.6;
const SPAWN_EVERY = 90;
const TICK_MS = 33;
const MAX_OBJS = 5;
const SRS_TOPIC = "runner-game";

interface Obj {
  uid: number;
  x: number;
  item: ContentItem;
  isTarget: boolean;
  collected?: boolean;
}

let UID = 1;

const RunnerGame = () => {
  const [y, setY] = useState(0);         // 0 = yerde, negatif = havada
  const [vel, setVel] = useState(0);
  const [objs, setObjs] = useState<Obj[]>([]);
  const [target, setTarget] = useState<ContentItem | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(true);

  const yRef = useRef(0); yRef.current = y;
  const velRef = useRef(0); velRef.current = vel;
  const targetRef = useRef<ContentItem | null>(null); targetRef.current = target;
  const pausedRef = useRef(true); pausedRef.current = paused;
  const tickRef = useRef(0);

  const pickTarget = useCallback((silent = false) => {
    const pool = gamePool();
    if (pool.length === 0) return;
    const ids = pool.map((p) => p.id);
    const id = pickNextLetter("games", SRS_TOPIC, ids);
    const item = pool.find((p) => p.id === id) || pool[0];
    setTarget(item);
    if (!silent && !pausedRef.current) playSpeech(`Hangisi ${item.speech}?`, item.lang);
  }, []);

  useEffect(() => { pickTarget(true); }, [pickTarget]);

  const jump = useCallback(() => {
    if (gameOver) return;
    if (paused) {
      setPaused(false);
      if (target) setTimeout(() => playSpeech(`Hangisi ${target.speech}?`, target.lang), 100);
    }
    if (yRef.current >= 0) {
      setVel(JUMP_V);
    }
  }, [gameOver, paused, target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  // Ana döngü
  useEffect(() => {
    if (gameOver || paused) return;
    const id = setInterval(() => {
      tickRef.current += 1;

      // Karakter fizik
      let ny = yRef.current + velRef.current;
      let nv = velRef.current + GRAVITY;
      if (ny >= 0) { ny = 0; nv = 0; }
      setY(ny);
      setVel(nv);

      // Spawn
      if (tickRef.current % SPAWN_EVERY === 0 && targetRef.current) {
        setObjs((prev) => {
          if (prev.length >= MAX_OBJS) return prev;
          // Yakında başka obje varsa atla (üst üste binmesin)
          if (prev.some((o) => o.x > 100 - 22)) return prev;
          const pool = gamePool();
          const useTarget = Math.random() < 0.45;
          let item: ContentItem;
          if (useTarget) item = targetRef.current!;
          else {
            const wrongs = pickN(pool.filter((p) => p.id !== targetRef.current!.id), 1);
            item = wrongs[0] || targetRef.current!;
          }
          return [
            ...prev,
            { uid: UID++, x: 110, item, isTarget: item.id === targetRef.current!.id },
          ];
        });
      }

      // Hareket + çarpışma
      setObjs((prev) => {
        const curTarget = targetRef.current?.id;
        const next: Obj[] = [];
        let missedTarget = false;
        let collidedWrong: Obj | null = null;
        let collidedTarget: Obj | null = null;
        const charJumping = yRef.current < -8; // havadaysa toplamaz
        for (const o of prev) {
          if (o.collected) continue;
          const nx = o.x - SPEED;
          if (nx < -8) {
            if (o.item.id === curTarget) missedTarget = true;
            continue;
          }
          // Çarpışma: karakter ile aynı x aralığında ve yerdeyse
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
          setTimeout(pickTarget, 400);
        }
        if (collidedWrong) {
          recordSrsAnswer("games", SRS_TOPIC, targetRef.current!.id, false);
          playFeedback(false);
          setLives((l) => {
            const nl = l - 1;
            if (nl <= 0) setGameOver(true);
            return nl;
          });
        }
        if (missedTarget && !collidedTarget) {
          recordSrsAnswer("games", SRS_TOPIC, targetRef.current!.id, false);
          setLives((l) => {
            const nl = l - 1;
            if (nl <= 0) setGameOver(true);
            return nl;
          });
          setTimeout(pickTarget, 400);
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameOver, paused, pickTarget]);

  const reset = () => {
    setY(0); setVel(0); setObjs([]); setScore(0);
    setLives(3); setGameOver(false); setPaused(true);
    UID = 1; tickRef.current = 0;
    setTimeout(() => pickTarget(true), 0);
  };

  // Parçaları (parallax bulutlar) sabit dizi
  const clouds = [
    { x: 10, y: 12 }, { x: 45, y: 18 }, { x: 78, y: 8 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200/40 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="🏃 Koşan Çocuk" backTo="/oyunlar" centered onReset={reset} />

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
          <p className="text-xs font-bold text-muted-foreground">🎯 Doğru nesneye koş, yanlıştan zıpla!</p>
          <p className="text-3xl mt-1">{target?.emoji ?? "—"}</p>
        </div>

        <div
          onPointerDown={(e) => { e.preventDefault(); jump(); }}
          className="relative w-full overflow-hidden rounded-2xl shadow-card border-4 border-sky-400/50 bg-gradient-to-b from-sky-200 via-sky-100 to-green-200 select-none touch-none"
          style={{ aspectRatio: "5 / 4", maxHeight: "55vh", margin: "0 auto" }}
        >
          {/* Bulutlar */}
          {clouds.map((c, i) => (
            <div key={i} className="absolute text-3xl opacity-80" style={{ left: `${c.x}%`, top: `${c.y}%` }}>☁️</div>
          ))}

          {/* Yer */}
          <div
            className="absolute left-0 right-0 bg-gradient-to-b from-green-400 to-green-600 border-t-4 border-green-700"
            style={{ top: `${GROUND_Y + 8}%`, bottom: 0 }}
          />

          {/* Karakter */}
          <div
            className="absolute text-5xl leading-none"
            style={{
              left: `${CHAR_X}%`,
              top: `${GROUND_Y + y}%`,
              transform: "translate(-50%, -100%)",
              transition: "none",
            }}
          >
            🏃
          </div>

          {/* Nesneler — yerde */}
          {objs.map((o) => (
            <div
              key={o.uid}
              className={cn(
                "absolute flex items-center justify-center text-4xl leading-none rounded-full",
                o.isTarget && "ring-4 ring-warning/70 ring-offset-2 ring-offset-transparent",
              )}
              style={{
                left: `${o.x}%`,
                top: `${GROUND_Y}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              {o.item.emoji}
            </div>
          ))}

          {paused && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
              <div className="text-5xl mb-2">🏃</div>
              <div className="text-xl font-extrabold text-info mb-1">Hazır?</div>
              <div className="text-sm font-bold text-muted-foreground">Zıplamak için ekrana dokun</div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95">
              <div className="text-4xl mb-2">😢</div>
              <div className="text-2xl font-extrabold text-destructive mb-2">Oyun Bitti</div>
              <div className="text-sm font-bold text-muted-foreground mb-4">Puan: {score}</div>
              <button onClick={reset} className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-extrabold shadow-soft">
                Tekrar Oyna
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center gap-3">
          <button onClick={jump} className="flex-1 max-w-[200px] rounded-2xl bg-primary text-primary-foreground px-6 py-4 font-extrabold shadow-soft active:scale-95">
            🚀 Zıpla
          </button>
          <button onClick={() => setPaused((p) => !p)} className="rounded-2xl bg-muted px-6 py-4 font-extrabold shadow-soft active:scale-95">
            {paused ? "▶" : "II"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default RunnerGame;
