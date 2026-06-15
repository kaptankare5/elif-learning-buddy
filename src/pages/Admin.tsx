import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Shield, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

type Pop = { game_id: string; session_count: number; unique_users: number; avg_seconds: number | null; completion_pct: number | null; accuracy_pct: number | null };
type Learn = { topic_id: string; letter_id: string; learners: number; avg_minutes: number | null };
type Daily = { day: string; dau: number; sessions: number };
type Funnel = { step: string; events: number; users: number };
type Age = { age_band: string; gender: string; users: number; sessions: number; accuracy_pct: number | null };
type Power = { learned_items: number; learners: number; avg_seconds_per_item: number | null; avg_minutes_per_item: number | null };
type LetterPower = { topic_id: string; letter_id: string; learners: number; avg_seconds: number | null; knew_before_count: number };

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const Admin = () => {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, loading: subLoading } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [pop, setPop] = useState<Pop[]>([]);
  const [learn, setLearn] = useState<Learn[]>([]);
  const [daily, setDaily] = useState<Daily[]>([]);
  const [funnel, setFunnel] = useState<Funnel[]>([]);
  const [ages, setAges] = useState<Age[]>([]);
  const [power, setPower] = useState<Power | null>(null);
  const [letterPower, setLetterPower] = useState<LetterPower[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      setLoading(true);
      const [p, l, d, f, a, lp, lpw] = await Promise.all([
        supabase.from("analytics_game_popularity").select("*").order("session_count", { ascending: false }),
        supabase.from("analytics_letter_learn_time").select("*").order("avg_minutes", { ascending: true }).limit(30),
        supabase.from("analytics_daily_active").select("*").limit(30),
        supabase.from("analytics_paywall_funnel").select("*"),
        supabase.from("analytics_age_breakdown").select("*"),
        supabase.from("analytics_learning_power" as never).select("*").maybeSingle(),
        supabase.from("analytics_letter_power" as never).select("*").order("avg_seconds", { ascending: true }).limit(50),
      ]);
      setPop((p.data as Pop[]) ?? []);
      setLearn((l.data as Learn[]) ?? []);
      setDaily(((d.data as Daily[]) ?? []).reverse());
      setFunnel((f.data as Funnel[]) ?? []);
      setAges((a.data as Age[]) ?? []);
      setPower((lp.data as Power | null) ?? null);
      setLetterPower((lpw.data as LetterPower[]) ?? []);
      setLoading(false);
    })();
  }, [isAdmin]);

  if (authLoading || subLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }
  if (!session) return <Navigate to="/giris" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen p-6 text-center">
        <PageHeader title="🛡️ Admin" backTo="/" centered />
        <p className="mt-12 text-muted-foreground font-bold">Bu sayfayı görmek için yönetici rolüne sahip olmalısın.</p>
      </div>
    );
  }

  const stepOrder = ["viewed", "plan_selected", "checkout_started", "purchased", "abandoned"];
  const funnelSorted = [...funnel].sort((a, b) => stepOrder.indexOf(a.step) - stepOrder.indexOf(b.step));

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <main className="container mx-auto max-w-5xl px-4 pb-24">
        <PageHeader title="🛡️ Admin Panel" backTo="/" centered />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            <KPIs daily={daily} pop={pop} funnel={funnel} />

            <Card title="📅 Günlük Aktif Kullanıcı (DAU)">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickFormatter={(d) => d.slice(5)} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="dau" stroke="#3b82f6" strokeWidth={2} name="DAU" />
                  <Line type="monotone" dataKey="sessions" stroke="#f59e0b" strokeWidth={2} name="Oturum" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="🎮 Oyun Popülerliği">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pop}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="game_id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="session_count" fill="#3b82f6" name="Oturum" />
                  <Bar dataKey="unique_users" fill="#10b981" name="Tekil kullanıcı" />
                </BarChart>
              </ResponsiveContainer>
              <Table headers={["Oyun", "Oturum", "Kişi", "Ort. sn", "Tamamlama %", "Doğruluk %"]}>
                {pop.map((r) => (
                  <tr key={r.game_id} className="border-t">
                    <td className="py-1.5 font-semibold">{r.game_id}</td>
                    <td>{r.session_count}</td>
                    <td>{r.unique_users}</td>
                    <td>{r.avg_seconds ?? "—"}</td>
                    <td>{r.completion_pct ?? "—"}</td>
                    <td>{r.accuracy_pct ?? "—"}</td>
                  </tr>
                ))}
              </Table>
            </Card>

            <Card title="⏱️ Harf/Öğe Öğrenme Süresi (Level 4'e ulaşma, dakika)">
              <Table headers={["Konu", "Öğe", "Öğrenen", "Ort. dakika"]}>
                {learn.map((r) => (
                  <tr key={r.topic_id + r.letter_id} className="border-t">
                    <td className="py-1.5 font-semibold">{r.topic_id}</td>
                    <td>{r.letter_id}</td>
                    <td>{r.learners}</td>
                    <td>{r.avg_minutes ?? "—"}</td>
                  </tr>
                ))}
                {learn.length === 0 && <tr><td colSpan={4} className="text-center text-muted-foreground py-3">Henüz veri yok.</td></tr>}
              </Table>
            </Card>

            <Card title="💳 Ödeme Funnel'i">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={funnelSorted} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="step" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="users" fill="#8b5cf6" name="Kullanıcı" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="👥 Yaş & Cinsiyet Dağılımı">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={ages} dataKey="users" nameKey="age_band" label>
                    {ages.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <Table headers={["Yaş", "Cinsiyet", "Kişi", "Oturum", "Doğruluk %"]}>
                {ages.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1.5 font-semibold">{r.age_band}</td>
                    <td>{r.gender}</td>
                    <td>{r.users}</td>
                    <td>{r.sessions}</td>
                    <td>{r.accuracy_pct ?? "—"}</td>
                  </tr>
                ))}
              </Table>
            </Card>

            <p className="text-xs text-muted-foreground text-center pt-4 flex items-center justify-center gap-2">
              <Shield className="h-3 w-3" /> Tüm veriler anonim toplulaştırılmıştır.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

function KPIs({ daily, pop, funnel }: { daily: Daily[]; pop: Pop[]; funnel: Funnel[] }) {
  const totalDau = daily[daily.length - 1]?.dau ?? 0;
  const totalSessions = pop.reduce((s, r) => s + r.session_count, 0);
  const viewed = funnel.find((f) => f.step === "viewed")?.users ?? 0;
  const purchased = funnel.find((f) => f.step === "purchased")?.users ?? 0;
  const convPct = viewed > 0 ? Math.round((purchased / viewed) * 1000) / 10 : 0;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KPI label="Bugün DAU" value={totalDau} />
      <KPI label="Toplam oturum" value={totalSessions} />
      <KPI label="Paywall görüntüleme" value={viewed} />
      <KPI label="Dönüşüm %" value={convPct} />
    </div>
  );
}
function KPI({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft border-2 border-border/40">
      <div className="text-[10px] font-bold text-muted-foreground">{label}</div>
      <div className="text-2xl font-extrabold text-primary">{value}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-card border-2 border-border/40">
      <h2 className="font-extrabold mb-3">{title}</h2>
      {children}
    </div>
  );
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-left text-muted-foreground">
          {headers.map((h) => <th key={h} className="pb-1 font-bold">{h}</th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default Admin;
