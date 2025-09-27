import { Navigate, Outlet, useRoutes } from "react-router-dom";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import { LoginPage } from "../pages/Login";
import { DashboardPage } from "../pages/Dashboard";
import { POSPage } from "../pages/POS/POSPage";
import { ProductsPage } from "../pages/Products";
import { InventoryPage } from "../pages/Inventory";
import { PurchasesPage } from "../pages/Purchases";
import { FinancePage } from "../pages/Finance";
import { ReportsPage } from "../pages/Reports";
import { SettingsPage } from "../pages/Settings";

const ProtectedShell = () => (
  <ProtectedRoute />
);

const LayoutShell = () => (
  <AppLayout />
);

export const AppRoutes = () => {
  const element = useRoutes([
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
      path: "/",
      element: <ProtectedShell />,
      children: [
        {
          element: <LayoutShell />,
          children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: "dashboard", element: <DashboardPage /> },
            { path: "pdv", element: <POSPage /> },
            { path: "produtos", element: <ProductsPage /> },
            { path: "estoque", element: <InventoryPage /> },
            { path: "compras", element: <PurchasesPage /> },
            { path: "financeiro", element: <FinancePage /> },
            { path: "relatorios", element: <ReportsPage /> },
            { path: "configuracoes", element: <SettingsPage /> },
            { path: "*", element: <Navigate to="/dashboard" replace /> },
          ],
        },
      ],
    },
  ]);
  return element;
};
