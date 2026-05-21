import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { playItem, playFeedback } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { SUBJECTS } from "@/data/subjects";
import type { ContentItem } from "@/data/types";
import { pickN, shuffle } from "./_shared";

// Hazine sandıkları: konu/altkonu kategorisi. Item gelir, doğru sandığa tıkla.
interface Bin { id: string; title: string; emoji: string; topicIds: string[]; }

function buildBins(): Bin[] {
  // Konu bazlı: Türkçe harfler, İngilizce, Sayılar, Şekiller, Hayvanlar, Renkler
  const bins: Bin[] = [];
  for (const s of SUBJECTS) {
    for (const t of s.topics) {
      if (t.practiceMode === "math") continue;
      if (t.items.length < 3) continue;
      bins.push({ id: `${s.id}-${t.id}`, title: t.title, emoji: t.emoji, topicIds: [t.id] });
    }
  }
  return bins;
}

interface RoundData { item: ContentItem; correctBinId: string; bins: Bin[]; }

function makeRound(allBins: Bin[]): RoundData {
  const bins = pickN(allBins, 4);
  const target = bins[Math.floor(Math.random() * bins.length)];
  const subject = SUBJECTS.find((s) => s.topics.some((t) => t.id === target.topicIds[0]))!;
  const topic = subject.topics.find((t) => t.id === target.topicIds[0])!;
  const item = topic.items[Math.floor(Math.random() * topic.items.length)];
  return { item, correctBinId: target.id, bins: shuffle(bins) };
}

const TreasureGame = () => {
  const allBins = useMemo(() => buildBins(), []);
  const [round, setRound] = useState<RoundData>(() => makeRound(allBins));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const next = () => {
    setRound(makeRound(allBins));
    setPicked(null);
  };

  const pick = async (binId: string) => {
    if (picked) return;
    setPicked(binId);
    const correct = binId === round.correctBinId;
    if (correct) setScore((s) => s + 1);
    await playFeedback(correct);
    setTimeout(next, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-warning/20 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="🎁 Hazine Sandığı" backTo="/oyunlar" centered onReset={() => { setScore(0); next(); }} />

        <div className="mb-3 text-center">
          <span className="rounded-full bg-card px-4 py-1 text-sm font-bold text-success shadow-soft border-2 border-success/30">
            ⭐ Puan: {score}
          </span>
        </div>

        <button
          onClick={() => playItem(round.item)}
          className="w-full bg-card rounded-3xl p-6 mb-4 shadow-card border-4 border-primary/20 text-center animate-bounce-in"
          key={round.item.id}
        >
          {round.item.emoji && <div className="text-8xl mb-2">{round.item.emoji}</div>}
          <p className="text-xs text-muted-foreground mt-2">🔊 Hangi sandığa ait?</p>
        </button>

        <div className="grid grid-cols-2 gap-3">
          {round.bins.map((bin) => {
            const isCorrect = picked && bin.id === round.correctBinId;
            const isWrong = picked === bin.id && bin.id !== round.correctBinId;
            return (
              <button
                key={bin.id}
                onClick={() => pick(bin.id)}
                className={cn(
                  "aspect-square rounded-3xl flex flex-col items-center justify-center gap-1 shadow-card border-4 transition-bouncy bg-warning/20 border-warning/40 hover:-translate-y-1",
                  isCorrect && "bg-success border-success animate-pop text-white",
                  isWrong && "bg-destructive border-destructive animate-shake text-white",
                )}
              >
                <div className="text-5xl">📦</div>
                <div className="text-2xl">{bin.emoji}</div>
                <div className="text-sm font-extrabold">{bin.title}</div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default TreasureGame;
