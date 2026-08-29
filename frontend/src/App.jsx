import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UploadIndicator from "./components/UploadIndicator";

const App = () => {
  return (
    <div className="app-container bg-black">
      <main className="main-content">
        <Outlet />
      </main>

      <UploadIndicator />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="dark"
      />
    </div>
  );
};

export default App;