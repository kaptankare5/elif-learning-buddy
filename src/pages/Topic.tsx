import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { getSubject, getTopic } from "@/data/subjects";
import { PageHeader } from "@/components/PageHeader";
import { playItem, playFeedback } from "@/lib/audio";
import { Volume2, ChevronLeft, ChevronRight } from "lucide-react";
import type { ContentItem, SubjectId } from "@/data/types";
import { MathPractice } from "@/components/MathPractice";
import {
  pickNextLetter,
  recordSrsAnswer,
  getTopicSrs,
  resetTopicSrs,
  useSrsTick,
  type Level,
} from "@/data/srs";
import { cn } from "@/lib/utils";
import { useAge, itemsForAge } from "@/lib/age";

type Mode = "pratik" | "kart";

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function buildQuestion(items: ContentItem[], targetId: string) {
  const target = items.find((it) => it.id === targetId) || items[0];
  const wrongs = shuffle(items.filter((it) => it.id !== target.id)).slice(0, 3);
  return { target, options: shuffle([target, ...wrongs]) };
}

const NS = "quiz" as const;

const Topic = () => {
  const { subjectId, topicId } = useParams<{ subjectId: string; topicId: string }>();
  const subject = getSubject(subjectId as SubjectId);
  const topic = getTopic(subjectId as SubjectId, topicId || "");
  const [mode, setMode] = useState<Mode>("pratik");
  const [idx, setIdx] = useState(0);
  const tick = useSrsTick(NS);

  // Pratik durumu
  const [q, setQ] = useState<{ target: ContentItem; options: ContentItem[] } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const [age] = useAge();
  const items = useMemo(() => itemsForAge(topic?.items || [], age), [topic, age]);
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  // Konu/mod değiştiğinde sıfırla
  useEffect(() => {
    setIdx(0);
    setQ(null);
    setPicked(null);
    setScore(0);
  }, [topicId, mode]);

  // Pratik modu: yeni soru üret
  useEffect(() => {
    if (mode !== "pratik" || !topic || itemIds.length === 0 || q) return;
    const tid = pickNextLetter(NS, topic.id, itemIds);
    setQ(buildQuestion(items, tid));
    setPicked(null);
  }, [mode, topic, itemIds, q, items]);

  // Hedef değişince sesi çal
  useEffect(() => {
    if (mode === "pratik" && q?.target) playItem(q.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.target?.id, mode]);

  if (!subject || !topic) return <Navigate to="/" replace />;

  // Matematik özel pratiği — değişmedi
  if (topic.practiceMode === "math") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/30 to-background">
        <main className="container mx-auto max-w-xl px-4 pb-16">
          <PageHeader title={topic.title} backTo={`/konu/${subject.id}`} centered />
          <MathPractice topic={topic} />
        </main>
      </div>
    );
  }

  // SRS seviye dağılımı
  const srs = getTopicSrs(NS, topic.id);
  const levelCount: Record<Level, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const id of itemIds) {
    const lvl = (srs[id]?.level || 1) as Level;
    levelCount[lvl] += 1;
  }
  void tick;

  // === KART (serbest gez) MODU ===
  if (mode === "kart") {
    const item = items[idx];
    const total = items.length;
    const next = () => setIdx((i) => (i + 1) % total);
    const prev = () => setIdx((i) => (i - 1 + total) % total);
    return (
      <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background">
        <main className="container mx-auto max-w-xl px-4 pb-16">
          <PageHeader title={topic.title} backTo={`/konu/${subject.id}`} centered />

          <ModeSwitch mode={mode} onChange={setMode} />

          <div className="mb-3 flex items-center justify-between text-sm font-bold text-muted-foreground">
            <span>{idx + 1} / {total}</span>
          </div>

          <button
            onClick={() => playItem(item)}
            className="w-full bg-card rounded-3xl p-8 shadow-card border-4 border-primary/20 transition-bouncy hover:scale-[1.02] active:scale-95 animate-bounce-in min-h-[55vh] flex flex-col items-center justify-center gap-4"
            key={item.id}
          >
            {item.emoji && <div className="text-7xl">{item.emoji}</div>}
            <div className="text-8xl font-extrabold text-primary text-shadow-soft animate-pop">
              {item.label}
            </div>
            {item.subLabel && (
              <div className="text-xl font-bold text-muted-foreground">{item.subLabel}</div>
            )}
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground font-bold shadow-soft">
              <Volume2 className="h-5 w-5" />
              <span>Dinle</span>
            </div>
          </button>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={prev} className="flex items-center justify-center gap-2 rounded-2xl bg-card border-2 border-border/60 p-4 font-bold text-foreground shadow-soft transition-bouncy hover:scale-105 active:scale-95">
              <ChevronLeft className="h-5 w-5" /> Önceki
            </button>
            <button onClick={next} className="flex items-center justify-center gap-2 rounded-2xl bg-primary p-4 font-bold text-primary-foreground shadow-soft transition-bouncy hover:scale-105 active:scale-95">
              Sonraki <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // === PRATİK (SRS) MODU ===
  const choose = async (opt: ContentItem) => {
    if (!q || picked) return;
    setPicked(opt.id);
    const correct = opt.id === q.target.id;
    if (correct) setScore((s) => s + 1);
    recordSrsAnswer(NS, topic.id, q.target.id, correct);
    await playFeedback(correct);
    setTimeout(() => setQ(null), 700);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader
          title={topic.title}
          backTo={`/konu/${subject.id}`}
          centered
          onReset={() => {
            resetTopicSrs(NS, topic.id);
            setScore(0);
            setQ(null);
          }}
        />

        <ModeSwitch mode={mode} onChange={setMode} />

        {/* Seviye barı */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className={cn(
                "rounded-xl p-2 text-center shadow-soft border-2",
                l === 1 && "bg-info/10 border-info/40",
                l === 2 && "bg-warning/10 border-warning/40",
                l === 3 && "bg-secondary/40 border-secondary",
                l === 4 && "bg-success/10 border-success/40",
              )}
            >
              <div className="text-[10px] font-bold text-muted-foreground">Sv {l}</div>
              <div className="text-lg font-extrabold text-foreground">{levelCount[l as Level]}</div>
            </div>
          ))}
        </div>

        <div className="mb-3 flex items-center justify-between text-sm font-bold text-muted-foreground">
          <span>⭐ Puan: {score}</span>
          <span>{itemIds.length} öğe</span>
        </div>

        {q && (
          <>
            <div className="bg-card rounded-3xl p-6 shadow-card border-4 border-primary/20 mb-4 text-center animate-bounce-in" key={q.target.id}>
              <p className="text-sm font-bold text-muted-foreground mb-2">Hangisi bu?</p>
              <button
                onClick={() => playItem(q.target)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground font-extrabold shadow-soft transition-bouncy hover:scale-105"
              >
                <Volume2 className="h-5 w-5" />
                Tekrar Dinle
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                ({q.target.lang === "en" ? "İngilizce" : "Türkçe"})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {q.options.map((opt) => {
                const isCorrect = picked && opt.id === q.target.id;
                const isWrong = picked === opt.id && opt.id !== q.target.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => choose(opt)}
                    className={cn(
                      "aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 shadow-card border-4 transition-bouncy bg-card border-primary/20 hover:-translate-y-1",
                      isCorrect && "bg-success border-success animate-pop",
                      isWrong && "bg-destructive border-destructive animate-shake",
                    )}
                  >
                    {opt.emoji && <span className="text-5xl">{opt.emoji}</span>}
                    <span className={cn("text-lg font-extrabold", (isCorrect || isWrong) ? "text-white" : "text-foreground")}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="mb-4 flex gap-2 rounded-2xl bg-muted p-1">
      <button
        onClick={() => onChange("pratik")}
        className={cn(
          "flex-1 rounded-xl py-2 text-sm font-extrabold transition-bouncy",
          mode === "pratik" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
        )}
      >
        🎯 Pratik
      </button>
      <button
        onClick={() => onChange("kart")}
        className={cn(
          "flex-1 rounded-xl py-2 text-sm font-extrabold transition-bouncy",
          mode === "kart" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
        )}
      >
        📇 Kartlar
      </button>
    </div>
  );
}

export default Topic;
