import { useAuthStore } from "../../stores/authStore";
import { Button } from "../ui/Button";
import { Sun, Moon, LogOut } from "lucide-react";
import { useState } from "react";

export const TopBar = () => {
  const { user, logout } = useAuthStore();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p className="text-xs uppercase text-slate-500">Bem-vindo</p>
        <h1 className="text-xl font-semibold text-slate-900">{user?.nome}</h1>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon={theme === "light" ? <Moon size={16} /> : <Sun size={16} />} onClick={toggleTheme}>
          Tema
        </Button>
        <Button variant="ghost" icon={<LogOut size={16} />} onClick={logout}>
          Sair
        </Button>
      </div>
    </header>
  );
};
