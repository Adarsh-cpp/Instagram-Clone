import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import socket from "../socket";

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
    }
  };

  // Get user when AuthProvider first mounts
  useEffect(() => {
    refreshUser();
  }, []);

  // Join socket room when user changes
  useEffect(() => {
    if (user?._id) {
      socket.emit("join", user._id);
    }
  }, [user]);

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