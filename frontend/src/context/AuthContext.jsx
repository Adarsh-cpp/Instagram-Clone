import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

const BASE_URL = import.meta.env.VITE_SERVER_URL

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        setUser(null);
        return;
      }

      const response = await axios.get(
        `${BASE_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUser(response.data);

      return response.data;
    } catch (error) {
      console.log(error);

      // The server rejected the token (expired / invalid): drop it so the app
      // doesn't keep running with a dead session and a null user.
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("authToken");
        setUser(null);
      }
    }
  };

  // Get user when AuthProvider first mounts
  useEffect(() => {
    refreshUser();
  }, []);

  // NOTE: joining the socket is handled in SocketProvider (it also re-joins
  // on reconnect). Doing it here too only produced duplicate, pre-connect emits.

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
