import React, { type TableHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type TableProps = TableHTMLAttributes<HTMLTableElement>;

export const Table = ({ className, children, ...props }: TableProps) => (
  <div className="overflow-hidden rounded-xl border border-slate-200">
    <table className={cn("min-w-full bg-white text-left text-sm", className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("bg-slate-50 text-xs uppercase tracking-wide text-slate-500", className)} {...props} />
);

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y divide-slate-100", className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("hover:bg-slate-50", className)} {...props} />
);

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 text-slate-700", className)} {...props} />
);

export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("px-4 py-3 font-semibold", className)} {...props} />
);
