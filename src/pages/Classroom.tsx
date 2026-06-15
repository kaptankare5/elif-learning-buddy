import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Copy, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

type Classroom = { id: string; name: string; invite_code: string; created_at: string };

const Classroom = () => {
  const { session, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Record<string, number>>({});

  const isTeacher = roles.includes("teacher");

  const load = async () => {
    if (!session) return;
    setLoading(true);
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      supabase.from("classrooms").select("*").eq("teacher_id", session.user.id).order("created_at", { ascending: false }),
    ]);
    setRoles(r?.map((x) => x.role as string) ?? []);
    setClasses((c as Classroom[]) ?? []);
    if (c && c.length) {
      const ids = c.map((x) => x.id);
      const { data: m } = await supabase
        .from("classroom_members")
        .select("classroom_id")
        .in("classroom_id", ids);
      const counts: Record<string, number> = {};
      (m ?? []).forEach((x) => { counts[x.classroom_id] = (counts[x.classroom_id] || 0) + 1; });
      setMembers(counts);
    }
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [session?.user?.id]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!session) return <Navigate to="/giris" replace />;

  const create = async () => {
    if (!name.trim()) return;
    const invite = Math.random().toString(36).slice(2, 8).toUpperCase();
    await supabase.from("classrooms").insert({ teacher_id: session.user.id, name: name.trim(), invite_code: invite });
    setName("");
    void load();
  };

  const join = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { error } = await supabase.rpc("join_classroom_by_code", { _code: c });
    if (error) { alert("Bu kodla bir sınıf bulunamadı."); return; }
    setCode("");
    alert("Sınıfa katıldın!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-info/10 to-background">
      <main className="container mx-auto max-w-2xl px-4 pb-24">
        <PageHeader title="🧑‍🏫 Sınıfım" backTo="/" centered />

        {!isTeacher && (
          <div className="rounded-2xl bg-card p-4 shadow-soft border-2 border-border/40 mb-4">
            <h2 className="font-extrabold mb-2">Sınıfa katıl</h2>
            <p className="text-xs text-muted-foreground mb-3">Öğretmenin verdiği kodu gir.</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Davet kodu"
                className="flex-1 rounded-xl border-2 border-border px-3 py-2 font-bold uppercase"
              />
              <button onClick={join} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 font-extrabold">Katıl</button>
            </div>
          </div>
        )}

        {isTeacher && (
          <>
            <div className="rounded-2xl bg-card p-4 shadow-soft border-2 border-border/40 mb-4">
              <h2 className="font-extrabold mb-2 flex items-center gap-2"><Plus className="h-4 w-4" /> Yeni sınıf</h2>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn. Papatya sınıfı"
                  className="flex-1 rounded-xl border-2 border-border px-3 py-2"
                />
                <button onClick={create} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 font-extrabold">Oluştur</button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
            ) : classes.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 font-bold">Henüz sınıf yok.</p>
            ) : (
              <div className="space-y-3">
                {classes.map((c) => (
                  <div key={c.id} className="rounded-2xl bg-card p-4 shadow-soft border-2 border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-extrabold text-lg">{c.name}</h3>
                      <span className="text-xs text-muted-foreground">{members[c.id] ?? 0} öğrenci</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="rounded-lg bg-muted px-3 py-1.5 font-bold tracking-widest">{c.invite_code}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(c.invite_code); }}
                        className="rounded-lg bg-primary-soft text-primary px-3 py-1.5 text-xs font-extrabold flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" /> Kopyala
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Classroom;
