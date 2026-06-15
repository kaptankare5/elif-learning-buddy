import { Link } from "react-router-dom";
import { LogIn, LogOut, UserCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AccountCard() {
  const { session, signOut } = useAuth();
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card border-2 border-primary/30 mb-3">
      <div className="flex items-center gap-3">
        <UserCircle2 className="h-9 w-9 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold">Hesap</h3>
          {session ? (
            <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Giriş yaparsan ilerlemen buluta kaydedilir.</p>
          )}
        </div>
        {session ? (
          <button
            onClick={() => signOut()}
            className="rounded-xl bg-muted px-3 py-2 text-xs font-extrabold flex items-center gap-1"
          >
            <LogOut className="h-4 w-4" /> Çıkış
          </button>
        ) : (
          <Link
            to="/giris"
            className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-extrabold flex items-center gap-1"
          >
            <LogIn className="h-4 w-4" /> Giriş / Kayıt
          </Link>
        )}
      </div>
    </div>
  );
}
