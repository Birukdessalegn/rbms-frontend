import './App.css'
import AppRoutes from './routes/AppRoutes'
import { RestaurantProvider } from "./context/RestaurantContext";
import { AuthProvider } from "./context/AuthContext";


function App() {
  return (

    <AuthProvider>
      <RestaurantProvider>
        <AppRoutes />
      </RestaurantProvider>
    </AuthProvider>
  )
}

export default App

