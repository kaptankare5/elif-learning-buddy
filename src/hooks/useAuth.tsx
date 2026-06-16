import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setActiveSrsUser, hydrateSrsFromCloud } from "@/data/srs";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    const apply = (s: Session | null) => {
      const newUid = s?.user?.id ?? null;
      const prevUid = prevUidRef.current;
      if (newUid !== prevUid) {
        // Aktif SRS kapsamını değiştir. Misafir önbelleği KORUNUR — hesap kendi
        // önbelleğine buluttan çekilir; cihaz başkasıyla paylaşılıyorsa Ayarlar >
        // "Cihazdaki ilerlememi sil" ile temizlenebilir.
        setActiveSrsUser(newUid);
        if (newUid) {
          void hydrateSrsFromCloud(newUid).catch(() => {});
        }
        prevUidRef.current = newUid;
      }
      setSession(s);
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
  }), [session, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
