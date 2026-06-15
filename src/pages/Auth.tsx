import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Hesabın oluşturuldu! Giriş yapabilirsin.");
        navigate("/");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        // forgot
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/sifre-sifirla`,
        });
        if (error) throw error;
        toast.success("Şifre sıfırlama bağlantısı e-postana gönderildi.");
        setMode("signin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }) as { error?: unknown; redirected?: boolean };
      if (result.error) {
        const e = result.error as { message?: string };
        toast.error(`Google ile giriş yapılamadı: ${e?.message || String(result.error)}`);
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      navigate("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google girişi başarısız";
      toast.error(msg);
      setBusy(false);
    }
  };

  const title =
    mode === "signin" ? "Giriş yap" : mode === "signup" ? "Hesap oluştur" : "Şifremi unuttum";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-secondary/40 via-background to-primary-soft/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-card">
        <div className="text-center mb-5">
          <div className="text-5xl mb-2">📖</div>
          <h1 className="text-2xl font-extrabold text-primary">Elifmim</h1>
          <p className="text-sm text-muted-foreground mt-1">{title}</p>
        </div>

        {mode !== "forgot" && (
          <>
            <Button onClick={handleGoogle} disabled={busy} variant="outline" className="w-full mb-4">
              Google ile devam et
            </Button>
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">veya</span></div>
            </div>
          </>
        )}

        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Ad</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adın" />
            </div>
          )}
          <div>
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "forgot" && (
            <div>
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {mode === "signin" ? "Giriş yap" : mode === "signup" ? "Kayıt ol" : "Sıfırlama bağlantısı gönder"}
          </Button>
        </form>

        {mode === "signin" && (
          <p className="text-center text-xs mt-3">
            <button className="text-primary underline" onClick={() => setMode("forgot")}>
              Şifremi unuttum
            </button>
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "signin" && (
            <>Hesabın yok mu? <button className="text-primary font-semibold underline" onClick={() => setMode("signup")}>Kayıt ol</button></>
          )}
          {mode === "signup" && (
            <>Zaten üye misin? <button className="text-primary font-semibold underline" onClick={() => setMode("signin")}>Giriş yap</button></>
          )}
          {mode === "forgot" && (
            <button className="text-primary font-semibold underline" onClick={() => setMode("signin")}>← Girişe dön</button>
          )}
        </p>

        <p className="text-center text-xs text-muted-foreground mt-3">
          <Link to="/">Misafir olarak devam et</Link>
        </p>
      </div>
    </div>
  );
}
