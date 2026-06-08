import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Check, Lock, Crown, Sparkles } from "lucide-react";

const Paywall = () => {
  const { isPremium, loading, expiresAt } = useSubscription();
  const { session } = useAuth();
  const navigate = useNavigate();

  const handleSubscribe = () => {
    if (!session) {
      navigate("/giris");
      return;
    }
    // Capacitor entegrasyonu sonrası Google Play Billing burada tetiklenecek.
    // window.cordova?.plugins?.InAppPurchase / RevenueCat vb.
    alert(
      "Abonelik satın alma uygulamanın mobil sürümünde aktif olacaktır.\n\n(Google Play Billing entegrasyonu Capacitor ile eklenecek.)",
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-warning/20 via-background to-primary-soft/30">
      <main className="container mx-auto max-w-xl px-4 pb-24">
        <PageHeader title="✨ Premium" backTo="/" centered />

        {loading ? (
          <p className="text-center text-muted-foreground font-bold py-12">Yükleniyor…</p>
        ) : isPremium ? (
          <div className="rounded-3xl bg-card p-6 shadow-card border-4 border-success/40 text-center animate-bounce-in">
            <div className="text-6xl mb-3">👑</div>
            <h1 className="text-2xl font-extrabold text-success mb-2">Premium Aktif!</h1>
            <p className="text-sm font-bold text-muted-foreground mb-4">
              Tüm konular ve oyunlar açık.
            </p>
            {expiresAt && (
              <p className="text-xs font-semibold text-muted-foreground">
                Bitiş: {new Date(expiresAt).toLocaleDateString("tr-TR")}
              </p>
            )}
            <Link
              to="/"
              className="mt-5 inline-block rounded-full bg-primary text-primary-foreground px-6 py-3 font-extrabold shadow-soft"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-warning to-primary p-6 text-white text-center shadow-elegant mb-6 animate-bounce-in">
              <Crown className="h-16 w-16 mx-auto mb-3" />
              <h1 className="text-3xl font-extrabold text-shadow-soft mb-1">Premium</h1>
              <p className="text-sm font-bold opacity-90">Tüm konulara sınırsız erişim</p>
            </div>

            <div className="rounded-3xl bg-card p-5 shadow-card border-4 border-primary/20 mb-5">
              <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-warning" /> Premium ile neler kazanırsın?
              </h2>
              <ul className="space-y-3 text-sm font-semibold">
                {[
                  "Tüm konular açılır (Türkçe, İngilizce, Matematik, Doğa, Kavramlar)",
                  "Tüm seviyelerde sınırsız soru ve içerik",
                  "Oyunlarda tüm kelime havuzu",
                  "Reklamsız deneyim",
                  "Yeni içerikler ilk sende",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-card p-5 shadow-card border-4 border-warning/40 mb-5 text-center">
              <div className="text-xs font-bold text-muted-foreground uppercase">Aylık</div>
              <div className="text-4xl font-extrabold text-primary mt-1">₺49<span className="text-base text-muted-foreground">/ay</span></div>
              <p className="text-xs font-semibold text-muted-foreground mt-1">İstediğin zaman iptal edebilirsin</p>
            </div>

            <button
              onClick={handleSubscribe}
              className="w-full rounded-3xl bg-gradient-to-r from-warning to-primary text-white py-5 font-extrabold text-lg shadow-elegant active:scale-95 transition-bouncy flex items-center justify-center gap-2"
            >
              <Crown className="h-6 w-6" /> Premium'a Geç
            </button>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Satın alma Google Play üzerinden gerçekleşir. Otomatik yenilenir, istediğin zaman iptal edebilirsin.
            </p>
          </>
        )}

        <div className="mt-8 rounded-2xl bg-muted/40 p-4 text-center">
          <Lock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs font-bold text-muted-foreground">
            Ücretsiz sürümde her dersin ilk yarısı açıktır. Oyunlar herkese açıktır.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Paywall;
