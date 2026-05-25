import { NavLink } from "react-router-dom";
import { BookOpen, Gamepad2, TrendingUp, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Ana Sayfa", icon: Home },
  { to: "/oyunlar", label: "Oyunlar", icon: Gamepad2 },
  { to: "/ilerleme", label: "İlerleme", icon: TrendingUp },
  { to: "/ayarlar", label: "Ayarlar", icon: BookOpen },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t-2 border-primary/20 shadow-elegant"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="container mx-auto max-w-2xl grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
