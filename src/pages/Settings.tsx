import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/lib/settings";
import { playFeedback } from "@/lib/audio";
import { Volume2, Vibrate, GraduationCap, Shield, Trash2 } from "lucide-react";
import { useGameMode } from "@/lib/gameMode";
import { cn } from "@/lib/utils";
import { consentGiven, setConsent, deleteMyAnalytics, updateMyProfile } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";

const Settings = () => {
  const [s, set] = useSettings();
  const [mode, setMode] = useGameMode();
  const { session } = useAuth();
  const [consent, setConsentState] = useState(consentGiven());
  useEffect(() => {
    const fn = () => setConsentState(consentGiven());
    window.addEventListener("miniakil:consent-changed", fn);
    return () => window.removeEventListener("miniakil:consent-changed", fn);
  }, []);
  const toggleConsent = async (v: boolean) => {
    setConsent(v); setConsentState(v);
    if (session) await updateMyProfile({ analytics_consent: v });
  };
  const handleDelete = async () => {
    if (!confirm("Tüm öğrenme verilerin sunucudan silinecek. Emin misin?")) return;
    await deleteMyAnalytics();
    alert("Verilerin silindi.");
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="⚙️ Ayarlar" backTo="/" centered />

        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card border-2 border-border/40">
            <Volume2 className="h-7 w-7 text-primary" />
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-foreground">Ses Efektleri</h3>
              <p className="text-xs text-muted-foreground">Doğru/yanlış kısa sesler</p>
            </div>
            <Switch
              checked={s.sound}
              onCheckedChange={(v) => { set({ sound: v }); if (v) setTimeout(() => playFeedback(true), 100); }}
            />
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card border-2 border-border/40">
            <Vibrate className="h-7 w-7 text-primary" />
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-foreground">Titreşim</h3>
              <p className="text-xs text-muted-foreground">Yanlış cevapta telefon titrer</p>
            </div>
            <Switch
              checked={s.vibrate}
              onCheckedChange={(v) => { set({ vibrate: v }); if (v) setTimeout(() => playFeedback(false), 100); }}
            />
          </div>

          {/* Oyun Modu */}
          <div className="rounded-2xl bg-card p-4 shadow-card border-2 border-border/40">
            <div className="flex items-center gap-3 mb-3">
              <GraduationCap className="h-7 w-7 text-primary" />
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-foreground">Oyun Modu</h3>
                <p className="text-xs text-muted-foreground">Öğrenme zorluğunu seç</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("normal")}
                className={cn(
                  "rounded-2xl p-3 border-2 font-extrabold text-sm text-left transition-bouncy",
                  mode === "normal"
                    ? "bg-primary text-primary-foreground border-primary shadow-soft"
                    : "bg-muted/40 border-border text-foreground"
                )}
              >
                🎮 Normal
                <div className="text-[10px] font-bold opacity-80 mt-1">Arada test sorusu</div>
              </button>
              <button
                onClick={() => setMode("super")}
                className={cn(
                  "rounded-2xl p-3 border-2 font-extrabold text-sm text-left transition-bouncy",
                  mode === "super"
                    ? "bg-warning text-warning-foreground border-warning shadow-soft"
                    : "bg-muted/40 border-border text-foreground"
                )}
              >
                ⚡ Süper Öğrenme
                <div className="text-[10px] font-bold opacity-80 mt-1">Her zaman test, hep ilerleme</div>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
              Süper modda sadece şu oyunlar gösterilir: Yılan, Uzay, Balon, Kutu Boşalt, Hızlı Quiz. İpucu halkası yalnız seviye 1'de görünür.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => playFeedback(true)}
            className="rounded-2xl bg-success/15 border-2 border-success/40 p-4 font-extrabold text-success shadow-soft active:scale-95"
          >
            ✓ Doğru sesi
          </button>
          <button
            onClick={() => playFeedback(false)}
            className="rounded-2xl bg-destructive/15 border-2 border-destructive/40 p-4 font-extrabold text-destructive shadow-soft active:scale-95"
          >
            ✗ Yanlış sesi
          </button>
        </div>
      </main>
    </div>
  );
};

export default Settings;
