import { useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuthStore } from "../stores/authStore";
import toast from "react-hot-toast";

type LoginForm = {
  username: string;
  password: string;
};

export const LoginPage = () => {
  const { register, handleSubmit } = useForm<LoginForm>({
    defaultValues: { username: "", password: "" },
  });
  const { login, loading } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await login(values);
      toast.success("Bem vindo de volta!");
      navigate(location.state?.from?.pathname ?? "/dashboard", { replace: true });
    } catch (error) {
      toast.error((error as { message?: string }).message ?? "Nao foi possivel autenticar");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Sistema Comercio Pro</h1>
          <p className="mt-2 text-sm text-slate-500">Acesse com suas credenciais</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            label="Usuario"
            id="username"
            type="text"
            required
            placeholder="seu.usuario"
            autoComplete="username"
            {...register("username")}
          />
          <Input
            label="Senha"
            id="password"
            type="password"
            required
            placeholder="********"
            autoComplete="current-password"
            {...register("password")}
          />
          <Button type="submit" fullWidth disabled={submitting || loading}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          v1.0 - Horario local {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date())}
        </p>
      </div>
    </div>
  );
};
