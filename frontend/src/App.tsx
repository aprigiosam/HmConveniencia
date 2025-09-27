import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppRoutes } from "./app/routes";

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </BrowserRouter>
  );
}

export default App;
