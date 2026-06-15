import { forwardRef } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title?: string;
  backTo?: string;
  onReset?: () => void;
  centered?: boolean;
}

export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(
  ({ title, backTo = "/", onReset, centered }, ref) => {
    const navigate = useNavigate();
    return (
      <header
        ref={ref}
        className="sticky top-0 z-50 flex items-center justify-between gap-3 py-3 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="gap-1.5 text-primary hover:bg-primary-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana Sayfa
        </Button>

        {title && (
          <h1
            className={
              centered
                ? "absolute left-1/2 -translate-x-1/2 text-base font-bold text-foreground"
                : "text-base font-bold text-foreground"
            }
          >
            {title}
          </h1>
        )}

        {onReset ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            aria-label="Sıfırla"
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        ) : (
          <span className="w-9" />
        )}
      </header>
    );
  }
);

PageHeader.displayName = "PageHeader";
