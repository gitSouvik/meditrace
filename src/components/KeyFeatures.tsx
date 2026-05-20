import { cn } from "@/lib/utils";

export const KEY_FEATURES = [
  "Verifiable citations to source text",
  "Biography auto-updates after changes",
  "OCR preserves document layout coordinates",
  "Track numerical trends over time",
];

export function KeyFeaturesList({ className }: { className?: string }) {
  return (
    <ul className={cn("text-sm text-muted-foreground space-y-1.5 list-disc pl-4", className)}>
      {KEY_FEATURES.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

