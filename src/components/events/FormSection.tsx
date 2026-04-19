import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  children: ReactNode;
}

export function FormSection({ title, description, defaultOpen = true, collapsible = true, children }: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;

  return (
    <section className="rounded-lg border border-border bg-card/40">
      <header
        className={cn(
          "flex items-center justify-between gap-2 px-4 py-3",
          collapsible && "cursor-pointer select-none hover:bg-muted/40 rounded-t-lg",
        )}
        onClick={() => collapsible && setOpen((v) => !v)}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-expanded={collapsible ? isOpen : undefined}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {collapsible && (
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", isOpen ? "rotate-0" : "-rotate-90")}
          />
        )}
      </header>
      {isOpen && <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/60">{children}</div>}
    </section>
  );
}
