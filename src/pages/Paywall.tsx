import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Check, Lock, Crown, Sparkles, Zap, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackPaywall } from "@/lib/analytics";
import { ParentGate } from "@/components/ParentGate";

interface Plan {
  id: string;          // product_id (used to derive tier)
  name: string;
  price: number;       // TL
  per: string;         // "ay" | "destek"
  monthly?: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
  icon: typeof Crown;
  tone: "basic" | "super" | "patron";
}

// Tier'lar: free (limitli + normal mod) → basic (49₺ tüm konular) →
// super (249₺ tüm konular + süper öğrenme) → patron (5000₺ destekçi onur listesi)
const PLANS: Plan[] = [
  {
    id: "basic_monthly",
    name: "Tam Erişim",
    price: 49,
    per: "ay",
    monthly: "₺49/ay",
    icon: Sparkles,
    tone: "basic",
    features: [
      "Tüm konular açık (Türkçe, İngilizce, Matematik, Doğa, Kavramlar)",
      "Tüm yaşlar için sınırsız içerik",
      "Normal öğrenme modu",
      "Reklamsız deneyim",
    ],
  },
  {
    id: "super_monthly",
    name: "Süper Öğrenme",
    price: 249,
    per: "ay",
    monthly: "₺249/ay",
    badge: "En çok seçilen",
    highlight: true,
    icon: Zap,
    tone: "super",
    features: [
      "Tam Erişim paketinin tüm özellikleri",
      "⚡ Süper Öğrenme modu açılır",
      "Bilmiyordu / yeni öğrendi / biliyordu izleme",
      "Sıkı tekrar, hızlı kalıcılık",
    ],
  },
  {
    id: "patron",
    name: "Destekçi (Onur Listesi)",
    price: 5000,
    per: "destek",
    monthly: "Tek seferlik",
    badge: "VIP",
    icon: Heart,
    tone: "patron",
    features: [
      "Süper Öğrenme paketinin tüm özellikleri",
      "Abone olduğun sürece adın 👑 Onur Listesi'nde",
      "Uygulamayı ayakta tutan destekçiler",
    ],
  },
];

const TONE_RING: Record<Plan["tone"], string> = {
  basic: "border-primary",
  super: "border-warning",
  patron: "border-destructive",
};

const Paywall = () => {
  const { isPremium, isAdmin, loading, expiresAt, plan, tier } = useSubscription();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>("super_monthly");
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
      `"${p?.name}" (${p?.price}₺) — abonelik satın alma mobil sürümde (Google Play Billing / Capacitor) aktif olacaktır.`,
    );
  };

  const handleSubscribe = () => {
    if (!session) { navigate("/giris"); return; }
    if (!parentConsent) { alert("Önce veli beyanını onaylamalısın."); return; }
    if (!parentOk) { setGateOpen(true); return; }
    runCheckout();
  };

  const currentPlan = PLANS.find((p) => p.id === plan);

  return (
    <div className="min-h-screen bg-gradient-to-b from-warning/20 via-background to-primary-soft/30">
      <main className="container mx-auto max-w-xl px-4 pb-24">
        <PageHeader title="✨ Premium" backTo="/" centered />

        {loading ? (
          <p className="text-center text-muted-foreground font-bold py-12">Yükleniyor…</p>
        ) : isPremium ? (
          <div className="rounded-3xl bg-card p-6 shadow-card border-4 border-success/40 text-center animate-bounce-in">
            <div className="text-6xl mb-3">
              {isAdmin ? "🛡️" : tier === "patron" ? "👑" : tier === "super" ? "⚡" : "✨"}
            </div>
            <h1 className="text-2xl font-extrabold text-success mb-2">
              {isAdmin ? "Yönetici Erişimi" : `${currentPlan?.name ?? "Premium"} aktif!`}
            </h1>
            <p className="text-sm font-bold text-muted-foreground mb-4">
              Tüm konular ve oyunlar açık.
              {tier === "patron" && " Adın Onur Listesi'nde 💛"}
            </p>
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
            <div className="rounded-3xl bg-gradient-to-br from-warning to-primary p-6 text-white text-center shadow-elegant mb-5 animate-bounce-in">
              <Crown className="h-14 w-14 mx-auto mb-2" />
              <h1 className="text-3xl font-extrabold text-shadow-soft mb-1">Paket Seç</h1>
              <p className="text-sm font-bold opacity-90">Ücretsiz sürümde sınırlı içerik + normal mod açıktır.</p>
            </div>

            <div className="space-y-3 mb-5">
              {PLANS.map((p) => {
                const isSel = selected === p.id;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p.id)}
                    className={cn(
                      "w-full text-left rounded-3xl p-4 border-4 shadow-card transition-bouncy",
                      isSel
                        ? `bg-card ${TONE_RING[p.tone]}`
                        : "bg-card border-border/40 hover:border-primary/40",
                      p.highlight && !isSel && "border-warning/40",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0",
                        p.tone === "basic" && "bg-primary/15 text-primary",
                        p.tone === "super" && "bg-warning/20 text-warning",
                        p.tone === "patron" && "bg-destructive/15 text-destructive",
                      )}>
                        <Icon className="h-7 w-7" />
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
                    </div>
                    <ul className="mt-3 space-y-1.5 pl-1">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs font-semibold text-foreground/90">
                          <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl bg-muted/40 p-3 mb-4 text-[11px] font-semibold text-muted-foreground">
              <strong>Ücretsiz:</strong> her dersin ilk yarısı + normal öğrenme modu.
              Oyunlar herkese açıktır.
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
              <Crown className="h-6 w-6" /> Devam Et
            </button>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Satın alma Google Play / App Store üzerinden gerçekleşir (Capacitor). Aboneliği istediğin zaman iptal edebilirsin.
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
            Çocuğun gerçek adı sistemde tutulmaz (KVKK). Hesap velinin e-postasıyla açılır.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Paywall;
