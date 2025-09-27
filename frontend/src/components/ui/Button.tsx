import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const styles: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-100",
  ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
  destructive: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export const Button = ({
  children,
  className,
  variant = "primary",
  icon,
  fullWidth,
  ...props
}: ButtonProps) => (
  <button
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
      styles[variant],
      fullWidth && "w-full",
      className,
    )}
    {...props}
  >
    {icon}
    {children}
  </button>
);
