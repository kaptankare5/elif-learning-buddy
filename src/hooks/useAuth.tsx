import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setActiveSrsUser, hydrateSrsFromCloud, hasGuestData } from "@/data/srs";
const TRANSFER_PROMPT_EVENT = "miniakil:prompt-transfer";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

const ASKED_FLAG = (uid: string) => `miniakil:transfer-asked:${uid}`;
const MIGRATED_FLAG = (uid: string) => `miniakil:migrated:${uid}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    const apply = (s: Session | null) => {
      const newUid = s?.user?.id ?? null;
      const prevUid = prevUidRef.current;
      if (newUid !== prevUid) {
        // Önceki kullanıcının yerel önbelleğini KORU — cihaz başkasıyla paylaşılıyorsa
        // Ayarlar > Cihaz verilerimi sil ile temizlenebilir.
        setActiveSrsUser(newUid);
        if (newUid) {
          void hydrateSrsFromCloud(newUid).catch(() => {});
          // İlk girişte aktarma sorusunu tetikle
          try {
            const asked = localStorage.getItem(ASKED_FLAG(newUid)) === "1";
            const migrated = localStorage.getItem(MIGRATED_FLAG(newUid)) === "1";
            if (!asked && !migrated && hasGuestData()) {
              setTimeout(() => {
                try { window.dispatchEvent(new Event(TRANSFER_PROMPT_EVENT)); } catch { /* */ }
              }, 600);
            }
          } catch { /* */ }
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
