import './App.css'
import AppRoutes from './routes/AppRoutes'
import { RestaurantProvider } from "./context/RestaurantContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RestaurantProvider>
          <AppRoutes />
        </RestaurantProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App