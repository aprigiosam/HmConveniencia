import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type Tone = "success" | "warning" | "danger" | "info" | "secondary";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

const tones: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  secondary: "bg-slate-100 text-slate-700",
};

export const Badge = ({ tone = "info", className, ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
      tones[tone],
      className,
    )}
    {...props}
  />
);
