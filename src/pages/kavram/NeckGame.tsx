import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { HowToPlay } from "@/components/HowToPlay";
import { playSpeech } from "@/lib/audio";

/**
 * Uzun & Kısa — İki ağacı karşılaştır.
 * Çocuğa "Uzun olanı seç" veya "Kısa olanı seç" denir,
 * iki farklı boyda ağaca dokunur. Net, sade, eğitici.
 */

type Ask = "long" | "short";

interface Round {
  ask: Ask;
  leftH: number;   // px
  rightH: number;  // px
  correct: "left" | "right";
}

const MIN_H = 90;
const MAX_H = 260;

function makeRound(): Round {
  // İki belirgin farklı yükseklik
  const a = MIN_H + Math.floor(Math.random() * 70);          // 90-160
  const b = a + 70 + Math.floor(Math.random() * 60);         // a+70 .. a+130
  const swap = Math.random() < 0.5;
  const leftH = swap ? b : a;
  const rightH = swap ? a : b;
  const ask: Ask = Math.random() < 0.5 ? "long" : "short";
  const tallerSide: "left" | "right" = leftH > rightH ? "left" : "right";
  const correct = ask === "long" ? tallerSide : tallerSide === "left" ? "right" : "left";
  return { ask, leftH, rightH, correct };
}

const NeckGame = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [intro, setIntro] = useState(true);
  const [round, setRound] = useState<Round>(() => makeRound());
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"ok" | "no" | null>(null);

  // Soru sorulduğunda sesli oku
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
        setRound(makeRound());
      }, 900);
    } else {
      setFeedback("no");
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
            voice="Uzun ya da kısa olan ağaca dokun."
            hint="tap-two"
            emoji="🌳"
            onDone={() => setIntro(false)}
          />
        )}

        {/* Skor + soru */}
        <div className="mt-2 mb-3 flex items-center justify-between">
          <div className="rounded-full bg-card px-3 py-1.5 text-sm font-extrabold shadow-card">
            ⭐ {score}
          </div>
          <div
            key={`${round.ask}-${round.leftH}-${round.rightH}`}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-base font-extrabold shadow-card animate-pop"
          >
            {promptText}
          </div>
          <div className="w-12" />
        </div>

        {/* Sahne */}
        <div className="relative mx-auto flex h-[62vh] w-full max-w-md items-end justify-around rounded-3xl bg-gradient-to-b from-sky-200/60 to-green-300/60 border-4 border-primary/20 shadow-card overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-6 pt-4 text-3xl opacity-70">
            <span>☁️</span>
            <span className="text-2xl">🌞</span>
            <span>☁️</span>
          </div>

          <TreeButton
            heightPx={round.leftH}
            onClick={() => handlePick("left")}
            feedback={feedback && round.correct === "left" ? feedback : null}
          />
          <TreeButton
            heightPx={round.rightH}
            onClick={() => handlePick("right")}
            feedback={feedback && round.correct === "right" ? feedback : null}
          />

          {/* Yer çizgisi */}
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

function TreeButton({
  heightPx,
  onClick,
  feedback,
}: {
  heightPx: number;
  onClick: () => void;
  feedback: "ok" | "no" | null;
}) {
  const trunk = useMemo(() => Math.max(28, Math.round(heightPx * 0.35)), [heightPx]);
  const crown = heightPx - trunk;
  return (
    <button
      onClick={onClick}
      className={`relative z-10 flex flex-col items-center justify-end transition-transform active:scale-95 ${
        feedback === "ok" ? "animate-pop" : feedback === "no" ? "animate-[shake_0.4s]" : ""
      }`}
      style={{ height: heightPx + 24 }}
      aria-label="ağaç"
    >
      {/* Taç */}
      <div
        className="rounded-full bg-gradient-to-b from-green-400 to-green-700 border-4 border-green-800/40 shadow-lg"
        style={{ width: Math.min(140, crown * 0.95 + 40), height: crown }}
      />
      {/* Gövde */}
      <div
        className="w-7 rounded-b-md bg-gradient-to-b from-amber-700 to-amber-900 border-x-2 border-amber-950/40"
        style={{ height: trunk }}
      />
      {feedback === "ok" && (
        <div className="absolute -top-2 right-0 text-3xl animate-bounce-in">✅</div>
      )}
    </button>
  );
}

export default NeckGame;
