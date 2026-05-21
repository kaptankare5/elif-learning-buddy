import { Link } from "react-router-dom";
import { SUBJECTS } from "@/data/subjects";
import { Sparkles, Gamepad2, Settings as SettingsIcon, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Harfler tek konulu — kartı doğrudan o konuya bağla
function subjectHref(s: { id: string; topics: { id: string }[] }) {
  if (s.topics.length === 1) return `/konu/${s.id}/${s.topics[0].id}`;
  return `/konu/${s.id}`;
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-secondary/40 via-background to-primary-soft/40">
      {/* Auth bar */}
      <div className="absolute top-3 right-3 z-10 min-h-[30px]">
        {loading ? null : user ? (
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-1 rounded-full bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-card backdrop-blur"
          >
            <LogOut className="h-3.5 w-3.5" /> Çıkış
          </button>
        ) : (
          <Link
            to="/giris"
            className="inline-flex items-center gap-1 rounded-full bg-card/80 px-3 py-1.5 text-xs font-semibold text-primary shadow-card backdrop-blur"
          >
            <LogIn className="h-3.5 w-3.5" /> Giriş
          </Link>
        )}
      </div>
      {/* Floating clouds */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
        <div className="absolute top-10 left-6 text-5xl animate-float">☁️</div>
        <div className="absolute top-32 right-10 text-4xl animate-float" style={{ animationDelay: "1s" }}>⭐</div>
        <div className="absolute bottom-40 left-12 text-4xl animate-float" style={{ animationDelay: "2s" }}>🌈</div>
        <div className="absolute bottom-60 right-8 text-5xl animate-float" style={{ animationDelay: "0.5s" }}>🎈</div>
      </div>

      <main className="container relative mx-auto max-w-2xl px-4 pb-16 pt-8">
        <div className="mb-4 flex justify-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-card px-5 py-2 text-sm font-bold text-primary shadow-card">
            <Sparkles className="h-4 w-4 text-warning" />
            Elifba Programı
          </div>
        </div>

        <div className="mb-6 text-center animate-bounce-in">
          <h1 className="mb-2 text-5xl font-extrabold tracking-tight text-primary text-shadow-soft">
            Elifba
          </h1>
          <p className="text-base font-semibold text-muted-foreground">
            Harfler • Bağlantılar • Harekeler • Tecvid
          </p>
        </div>

        {/* Maskot */}
        <div className="mb-8 flex justify-center">
          <div className="text-8xl animate-float" aria-hidden>🕌</div>
        </div>

        {/* 4 büyük konu kartı */}
        <nav className="grid grid-cols-2 gap-4 mb-6">
          {SUBJECTS.map((s, i) => (
            <Link
              key={s.id}
              to={subjectHref(s)}
              className={`${s.bgVar} group flex flex-col items-center justify-center gap-2 rounded-3xl p-6 text-center text-white shadow-card transition-bouncy hover:-translate-y-1 hover:shadow-elegant min-h-[140px] animate-bounce-in`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="text-5xl mb-1 transition-transform group-hover:scale-110">{s.emoji}</div>
              <h2 className="text-lg font-extrabold text-shadow-soft">{s.title}</h2>
              <p className="text-xs font-medium opacity-90 px-1">{s.description}</p>
            </Link>
          ))}
        </nav>

        <div className="grid grid-cols-3 gap-3">
          <Link
            to="/oyunlar"
            className="flex flex-col items-center justify-center gap-1 rounded-3xl bg-gradient-to-r from-topic-purple to-pink p-4 text-white shadow-card transition-bouncy hover:-translate-y-1 hover:shadow-elegant"
          >
            <Gamepad2 className="h-6 w-6" />
            <span className="text-sm font-extrabold text-shadow-soft">Oyunlar</span>
          </Link>
          <Link
            to="/ilerleme"
            className="flex flex-col items-center justify-center gap-1 rounded-3xl bg-gradient-to-r from-info to-primary p-4 text-white shadow-card transition-bouncy hover:-translate-y-1 hover:shadow-elegant"
          >
            <span className="text-2xl">📈</span>
            <span className="text-sm font-extrabold text-shadow-soft">İlerleme</span>
          </Link>
          <Link
            to="/ayarlar"
            className="flex flex-col items-center justify-center gap-1 rounded-3xl bg-gradient-to-r from-muted-foreground to-foreground p-4 text-white shadow-card transition-bouncy hover:-translate-y-1 hover:shadow-elegant"
          >
            <SettingsIcon className="h-6 w-6" />
            <span className="text-sm font-extrabold text-shadow-soft">Ayarlar</span>
          </Link>
        </div>

        <p className="mt-8 text-center text-xs font-semibold text-muted-foreground">
          Elifba • {SUBJECTS.reduce((acc, s) => acc + s.topics.length, 0)} Konu • Eğlenceli Oyunlar
        </p>
      </main>
    </div>
  );
};

export default Index;
