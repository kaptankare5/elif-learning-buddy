import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { consentGiven, setConsent, updateMyProfile } from "@/lib/analytics";
import { setAge } from "@/lib/age";
import { Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "parent" | "teacher";

export function ConsentModal() {
  const { session, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("parent");
  const [ageBand, setAgeBand] = useState<"3-4" | "5-6">("3-4");
  const [gender, setGender] = useState<"k" | "e" | "x">("x");
  const [accept, setAccept] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !session) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("age_band, consent_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!data?.consent_at) setOpen(true);
    })();
  }, [session, loading]);

  if (!open) return null;

  const submit = async () => {
    setSaving(true);
    setConsent(accept);
    // Yaş bandı → yaş sayısına dönüştür (ortayı al)
    setAge(ageBand === "3-4" ? 4 : 6);
    await updateMyProfile({ age_band: ageBand, gender, analytics_consent: accept });
    if (session) {
      await supabase
        .from("user_roles")
        .insert({ user_id: session.user.id, role })
        .select()
        .then(() => {}, () => {});
    }
    setSaving(false);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-card border-4 border-primary/30 shadow-elegant p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-extrabold">Hoş geldin!</h2>
          <button onClick={() => setOpen(false)} className="ml-auto p-1 rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4 leading-snug">
          Uygulamayı çocuğunuz için en iyi şekilde uyarlayabilmemiz için birkaç bilgi.
          Hiçbir kimlik bilgisi (ad, foto, vb.) saklanmaz.
        </p>

        <Label>Kim kullanacak?</Label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Choice active={role === "parent"} onClick={() => setRole("parent")} label="👨‍👩‍👧 Veliyim" />
          <Choice active={role === "teacher"} onClick={() => setRole("teacher")} label="🧑‍🏫 Öğretmenim" />
        </div>

        <Label>Çocuğun yaş aralığı</Label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Choice active={ageBand === "3-4"} onClick={() => setAgeBand("3-4")} label="3-4 yaş" />
          <Choice active={ageBand === "5-6"} onClick={() => setAgeBand("5-6")} label="5-6 yaş" />
        </div>

        <Label>Cinsiyet (opsiyonel)</Label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Choice active={gender === "k"} onClick={() => setGender("k")} label="👧 Kız" />
          <Choice active={gender === "e"} onClick={() => setGender("e")} label="👦 Erkek" />
          <Choice active={gender === "x"} onClick={() => setGender("x")} label="Belirtme" />
        </div>

        <label className="flex items-start gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="text-xs text-muted-foreground leading-snug">
            Uygulamayı geliştirmek için <strong>anonim</strong> kullanım verilerinin (hangi oyun
            oynandı, ne kadar sürdü, hangi harf öğrenildi) toplanmasına izin veriyorum.
            İstediğim zaman Ayarlar'dan kapatabilir ve verilerimi silebilirim.
          </span>
        </label>

        <button
          onClick={submit}
          disabled={saving}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-extrabold disabled:opacity-50"
        >
          {saving ? "Kaydediliyor…" : "Devam et"}
        </button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold text-muted-foreground mb-1.5">{children}</div>;
}
function Choice({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl p-2.5 border-2 font-bold text-sm transition-bouncy",
        active ? "bg-primary/10 border-primary text-primary" : "bg-muted/40 border-border text-foreground",
      )}
    >
      {label}
    </button>
  );
}
