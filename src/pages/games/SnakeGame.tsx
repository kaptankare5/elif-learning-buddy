import { useEffect, useRef, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { playItem, playFeedback, playSpeech } from "@/lib/audio";
import { gamePool, shuffle, pickN } from "./_shared";
import { pickNextLetter, recordSrsAnswer, recordLetterMastery } from "@/data/srs";
import type { ContentItem } from "@/data/types";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";

const COLS = 14;
const ROWS = 18;
const TICK_MS = 260;
const SRS_TOPIC = "snake-game";

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
  const [snake, setSnake] = useState<Cell[]>([{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }]);
  const [dir, setDir] = useState<Dir>({ x: 1, y: 0 });
  const dirRef = useRef(dir);
  dirRef.current = dir;
  const [food, setFood] = useState<FoodLetter | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [eaten, setEaten] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

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

  // Init
  useEffect(() => {
    newFood([{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }]);
  }, [newFood]);

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
        // Walls
        if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
          setGameOver(true);
          playFeedback(false);
          return prev;
        }
        // Self
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
            if (correct) {
              grew = true;
              setScore((s) => s + 5);
              playFeedback(true);
              setQuiz(null);
              setEaten(0);
              setTimeout(() => newFood(newSnake), 0);
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
            setTimeout(() => startQuiz(newSnake), 0);
          } else {
            setTimeout(() => newFood(newSnake), 0);
          }
        }

        if (!grew) newSnake.pop();
        return newSnake;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameOver, paused, food, quiz, eaten, newFood, startQuiz]);

  const reset = () => {
    setSnake([{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }]);
    setDir({ x: 1, y: 0 });
    setEaten(0);
    setScore(0);
    setGameOver(false);
    setPaused(false);
    setQuiz(null);
    newFood([{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }]);
  };

  const turn = (nd: Dir) => {
    const d = dirRef.current;
    if ((nd.x !== 0 && d.x === 0) || (nd.y !== 0 && d.y === 0)) setDir(nd);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-success/10 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="🐍 Yılan Oyunu" backTo="/oyunlar" centered onReset={reset} />

        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-success/30">
            <div className="text-[10px] font-bold text-muted-foreground">Puan</div>
            <div className="text-xl font-extrabold text-success">{score}</div>
          </div>
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-info/30">
            <div className="text-[10px] font-bold text-muted-foreground">Yenen</div>
            <div className="text-xl font-extrabold text-info">{eaten}</div>
          </div>
          <button
            onClick={() => quiz && playItem(quiz.target)}
            disabled={!quiz}
            className="rounded-xl bg-primary text-primary-foreground p-2 shadow-soft border-2 border-primary font-bold flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <Volume2 className="h-4 w-4" /> Dinle
          </button>
        </div>

        <div className={cn(
          "rounded-2xl p-3 mb-3 border-2 text-center min-h-[72px] flex flex-col justify-center transition-colors",
          quiz ? "bg-warning/20 border-warning" : "bg-card border-border",
        )}>
          {quiz ? (
            <>
              <p className="text-xs font-bold text-muted-foreground">🎯 Doğru harfi ye!</p>
              <p className="text-sm font-extrabold text-foreground">Sesi dinle ve doğru olanı yakala</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-muted-foreground">🐍 Yılanı yönlendir</p>
              <p className="text-sm font-extrabold text-foreground">Harfleri ye — 4 harften sonra sınav gelir</p>
            </>
          )}
        </div>

        <div
          className="relative bg-gradient-to-b from-success/5 to-success/20 rounded-2xl shadow-card border-4 border-success/30 overflow-hidden mx-auto"
          style={{
            aspectRatio: `${COLS} / ${ROWS}`,
            width: "100%",
            maxWidth: "min(100%, 60vh)",
          }}
        >
          {/* Snake */}
          {snake.map((c, i) => (
            <div
              key={i}
              className={cn(
                "absolute rounded-md",
                i === 0 ? "bg-success" : "bg-success/70",
              )}
              style={{
                left: `${(c.x / COLS) * 100}%`,
                top: `${(c.y / ROWS) * 100}%`,
                width: `${100 / COLS}%`,
                height: `${100 / ROWS}%`,
              }}
            />
          ))}
          {/* Food */}
          {food && (
            <div
              className="absolute flex items-center justify-center bg-warning/30 rounded-md border-2 border-warning"
              style={{
                left: `${(food.pos.x / COLS) * 100}%`,
                top: `${(food.pos.y / ROWS) * 100}%`,
                width: `${100 / COLS}%`,
                height: `${100 / ROWS}%`,
              }}
            >
              <span className="text-lg font-extrabold leading-none">{food.item.emoji}</span>
            </div>
          )}
          {/* Quiz options */}
          {quiz && quiz.options.map((opt, i) => (
            <div
              key={i}
              className="absolute flex items-center justify-center bg-info/30 rounded-md border-2 border-info"
              style={{
                left: `${(opt.pos.x / COLS) * 100}%`,
                top: `${(opt.pos.y / ROWS) * 100}%`,
                width: `${100 / COLS}%`,
                height: `${100 / ROWS}%`,
              }}
            >
              <span className="text-lg font-extrabold leading-none">{opt.item.emoji}</span>
            </div>
          ))}
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

        {/* D-pad */}
        <div className="mt-4 flex flex-col items-center gap-2 select-none">
          <button onClick={() => turn({ x: 0, y: -1 })} className="w-16 h-16 rounded-2xl bg-card shadow-card border-2 border-border text-2xl font-extrabold active:scale-90">▲</button>
          <div className="flex gap-2">
            <button onClick={() => turn({ x: -1, y: 0 })} className="w-16 h-16 rounded-2xl bg-card shadow-card border-2 border-border text-2xl font-extrabold active:scale-90">◀</button>
            <button onClick={() => setPaused((p) => !p)} className="w-16 h-16 rounded-2xl bg-muted shadow-card border-2 border-border text-sm font-extrabold active:scale-90">
              {paused ? "▶" : "II"}
            </button>
            <button onClick={() => turn({ x: 1, y: 0 })} className="w-16 h-16 rounded-2xl bg-card shadow-card border-2 border-border text-2xl font-extrabold active:scale-90">▶</button>
          </div>
          <button onClick={() => turn({ x: 0, y: 1 })} className="w-16 h-16 rounded-2xl bg-card shadow-card border-2 border-border text-2xl font-extrabold active:scale-90">▼</button>
        </div>
      </main>
    </div>
  );
};

export default SnakeGame;
