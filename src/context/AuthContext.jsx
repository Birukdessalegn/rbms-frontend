import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const demoUser = {
  id: 2,
  name: "Chef",
  email: "chef@rbms.com",
  role: "CHEF",
};
function getStoredUser() {
  try {
    const storedUser = localStorage.getItem("rbms_user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error("Failed to restore user:", error);
    localStorage.removeItem("rbms_user");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    if (user) {
      localStorage.setItem("rbms_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("rbms_user");
    }
  }, [user]);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}