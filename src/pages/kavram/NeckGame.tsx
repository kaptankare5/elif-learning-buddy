import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { HowToPlay } from "@/components/HowToPlay";
import { playSpeech } from "@/lib/audio";

/**
 * Uzun & Kısa — Zürafa boynu oyunu.
 * Çocuk boynu yukarı/aşağı sürükler. Boyun uzunsa "uzun", kısaysa "kısa" der.
 */
const MIN_NECK = 40;   // px
const MAX_NECK = 320;  // px
const LONG_TH = 200;   // bunun üstü = uzun
const SHORT_TH = 110;  // bunun altı = kısa

const NeckGame = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [intro, setIntro] = useState(true);
  const [neck, setNeck] = useState(160);
  const lastSpokenRef = useRef<"long" | "short" | null>(null);
  const dragRef = useRef<{ startY: number; startNeck: number } | null>(null);

  // Boyun değişince ses çal (debounce + sadece sınıf değişince)
  useEffect(() => {
    if (intro) return;
    const cls = neck >= LONG_TH ? "long" : neck <= SHORT_TH ? "short" : null;
    if (cls && cls !== lastSpokenRef.current) {
      lastSpokenRef.current = cls;
      playSpeech(cls === "long" ? "uzun" : "kısa", "tr");
    } else if (!cls) {
      lastSpokenRef.current = null;
    }
  }, [neck, intro]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startNeck: neck };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dy = dragRef.current.startY - e.clientY;
    const next = Math.max(MIN_NECK, Math.min(MAX_NECK, dragRef.current.startNeck + dy));
    setNeck(next);
  };
  const onPointerUp = () => { dragRef.current = null; };

  const status = neck >= LONG_TH ? "long" : neck <= SHORT_TH ? "short" : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-success/10 via-background to-info/10">
      <main className="container mx-auto max-w-xl px-4 pb-16 select-none">
        <PageHeader backTo={`/konu/${subjectId}`} />
        {intro && (
          <HowToPlay
            voice="Zürafanın boynunu yukarı ve aşağı kaydır."
            hint="drag-y"
            emoji="🦒"
            onDone={() => setIntro(false)}
          />
        )}

        <div
          className="relative mx-auto mt-4 flex h-[70vh] w-full max-w-sm flex-col items-center justify-end rounded-3xl bg-gradient-to-b from-sky-200/40 to-green-200/40 border-4 border-primary/20 shadow-card overflow-hidden touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Bulutlar */}
          <div className="absolute top-4 left-6 text-4xl opacity-70">☁️</div>
          <div className="absolute top-10 right-8 text-3xl opacity-60">☁️</div>

          {/* Geri-bildirim rozeti */}
          {status && (
            <div
              key={status}
              className={`absolute top-4 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-3xl font-extrabold shadow-soft animate-pop ${
                status === "long" ? "bg-success text-white" : "bg-warning text-foreground"
              }`}
            >
              {status === "long" ? "⬆️ Uzun" : "⬇️ Kısa"}
            </div>
          )}

          {/* Zürafa: gövde sabit altta, boyun yukarı uzar, kafa boynun ucunda */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
            {/* Kafa — boynun üstüne otur */}
            <div className="text-7xl leading-none" style={{ marginBottom: -10 }}>
              🦒
            </div>
            {/* Boyun — yukarı doğru uzar */}
            <div
              className="w-6 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-md border-2 border-yellow-700/40"
              style={{ height: neck, transition: "height 60ms linear" }}
            />
            {/* Gövde — sabit */}
            <div className="-mt-3 h-20 w-32 rounded-[40%] bg-gradient-to-b from-yellow-400 to-yellow-600 border-2 border-yellow-700/40 shadow-md flex items-end justify-around pb-1">
              <div className="h-6 w-2 rounded-b bg-yellow-700" />
              <div className="h-6 w-2 rounded-b bg-yellow-700" />
              <div className="h-6 w-2 rounded-b bg-yellow-700" />
              <div className="h-6 w-2 rounded-b bg-yellow-700" />
            </div>
            <div className="mt-1 text-3xl">🌿🌿🌱🌿</div>
          </div>

          {/* Sürükleme ipucu okları */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 text-3xl opacity-60 animate-pulse">
            <span>⬆️</span>
            <span>⬇️</span>
          </div>
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

export default NeckGame;
