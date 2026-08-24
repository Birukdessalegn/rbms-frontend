import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const demoUser = {
  id: 1,
  name: "Biruk Admin",
  email: "admin@rbms-restaurant.com",
  role: "ADMIN",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(demoUser);

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