import { useEffect, useRef, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { playItem, playFeedback, playSpeech } from "@/lib/audio";
import { gamePool, shuffle, pickN } from "./_shared";
import { pickNextLetter, recordSrsAnswer, recordLetterMastery, getLetterLevel } from "@/data/srs";
import { recordGameAnswer } from "@/lib/gameProgress";
import { useGameMode } from "@/lib/gameMode";
import type { ContentItem } from "@/data/types";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";

const COLS = 14;
const ROWS = 18;
const TICK_MS = 260;
const SRS_TOPIC = "snake-game";
const SWIPE_MIN = 24; // px — bu kadar kaydırınca yön değişir

type Cell = { x: number; y: number };
type Dir = { x: number; y: number };

interface FoodLetter {
  pos: Cell;
  item: ContentItem;
}

interface QuizState {
  target: ContentItem;
  options: [FoodLetter, FoodLetter];
}

function randCell(taken: Cell[]): Cell {
  while (true) {
    const c = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!taken.some((t) => t.x === c.x && t.y === c.y)) return c;
  }
}

const SnakeGame = () => {
  const [mode] = useGameMode();
  const isSuper = mode === "super";

  const [snake, setSnake] = useState<Cell[]>([{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }]);
  const [dir, setDir] = useState<Dir>({ x: 1, y: 0 });
  const dirRef = useRef(dir);
  dirRef.current = dir;
  const [food, setFood] = useState<FoodLetter | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [eaten, setEaten] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(true);

  // Süper modda hedef harfin SRS seviyesi — sadece L1'de halka göster
  const targetLevel = quiz ? getLetterLevel("games", SRS_TOPIC, quiz.target.id) : 1;
  const showHint = !isSuper || targetLevel === 1;

  const newFood = useCallback((occupied: Cell[]) => {
    const pool = gamePool();
    const ids = pool.map((p) => p.id);
    const chosenId = pickNextLetter("games", SRS_TOPIC, ids);
    const item = pool.find((p) => p.id === chosenId) || pool[0];
    setFood({ pos: randCell(occupied), item });
  }, []);

  const startQuiz = useCallback((occupied: Cell[]) => {
    const pool = gamePool();
    const ids = pool.map((p) => p.id);
    const targetId = pickNextLetter("games", SRS_TOPIC, ids);
    const target = pool.find((p) => p.id === targetId) || pool[0];
    const wrong = pickN(pool.filter((p) => p.id !== target.id), 1)[0];
    const taken = [...occupied];
    const a = randCell(taken); taken.push(a);
    const b = randCell(taken);
    const items = shuffle([target, wrong]);
    setQuiz({
      target,
      options: [
        { pos: a, item: items[0] },
        { pos: b, item: items[1] },
      ],
    });
    setFood(null);
    playItem(target);
  }, []);

  // Init — süper modda direkt quiz başlasın
  useEffect(() => {
    const initial = [{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }];
    if (isSuper) startQuiz(initial); else newFood(initial);
  }, [isSuper, newFood, startQuiz]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = dirRef.current;
      if (e.key === "ArrowUp" && d.y === 0) setDir({ x: 0, y: -1 });
      else if (e.key === "ArrowDown" && d.y === 0) setDir({ x: 0, y: 1 });
      else if (e.key === "ArrowLeft" && d.x === 0) setDir({ x: -1, y: 0 });
      else if (e.key === "ArrowRight" && d.x === 0) setDir({ x: 1, y: 0 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Game tick
  useEffect(() => {
    if (gameOver || paused) return;
    const id = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const d = dirRef.current;
        const next: Cell = { x: head.x + d.x, y: head.y + d.y };
        if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
          setGameOver(true);
          playFeedback(false);
          return prev;
        }
        if (prev.some((c) => c.x === next.x && c.y === next.y)) {
          setGameOver(true);
          playFeedback(false);
          return prev;
        }

        const newSnake = [next, ...prev];
        let grew = false;

        if (quiz) {
          const hitIdx = quiz.options.findIndex((o) => o.pos.x === next.x && o.pos.y === next.y);
          if (hitIdx >= 0) {
            const opt = quiz.options[hitIdx];
            const correct = opt.item.id === quiz.target.id;
            recordSrsAnswer("games", SRS_TOPIC, quiz.target.id, correct);
            recordLetterMastery(quiz.target.id, correct);
            recordGameAnswer(quiz.target, correct);
            if (correct) {
              grew = true;
              setScore((s) => s + 5);
              playFeedback(true);
              setQuiz(null);
              setEaten(0);
              // Süper modda her zaman quiz; normalde yiyeceğe dön
              if (isSuper) setTimeout(() => startQuiz(newSnake), 0);
              else setTimeout(() => newFood(newSnake), 0);
            } else {
              playFeedback(false);
              setGameOver(true);
              return prev;
            }
          }
        } else if (food && food.pos.x === next.x && food.pos.y === next.y) {
          grew = true;
          setScore((s) => s + 1);
          playSpeech(food.item.speech);
          const newEaten = eaten + 1;
          setEaten(newEaten);
          if (newEaten >= 4) {
            setPaused(true);
            setTimeout(() => { setPaused(false); startQuiz(newSnake); }, 1600);
          } else {
            setTimeout(() => newFood(newSnake), 0);
          }
        }

        if (!grew) newSnake.pop();
        return newSnake;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameOver, paused, food, quiz, eaten, newFood, startQuiz, isSuper]);

  const reset = () => {
    const initial = [{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }];
    setSnake(initial);
    setDir({ x: 1, y: 0 });
    setEaten(0);
    setScore(0);
    setGameOver(false);
    setPaused(true);
    setQuiz(null);
    setFood(null);
    if (isSuper) startQuiz(initial); else newFood(initial);
  };

  const turn = useCallback((nd: Dir) => {
    if (gameOver) return;
    if (paused) setPaused(false);
    const d = dirRef.current;
    if ((nd.x !== 0 && d.x === 0) || (nd.y !== 0 && d.y === 0)) setDir(nd);
  }, [gameOver, paused]);

  // Swipe (touch + pointer) — board üzerinde kaydırma ile yön değiştir
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]; touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStartRef.current; if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x; const dy = t.clientY - s.y;
    const ax = Math.abs(dx); const ay = Math.abs(dy);
    if (Math.max(ax, ay) < SWIPE_MIN) {
      // basit dokunuş → başlat / duraklat
      if (paused && !gameOver) setPaused(false);
      touchStartRef.current = null;
      return;
    }
    if (ax > ay) turn({ x: dx > 0 ? 1 : -1, y: 0 });
    else turn({ x: 0, y: dy > 0 ? 1 : -1 });
    touchStartRef.current = null;
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-b from-success/10 to-background flex flex-col">
      <main className="container mx-auto max-w-xl px-3 flex-1 flex flex-col min-h-0">
        <PageHeader title="🐍 Yılan" backTo="/oyunlar" centered onReset={reset} />

        <div className="mb-2 grid grid-cols-3 gap-2 text-center shrink-0">
          <div className="rounded-xl bg-card p-1.5 shadow-soft border-2 border-success/30">
            <div className="text-[10px] font-bold text-muted-foreground">Puan</div>
            <div className="text-lg font-extrabold text-success leading-tight">{score}</div>
          </div>
          <div className="rounded-xl bg-card p-1.5 shadow-soft border-2 border-info/30">
            <div className="text-[10px] font-bold text-muted-foreground">{isSuper ? "Mod" : "Yenen"}</div>
            <div className="text-lg font-extrabold text-info leading-tight">{isSuper ? "⚡" : eaten}</div>
          </div>
          <button
            onClick={() => quiz && playItem(quiz.target)}
            disabled={!quiz}
            className="rounded-xl bg-primary text-primary-foreground p-1.5 shadow-soft border-2 border-primary font-bold flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <Volume2 className="h-4 w-4" /> Dinle
          </button>
        </div>

        <div className={cn(
          "rounded-xl p-2 mb-2 border-2 text-center shrink-0 transition-colors",
          quiz ? "bg-warning/20 border-warning" : "bg-card border-border",
        )}>
          {quiz ? (
            <p className="text-xs font-extrabold text-foreground">🎯 Sesi dinle, doğru harfi ye!</p>
          ) : (
            <p className="text-xs font-extrabold text-foreground">🐍 Harfleri ye — 4 harfte bir sınav</p>
          )}
        </div>

        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="relative bg-gradient-to-b from-success/5 to-success/20 rounded-2xl shadow-card border-4 border-success/30 overflow-hidden mx-auto select-none touch-none"
          style={{
            aspectRatio: `${COLS} / ${ROWS}`,
            width: "100%",
            maxWidth: "min(100%, 55vh)",
            maxHeight: "55vh",
          }}
        >
          {snake.map((c, i) => (
            <div
              key={i}
              className={cn("absolute rounded-md", i === 0 ? "bg-success" : "bg-success/70")}
              style={{
                left: `${(c.x / COLS) * 100}%`, top: `${(c.y / ROWS) * 100}%`,
                width: `${100 / COLS}%`, height: `${100 / ROWS}%`,
              }}
            />
          ))}
          {food && (
            <div
              className="absolute flex items-center justify-center bg-warning/30 rounded-md border-2 border-warning"
              style={{
                left: `${(food.pos.x / COLS) * 100}%`, top: `${(food.pos.y / ROWS) * 100}%`,
                width: `${100 / COLS}%`, height: `${100 / ROWS}%`,
              }}
            >
              <span className="text-lg font-extrabold leading-none">{food.item.emoji}</span>
            </div>
          )}
          {quiz && quiz.options.map((opt, i) => {
            const isCorrect = opt.item.id === quiz.target.id;
            return (
              <div
                key={i}
                className={cn(
                  "absolute flex items-center justify-center rounded-md border-2",
                  isCorrect && showHint
                    ? "bg-warning/40 border-warning ring-4 ring-warning/60 animate-pulse"
                    : "bg-info/30 border-info"
                )}
                style={{
                  left: `${(opt.pos.x / COLS) * 100}%`, top: `${(opt.pos.y / ROWS) * 100}%`,
                  width: `${100 / COLS}%`, height: `${100 / ROWS}%`,
                }}
              >
                <span className="text-lg font-extrabold leading-none">{opt.item.emoji}</span>
              </div>
            );
          })}
          {!gameOver && paused && (
            <button
              onClick={() => setPaused(false)}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/80"
            >
              <div className="text-5xl mb-2">🐍</div>
              <div className="text-xl font-extrabold text-success mb-1">Hazır?</div>
              <div className="text-xs font-bold text-muted-foreground px-4 text-center">
                Ekrana parmağını sürükle (↑↓←→) ya da bir yöne bas
              </div>
            </button>
          )}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90">
              <div className="text-4xl mb-2">😵</div>
              <div className="text-2xl font-extrabold text-destructive mb-2">Oyun Bitti</div>
              <div className="text-sm font-bold text-muted-foreground mb-4">Puan: {score}</div>
              <button onClick={reset} className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-extrabold shadow-soft">
                Tekrar Oyna
              </button>
            </div>
          )}
        </div>

        {/* Sadece duraklat/devam et — yön kontrolü kaydırarak yapılır */}
        <div className="mt-2 flex justify-center select-none shrink-0">
          <button
            onClick={() => setPaused((p) => !p)}
            className="px-5 h-11 rounded-2xl bg-card shadow-card border-2 border-border text-sm font-extrabold active:scale-90"
          >
            {paused ? "▶ Başlat" : "II Duraklat"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default SnakeGame;
