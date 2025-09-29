import React, { type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  action?: React.ReactNode;
};

export const Card = ({ title, action, className, children, ...props }: CardProps) => (
  <div
    className={cn(
      "rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900",
      className,
    )}
    {...props}
  >
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between gap-2">
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </div>
);
