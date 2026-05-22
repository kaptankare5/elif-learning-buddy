import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { HowToPlay } from "@/components/HowToPlay";
import { playSpeech } from "@/lib/audio";

/**
 * Büyük & Küçük — Top oyunu.
 * Çocuk iki butona basarak topu büyütür/küçültür. Boyut sınıfına göre ses çıkar.
 */
const MIN = 60, MAX = 320;
const BIG_TH = 240, SMALL_TH = 110;

const SizeGame = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [intro, setIntro] = useState(true);
  const [size, setSize] = useState(160);
  const lastRef = useRef<"big" | "small" | null>(null);

  useEffect(() => {
    if (intro) return;
    const cls = size >= BIG_TH ? "big" : size <= SMALL_TH ? "small" : null;
    if (cls && cls !== lastRef.current) {
      lastRef.current = cls;
      playSpeech(cls === "big" ? "büyük" : "küçük", "tr");
    } else if (!cls) {
      lastRef.current = null;
    }
  }, [size, intro]);

  const status = size >= BIG_TH ? "big" : size <= SMALL_TH ? "small" : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-warning/10 via-background to-secondary/20">
      <main className="container mx-auto max-w-xl px-4 pb-16 select-none">
        <PageHeader backTo={`/konu/${subjectId}`} />
        {intro && (
          <HowToPlay
            voice="Topu büyüt veya küçült."
            hint="tap-two"
            emoji="⚽"
            onDone={() => setIntro(false)}
          />
        )}

        <div className="relative mx-auto mt-4 flex h-[55vh] w-full max-w-sm items-center justify-center rounded-3xl bg-gradient-to-b from-sky-100 to-green-100 border-4 border-primary/20 shadow-card overflow-hidden">
          {status && (
            <div
              key={status}
              className={`absolute top-4 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-3xl font-extrabold shadow-soft animate-pop ${
                status === "big" ? "bg-success text-white" : "bg-info text-white"
              }`}
            >
              {status === "big" ? "🔼 Büyük" : "🔽 Küçük"}
            </div>
          )}
          <div
            className="leading-none flex items-center justify-center"
            style={{ fontSize: size, transition: "font-size 120ms ease-out" }}
          >
            ⚽
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => setSize((s) => Math.max(MIN, s - 30))}
            className="aspect-square rounded-3xl bg-card border-4 border-info/40 shadow-card text-7xl active:scale-95 transition-bouncy"
            aria-label="Küçült"
          >
            ➖
          </button>
          <button
            onClick={() => setSize((s) => Math.min(MAX, s + 30))}
            className="aspect-square rounded-3xl bg-card border-4 border-success/40 shadow-card text-7xl active:scale-95 transition-bouncy"
            aria-label="Büyüt"
          >
            ➕
          </button>
        </div>

        <div className="mt-4 flex justify-center">
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

export default SizeGame;
