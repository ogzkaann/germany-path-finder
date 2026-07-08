import { AlertTriangle, CheckCircle2, CircleSlash } from "lucide-react";
import type { RiskLevel } from "../domain/types";
import { riskLabels } from "../domain/labels";
import { Badge } from "./ui/badge";

const icons = {
  green: CheckCircle2,
  yellow: AlertTriangle,
  red: CircleSlash,
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const Icon = icons[level];
  return (
    <Badge variant={level} className="gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      {riskLabels[level]}
    </Badge>
  );
}
