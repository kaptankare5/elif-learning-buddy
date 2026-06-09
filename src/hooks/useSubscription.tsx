import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setGamePremium } from "@/pages/games/_shared";

interface SubscriptionState {
  isPremium: boolean;
  isAdmin: boolean;
  loading: boolean;
  expiresAt: string | null;
  plan: string | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SubscriptionState>({
  isPremium: false,
  isAdmin: false,
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

  // Admin → her zaman premium gibi davranır
  const isPremium = isSubActive || isAdmin;

  useEffect(() => {
    setGamePremium(isPremium);
  }, [isPremium]);

  const value = useMemo(
    () => ({ isPremium, isAdmin, loading, expiresAt, plan, refresh: fetchStatus }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPremium, isAdmin, loading, expiresAt, plan],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useSubscription = () => useContext(Ctx);
