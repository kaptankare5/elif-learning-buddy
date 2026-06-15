import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setGamePremium } from "@/pages/games/_shared";

export type PlanTier = "free" | "basic" | "super" | "patron";

export function tierForProductId(pid: string | null | undefined): PlanTier {
  if (!pid) return "free";
  if (pid.startsWith("patron")) return "patron";
  if (pid.startsWith("super")) return "super";
  if (pid.startsWith("basic")) return "basic";
  // backward compat with old ids
  if (pid === "lifetime" || pid === "yearly") return "super";
  if (pid === "monthly" || pid === "quarterly") return "basic";
  return "basic";
}

interface SubscriptionState {
  isPremium: boolean;
  isAdmin: boolean;
  hasSuperMode: boolean;
  tier: PlanTier;
  loading: boolean;
  expiresAt: string | null;
  plan: string | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SubscriptionState>({
  isPremium: false,
  isAdmin: false,
  hasSuperMode: false,
  tier: "free",
  loading: true,
  expiresAt: null,
  plan: null,
  refresh: async () => {},
});

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { session, loading: authLoading } = useAuth();
  const [isSubActive, setIsSubActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    if (!session?.user) {
      setIsSubActive(false);
      setIsAdmin(false);
      setExpiresAt(null);
      setPlan(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: sub }, { data: roles }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("status, expires_at, product_id")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id),
    ]);
    const active =
      sub?.status === "active" &&
      (!sub.expires_at || new Date(sub.expires_at) > new Date());
    setIsSubActive(!!active);
    setExpiresAt(sub?.expires_at ?? null);
    setPlan(sub?.product_id ?? null);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    void fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, authLoading]);

  const tier: PlanTier = isSubActive ? tierForProductId(plan) : "free";
  // Admin → her zaman premium + super gibi davranır
  const isPremium = isSubActive || isAdmin;
  const hasSuperMode = isAdmin || tier === "super" || tier === "patron";

  useEffect(() => {
    setGamePremium(isPremium);
  }, [isPremium]);

  const value = useMemo(
    () => ({ isPremium, isAdmin, hasSuperMode, tier, loading, expiresAt, plan, refresh: fetchStatus }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPremium, isAdmin, hasSuperMode, tier, loading, expiresAt, plan],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useSubscription = () => useContext(Ctx);
