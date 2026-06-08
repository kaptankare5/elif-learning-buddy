import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionState {
  isPremium: boolean;
  loading: boolean;
  expiresAt: string | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SubscriptionState>({
  isPremium: false,
  loading: true,
  expiresAt: null,
  refresh: async () => {},
});

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { session, loading: authLoading } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    if (!session?.user) {
      setIsPremium(false);
      setExpiresAt(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("status, expires_at")
      .eq("user_id", session.user.id)
      .maybeSingle();
    const active =
      data?.status === "active" &&
      (!data.expires_at || new Date(data.expires_at) > new Date());
    setIsPremium(!!active);
    setExpiresAt(data?.expires_at ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    void fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, authLoading]);

  const value = useMemo(
    () => ({ isPremium, loading, expiresAt, refresh: fetchStatus }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPremium, loading, expiresAt],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useSubscription = () => useContext(Ctx);
