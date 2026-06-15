import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Check, Lock, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackPaywall } from "@/lib/analytics";
import { ParentGate } from "@/components/ParentGate";

interface Plan {
  id: string;
  name: string;
  price: number; // TL toplam
  per: string;   // "ay", "3 ay", "yıl", "tek seferlik"
  monthly?: string; // "₺33/ay"
  badge?: string;
  highlight?: boolean;
}

// Türkiye çocuk eğitim uygulaması fiyat araştırması:
// Aylık paketler genelde 49-99 TL aralığında, yıllık paketlerde %40-50 indirim
// (örn. Khan Academy Kids ücretsiz; Lingokids ~$8-15/ay, yerel pazar 50-90 TL/ay)
const PLANS: Plan[] = [
  { id: "monthly",   name: "Aylık",      price: 59,  per: "ay",         monthly: "₺59/ay" },
  { id: "quarterly", name: "3 Aylık",    price: 149, per: "3 ay",       monthly: "₺49,67/ay", badge: "%16 indirim" },
  { id: "yearly",    name: "Yıllık",     price: 399, per: "yıl",        monthly: "₺33,25/ay", badge: "%43 indirim", highlight: true },
  { id: "lifetime",  name: "Ömür Boyu",  price: 999, per: "tek seferlik", monthly: "Tek ödeme", badge: "En avantajlı" },
];

const Paywall = () => {
  const { isPremium, isAdmin, loading, expiresAt, plan } = useSubscription();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>("yearly");
  const [parentOk, setParentOk] = useState(false);
  const [parentConsent, setParentConsent] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => { void trackPaywall("viewed"); }, []);

  const handleSelect = (id: string) => {
    setSelected(id);
    void trackPaywall("plan_selected", id);
  };

  const runCheckout = () => {
    const p = PLANS.find((x) => x.id === selected);
    void trackPaywall("checkout_started", selected);
    alert(
      `"${p?.name}" planı (${p?.price}₺) — abonelik satın alma mobil sürümde aktif olacaktır.\n\n(Google Play Billing entegrasyonu Capacitor ile eklenecek.)`,
    );
  };

  const handleSubscribe = () => {
    if (!session) { navigate("/giris"); return; }
    if (!parentConsent) { alert("Önce veli beyanını onaylamalısın."); return; }
    if (!parentOk) { setGateOpen(true); return; }
    runCheckout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-warning/20 via-background to-primary-soft/30">
      <main className="container mx-auto max-w-xl px-4 pb-24">
        <PageHeader title="✨ Premium" backTo="/" centered />

        {loading ? (
          <p className="text-center text-muted-foreground font-bold py-12">Yükleniyor…</p>
        ) : isPremium ? (
          <div className="rounded-3xl bg-card p-6 shadow-card border-4 border-success/40 text-center animate-bounce-in">
            <div className="text-6xl mb-3">{isAdmin ? "🛡️" : "👑"}</div>
            <h1 className="text-2xl font-extrabold text-success mb-2">
              {isAdmin ? "Yönetici Erişimi" : "Premium Aktif!"}
            </h1>
            <p className="text-sm font-bold text-muted-foreground mb-4">
              Tüm konular ve oyunlar açık.
            </p>
            {plan && !isAdmin && (
              <p className="text-xs font-semibold text-muted-foreground">
                Plan: {PLANS.find((p) => p.id === plan)?.name || plan}
              </p>
            )}
            {expiresAt && !isAdmin && (
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

            <h2 className="text-base font-extrabold text-foreground mb-2 px-1">Plan seç</h2>
            <div className="space-y-2 mb-5">
              {PLANS.map((p) => {
                const isSel = selected === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p.id)}
                    className={cn(
                      "w-full text-left rounded-2xl p-4 border-4 shadow-card transition-bouncy flex items-center gap-3",
                      isSel
                        ? "bg-primary/10 border-primary"
                        : "bg-card border-border/40 hover:border-primary/40",
                      p.highlight && !isSel && "border-warning/50",
                    )}
                  >
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full border-4 shrink-0 flex items-center justify-center",
                        isSel ? "border-primary bg-primary" : "border-muted-foreground/40",
                      )}
                    >
                      {isSel && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-base text-foreground">{p.name}</span>
                        {p.badge && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground">{p.monthly}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-extrabold text-primary">₺{p.price}</div>
                      <div className="text-[10px] font-bold text-muted-foreground">/ {p.per}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <label className="flex items-start gap-2 mb-3 text-[11px] text-muted-foreground leading-snug cursor-pointer px-1">
              <input type="checkbox" checked={parentConsent} onChange={(e) => setParentConsent(e.target.checked)} className="mt-1" />
              <span>
                <strong>Veli/yasal vasi sıfatıyla</strong> ödemeyi kendim yapıyorum. Aboneliği
                istediğim zaman iptal edebileceğimi ve 6502 sayılı Tüketici Kanunu kapsamındaki
                haklarımı bildiğimi onaylıyorum.
              </span>
            </label>

            <button
              onClick={handleSubscribe}
              className="w-full rounded-3xl bg-gradient-to-r from-warning to-primary text-white py-5 font-extrabold text-lg shadow-elegant active:scale-95 transition-bouncy flex items-center justify-center gap-2"
            >
              <Crown className="h-6 w-6" /> Premium'a Geç
            </button>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Satın alma Google Play üzerinden gerçekleşir. Aboneliği istediğin zaman iptal edebilirsin.
            </p>
          </>
        )}

        <ParentGate
          open={gateOpen}
          onPass={() => { setParentOk(true); setGateOpen(false); runCheckout(); }}
          onCancel={() => setGateOpen(false)}
          title="Ödemeden önce: Veli doğrulaması"
        />

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
