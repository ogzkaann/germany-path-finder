import { Check } from "lucide-react";
import { cn } from "../lib/utils";

interface StepperProps {
  steps: string[];
  activeIndex: number;
}

export function Stepper({ steps, activeIndex }: StepperProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div
            key={step}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 text-sm",
              active ? "border-primary bg-slate-50 text-foreground" : "border-border bg-background text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                complete
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary text-primary"
                    : "border-border",
              )}
            >
              {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="truncate font-medium">{step}</span>
          </div>
        );
      })}
    </div>
  );
}
