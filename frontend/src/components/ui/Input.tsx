import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, className, id, ...props }, ref) => (
    <label className="flex flex-col gap-1 text-sm text-slate-700" htmlFor={id}>
      {label && <span className="font-medium">{label}</span>}
      <input
        ref={ref}
        id={id}
        className={cn(
          "rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200",
          className,
        )}
        {...props}
      />
      {helperText && <span className="text-xs text-slate-500">{helperText}</span>}
    </label>
  )
);

Input.displayName = 'Input';
