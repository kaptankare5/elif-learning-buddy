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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google ile giriş yapılamadı");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-secondary/40 via-background to-primary-soft/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-card">
        <div className="text-center mb-5">
          <div className="text-5xl mb-2">📖</div>
          <h1 className="text-2xl font-extrabold text-primary">Elifmim</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Giriş yap" : "Hesap oluştur"}
          </p>
        </div>

        <Button onClick={handleGoogle} disabled={busy} variant="outline" className="w-full mb-4">
          Google ile devam et
        </Button>

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">veya</span></div>
        </div>

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
          <div>
            <Label htmlFor="password">Şifre</Label>
            <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {mode === "signin" ? "Giriş yap" : "Kayıt ol"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "signin" ? "Hesabın yok mu? " : "Zaten üye misin? "}
          <button
            className="text-primary font-semibold underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Kayıt ol" : "Giriş yap"}
          </button>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-3">
          <Link to="/">Misafir olarak devam et</Link>
        </p>
      </div>
    </div>
  );
}
