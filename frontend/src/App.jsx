import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UploadIndicator from "./components/UploadIndicator";
import { useTheme } from "./context/ThemeContext";

// Loaded only when Devs Mode is active, so classic users never download it
const DevsBackground = lazy(() => import("./components/devs/DevsBackground"));

const App = () => {
  const { isDevs } = useTheme();

  return (
    <div className="app-container bg-black">
      {isDevs && (
        <Suspense fallback={null}>
          <DevsBackground />
        </Suspense>
      )}

      <main className="main-content relative z-10">
        <Outlet />
      </main>

      <UploadIndicator />

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
};

export default App;