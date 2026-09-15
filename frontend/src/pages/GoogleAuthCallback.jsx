import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const GoogleAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const newUser = searchParams.get("newUser") === "true";

    if (token) {
      localStorage.setItem("authToken", token);
      navigate(newUser ? "/user/complete-profile" : "/home", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, []);

  return (
    <div className="h-[100vh] w-[100vw] flex justify-center items-center bg-[var(--bg-app)] text-[var(--text-primary)]">
      Signing you in...
    </div>
  );
};

export default GoogleAuthCallback;