import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export const AppLayout = () => (
  <div className="flex h-screen bg-slate-50">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  </div>
);
