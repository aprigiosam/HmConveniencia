import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  PackageSearch,
  Boxes,
  Building2,
  Truck,
  FileText,
  CreditCard,
  LineChart,
  Settings,
  Users,
  X,
  Grid,
  Package,
  Tag,
  Percent,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useAuthStore } from "../../stores/authStore";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: Array<"manager" | "cashier" | "stockist">;
}

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "PDV", to: "/pdv", icon: ShoppingCart, roles: ["manager", "cashier"] },
  { label: "Grids PDV", to: "/grids", icon: Grid, roles: ["manager"] },
  { label: "Produtos", to: "/produtos", icon: PackageSearch },
  { label: "Combos", to: "/combos", icon: Package, roles: ["manager"] },
  { label: "Promoções", to: "/promocoes", icon: Tag, roles: ["manager"] },
  { label: "Listas de Preço", to: "/listas-preco", icon: Percent, roles: ["manager"] },
  { label: "Estoque", to: "/estoque", icon: Boxes, roles: ["manager", "stockist"] },
  { label: "Fornecedores", to: "/fornecedores", icon: Truck, roles: ["manager", "stockist"] },
  { label: "Clientes", to: "/clientes", icon: Users, roles: ["manager"] },
  { label: "Compras", to: "/compras", icon: Building2, roles: ["manager", "stockist"] },
  { label: "NF-e", to: "/nf-e", icon: FileText, roles: ["manager"] },
  { label: "Financeiro", to: "/financeiro", icon: CreditCard, roles: ["manager"] },
  { label: "Relatorios", to: "/relatorios", icon: LineChart, roles: ["manager"] },
  { label: "Configuracoes", to: "/configuracoes", icon: Settings, roles: ["manager"] },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  const { user } = useAuthStore();
  const { pathname } = useLocation();

  const role: "manager" | "cashier" | "stockist" = user?.is_staff ? "manager" : "cashier";
  const allowedItems = navItems.filter((item) =>
    item.roles ? item.roles.includes(role) : true,
  );
  const displayName = user?.username ?? "Usuario";
  const displayEmail = user?.email ?? "";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-lg transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="relative px-6 py-6">
        <div className="text-xl font-semibold text-blue-600">Comercio Pro</div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loja de bairro inteligente</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 lg:hidden"
            aria-label="Fechar menu de navegação"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                      isActive || active
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                    )
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="font-semibold text-slate-700 dark:text-slate-200">Usuario</div>
        <div>{displayName}</div>
        {displayEmail ? <div className="text-slate-400 dark:text-slate-500">{displayEmail}</div> : null}
      </div>
    </aside>
  );
};