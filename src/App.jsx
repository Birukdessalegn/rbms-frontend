import './App.css'
import AppRoutes from './routes/AppRoutes'
import { RestaurantProvider } from "./context/RestaurantContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RestaurantProvider>
          <SubscriptionProvider>
            <AppRoutes />
          </SubscriptionProvider>
        </RestaurantProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
