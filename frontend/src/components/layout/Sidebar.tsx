import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  PackageSearch,
  Boxes,
  Building2,
  CreditCard,
  LineChart,
  Settings,
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
  { label: "Produtos", to: "/produtos", icon: PackageSearch },
  { label: "Estoque", to: "/estoque", icon: Boxes, roles: ["manager", "stockist"] },
  { label: "Compras", to: "/compras", icon: Building2, roles: ["manager", "stockist"] },
  { label: "Financeiro", to: "/financeiro", icon: CreditCard, roles: ["manager"] },
  { label: "Relatórios", to: "/relatorios", icon: LineChart, roles: ["manager"] },
  { label: "Configurações", to: "/configuracoes", icon: Settings, roles: ["manager"] },
];

export const Sidebar = () => {
  const { user } = useAuthStore();
  const { pathname } = useLocation();

  const allowedItems = navItems.filter((item) =>
    item.roles ? item.roles.includes(user?.perfil ?? "cashier") : true,
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="px-6 py-6">
        <div className="text-xl font-semibold text-blue-600">Comércio Pro</div>
        <p className="mt-1 text-xs text-slate-500">Loja de bairro inteligente</p>
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
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
      <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
        <div className="font-semibold text-slate-700">Usuário</div>
        <div>{user?.nome}</div>
        {user?.lojas?.length ? <div>Loja atual: {user.lojas[0].nome}</div> : null}
      </div>
    </aside>
  );
};
