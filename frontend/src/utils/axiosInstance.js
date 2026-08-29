import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL, // e.g. http://localhost:5000
  withCredentials: true, // sends the auth cookie with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional but recommended: centralize "you got logged out" handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // token expired / invalid — bounce to login
      // avoid a hard redirect loop if you're already on the login page
      if (!window.location.pathname.startsWith("/")) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;