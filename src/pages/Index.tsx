import { Link } from "react-router-dom";
import { SUBJECTS } from "@/data/subjects";
import { Sparkles } from "lucide-react";
import { LangToggle } from "@/components/LangToggle";
import { useAge, AGE_LABELS } from "@/lib/age";
import { AgePicker, AgeBadge } from "@/components/AgePicker";
import { topicForAge } from "@/lib/age";

const Index = () => {
  const [age] = useAge();

  // İlk açılış: yaş seçimi
  if (!age) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-secondary/40 via-background to-primary-soft/40">
        <main className="container relative mx-auto max-w-2xl px-4 pb-16 pt-12">
          <div className="mb-6 text-center animate-bounce-in">
            <div className="text-7xl mb-3 animate-float">🐱</div>
            <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-primary text-shadow-soft">
              Endless Mum
            </h1>
            <p className="text-base font-semibold text-muted-foreground">
              MEB Okul Öncesi Programı
            </p>
          </div>
          <div className="bg-card rounded-3xl p-5 shadow-card border-4 border-primary/20 mb-4 text-center">
            <p className="text-lg font-extrabold text-foreground mb-1">Kaç yaşındasın?</p>
            <p className="text-xs font-semibold text-muted-foreground">Sana uygun konuları hazırlayalım</p>
          </div>
          <AgePicker />
        </main>
      </div>
    );
  }

  const visibleSubjects = SUBJECTS.map((s) => ({
    ...s,
    topicCount: s.topics.filter((t) => topicForAge(t, age)).length,
  })).filter((s) => s.topicCount > 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-secondary/40 via-background to-primary-soft/40">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
        <div className="absolute top-10 left-6 text-5xl animate-float">☁️</div>
        <div className="absolute top-32 right-10 text-4xl animate-float" style={{ animationDelay: "1s" }}>⭐</div>
        <div className="absolute bottom-40 left-12 text-4xl animate-float" style={{ animationDelay: "2s" }}>🌈</div>
        <div className="absolute bottom-60 right-8 text-5xl animate-float" style={{ animationDelay: "0.5s" }}>🎈</div>
      </div>

      <main className="container relative mx-auto max-w-2xl px-4 pb-16 pt-6">
        <div className="mb-3 flex justify-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-bold text-primary shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-warning" />
            MEB Anaokulu • {AGE_LABELS[age]}
          </div>
        </div>

        <div className="mb-4 text-center animate-bounce-in">
          <h1 className="mb-1 text-4xl font-extrabold tracking-tight text-primary text-shadow-soft">
            Endless Mum
          </h1>
          <p className="text-sm font-semibold text-muted-foreground">
            5 Alan • Türkiye Yüzyılı Maarif Modeli
          </p>
        </div>

        <AgeBadge />

        <div className="mb-6 flex justify-center">
          <div className="text-7xl animate-float" aria-hidden>🐱</div>
        </div>

        <nav className="grid grid-cols-2 gap-3 mb-6">
          {visibleSubjects.map((s, i) => (
            <Link
              key={s.id}
              to={`/konu/${s.id}`}
              className={`${s.bgVar} group flex flex-col items-center justify-center gap-2 rounded-3xl p-5 text-center text-white shadow-card transition-bouncy hover:-translate-y-1 hover:shadow-elegant min-h-[130px] animate-bounce-in`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="text-5xl mb-1 transition-transform group-hover:scale-110">{s.emoji}</div>
              <h2 className="text-base font-extrabold text-shadow-soft">{s.title}</h2>
              <p className="text-[11px] font-medium opacity-90 px-1">{s.topicCount} konu</p>
            </Link>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-3">
          <LangToggle />
          <Link
            to="/ilerleme"
            className="w-full flex items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-info to-primary p-5 text-white shadow-card transition-bouncy hover:-translate-y-1 hover:shadow-elegant"
          >
            <span className="text-2xl">📈</span>
            <span className="text-lg font-extrabold text-shadow-soft">İlerleme</span>
          </Link>
        </div>


        <p className="mt-6 text-center text-xs font-semibold text-muted-foreground">
          {AGE_LABELS[age]} • {visibleSubjects.reduce((a, s) => a + s.topicCount, 0)} Konu • Eğlenceli Oyunlar
        </p>
      </main>
    </div>
  );
};

export default Index;
