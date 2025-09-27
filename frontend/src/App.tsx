import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { AppRoutes } from "./app/routes";
import { useAuthStore } from "./stores/authStore";

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </BrowserRouter>
  );
}

export default App;
