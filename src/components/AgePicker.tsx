import { useAge, AGE_LABELS, AGE_DESCRIPTIONS } from "@/lib/age";
import type { Age } from "@/data/types";
import { ALL_AGES } from "@/data/types";
import { cn } from "@/lib/utils";

const ICONS: Record<Age, string> = { 3: "🧸", 4: "🎨", 5: "🔤", 6: "📚" };

export function AgePicker({ onPick }: { onPick?: (a: Age) => void }) {
  const [, setAge] = useAge();
  return (
    <div className="grid grid-cols-2 gap-3">
      {ALL_AGES.map((a, i) => (
        <button
          key={a}
          onClick={() => { setAge(a); onPick?.(a); }}
          className={cn(
            "group flex flex-col items-center gap-2 rounded-3xl bg-card p-5 text-center shadow-card border-4 border-primary/20 transition-bouncy hover:-translate-y-1 hover:shadow-elegant animate-bounce-in"
          )}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="text-5xl">{ICONS[a]}</div>
          <div className="text-2xl font-extrabold text-primary">{AGE_LABELS[a]}</div>
          <div className="text-xs font-semibold text-muted-foreground">{AGE_DESCRIPTIONS[a]}</div>
        </button>
      ))}
    </div>
  );
}

export function AgeBadge() {
  const [age, setAge] = useAge();
  if (!age) return null;
  const next: Age[] = ALL_AGES;
  return (
    <div className="mb-3 flex items-center justify-center gap-1 rounded-full bg-card px-2 py-1 shadow-soft border-2 border-primary/20 w-fit mx-auto">
      <span className="text-xs font-bold text-muted-foreground px-2">Yaş:</span>
      {next.map((a) => (
        <button
          key={a}
          onClick={() => setAge(a)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-extrabold transition-bouncy",
            a === age ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted"
          )}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
