import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { HowToPlay } from "@/components/HowToPlay";
import { playSpeech } from "@/lib/audio";

/**
 * Uzun & Kısa — Çeşitli nesnelerin uzun/kısa karşılaştırması.
 * Her turda iki farklı nesne (aynı tür, farklı boyda) gösterilir.
 * Çocuğa "Uzun olanı seç" ya da "Kısa olanı seç" denir.
 */

type Ask = "long" | "short";

interface ItemKind {
  emoji: string;
  /** Görsel oran: yükseklik / genişlik (uzun = ince/yüksek görünür) */
  ratio: number;
  /** Taban genişliği (px) */
  baseWidth: number;
  /** Renk (Tailwind class) */
  color: string;
  name: string;
}

const KINDS: ItemKind[] = [
  { emoji: "🌳", ratio: 1, baseWidth: 80, color: "from-green-400 to-green-700", name: "ağaç" },
  { emoji: "🦒", ratio: 1, baseWidth: 70, color: "from-yellow-300 to-yellow-600", name: "zürafa" },
  { emoji: "🐍", ratio: 1, baseWidth: 70, color: "from-emerald-400 to-emerald-700", name: "yılan" },
  { emoji: "✏️", ratio: 1, baseWidth: 36, color: "from-yellow-200 to-yellow-500", name: "kalem" },
  { emoji: "🥕", ratio: 1, baseWidth: 50, color: "from-orange-300 to-orange-600", name: "havuç" },
  { emoji: "🏢", ratio: 1, baseWidth: 90, color: "from-slate-300 to-slate-600", name: "bina" },
  { emoji: "🕯️", ratio: 1, baseWidth: 40, color: "from-amber-200 to-amber-500", name: "mum" },
  { emoji: "🎀", ratio: 1, baseWidth: 60, color: "from-pink-300 to-pink-600", name: "kurdele" },
];

interface Round {
  ask: Ask;
  kind: ItemKind;
  leftH: number;
  rightH: number;
  correct: "left" | "right";
}

function makeRound(prev?: Round): Round {
  let kind = KINDS[Math.floor(Math.random() * KINDS.length)];
  if (prev && KINDS.length > 1) {
    while (kind.emoji === prev.kind.emoji) {
      kind = KINDS[Math.floor(Math.random() * KINDS.length)];
    }
  }
  const a = 90 + Math.floor(Math.random() * 60);
  const b = a + 80 + Math.floor(Math.random() * 60);
  const swap = Math.random() < 0.5;
  const leftH = swap ? b : a;
  const rightH = swap ? a : b;
  const ask: Ask = Math.random() < 0.5 ? "long" : "short";
  const tallerSide: "left" | "right" = leftH > rightH ? "left" : "right";
  const correct = ask === "long" ? tallerSide : tallerSide === "left" ? "right" : "left";
  return { ask, kind, leftH, rightH, correct };
}

const NeckGame = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [intro, setIntro] = useState(true);
  const [round, setRound] = useState<Round>(() => makeRound());
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"ok" | "no" | null>(null);

  useEffect(() => {
    if (intro) return;
    const t = setTimeout(() => {
      playSpeech(round.ask === "long" ? "Uzun olanı seç" : "Kısa olanı seç", "tr");
    }, 150);
    return () => clearTimeout(t);
  }, [round, intro]);

  const handlePick = (side: "left" | "right") => {
    if (feedback) return;
    if (side === round.correct) {
      setFeedback("ok");
      setScore((s) => s + 1);
      playSpeech(round.ask === "long" ? "Uzun!" : "Kısa!", "tr");
      setTimeout(() => {
        setFeedback(null);
        setRound((r) => makeRound(r));
      }, 900);
    } else {
      setFeedback("no");
      playSpeech("Tekrar dene", "tr");
      setTimeout(() => setFeedback(null), 700);
    }
  };

  const promptText = round.ask === "long" ? "🔼 Uzun olanı seç" : "🔽 Kısa olanı seç";

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-background to-green-100">
      <main className="container mx-auto max-w-xl px-4 pb-16 select-none">
        <PageHeader backTo={`/konu/${subjectId}`} />
        {intro && (
          <HowToPlay
            voice="Uzun ya da kısa olanı seç."
            hint="tap-two"
            emoji="📏"
            onDone={() => setIntro(false)}
          />
        )}

        <div className="mt-2 mb-3 flex items-center justify-between">
          <div className="rounded-full bg-card px-3 py-1.5 text-sm font-extrabold shadow-card">
            ⭐ {score}
          </div>
          <div
            key={`${round.ask}-${round.kind.emoji}-${round.leftH}`}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-base font-extrabold shadow-card animate-pop"
          >
            {promptText}
          </div>
          <div className="w-12" />
        </div>

        <div className="relative mx-auto flex h-[62vh] w-full max-w-md items-end justify-around rounded-3xl bg-gradient-to-b from-sky-200/60 to-green-300/60 border-4 border-primary/20 shadow-card overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-6 pt-4 text-3xl opacity-70">
            <span>☁️</span>
            <span className="text-2xl">🌞</span>
            <span>☁️</span>
          </div>

          <ObjectButton
            kind={round.kind}
            heightPx={round.leftH}
            onClick={() => handlePick("left")}
            feedback={feedback && round.correct === "left" ? feedback : null}
          />
          <ObjectButton
            kind={round.kind}
            heightPx={round.rightH}
            onClick={() => handlePick("right")}
            feedback={feedback && round.correct === "right" ? feedback : null}
          />

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-green-600/80 to-transparent" />
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate(`/konu/${subjectId}`)}
            className="rounded-full bg-primary/10 px-6 py-3 text-2xl"
            aria-label="Geri"
          >
            🔙
          </button>
        </div>
      </main>
    </div>
  );
};

function ObjectButton({
  kind,
  heightPx,
  onClick,
  feedback,
}: {
  kind: ItemKind;
  heightPx: number;
  onClick: () => void;
  feedback: "ok" | "no" | null;
}) {
  const width = useMemo(() => Math.max(40, kind.baseWidth), [kind]);
  return (
    <button
      onClick={onClick}
      className={`relative z-10 flex flex-col items-center justify-end transition-transform active:scale-95 ${
        feedback === "ok" ? "animate-pop" : feedback === "no" ? "animate-[shake_0.4s]" : ""
      }`}
      style={{ height: heightPx + 30 }}
      aria-label={kind.name}
    >
      <div
        className={`relative flex items-end justify-center rounded-2xl bg-gradient-to-b ${kind.color} border-4 border-foreground/10 shadow-lg`}
        style={{ width, height: heightPx }}
      >
        <span className="absolute -top-3 text-4xl drop-shadow" aria-hidden>
          {kind.emoji}
        </span>
      </div>
      {feedback === "ok" && (
        <div className="absolute -top-2 right-0 text-3xl animate-bounce-in">✅</div>
      )}
    </button>
  );
}

export default NeckGame;
