import { Sun, Moon, LogOut, Menu } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { Button } from "../ui/Button";
import { useTheme } from "../../hooks/useTheme";

interface TopBarProps {
  onToggleSidebar?: () => void;
}

export const TopBar = ({ onToggleSidebar }: TopBarProps) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const displayName = user?.username ?? "Usuario";

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 transition-colors dark:border-slate-800 dark:bg-slate-900 sm:px-6">
      <div className="flex items-center gap-3">
        {onToggleSidebar ? (
          <Button
            type="button"
            variant="ghost"
            icon={<Menu size={18} />}
            onClick={onToggleSidebar}
            className="px-2 py-2 lg:hidden"
          >
            <span className="sr-only">Abrir menu de navegação</span>
          </Button>
        ) : null}
        <div>
          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Bem vindo</p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{displayName}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          icon={theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          onClick={toggleTheme}
        >
          Tema
        </Button>
        <Button variant="ghost" icon={<LogOut size={16} />} onClick={logout}>
          Sair
        </Button>
      </div>
    </header>
  );
};
