import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import DashboardPage from "../modules/dashboard/pages/DashboardPage";


import POSPage from "../modules/pos/pages/POSPage";
function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                <Route element={<DashboardLayout />}>

                    <Route path="/dashboard" element={<DashboardPage />} />

                    <Route path="/pos" element={<POSPage />} />

                    <Route path="/products" element={<h1>Products</h1>} />

                    <Route path="/inventory" element={<h1>Inventory</h1>} />

                    <Route path="/kitchen" element={<h1>Kitchen</h1>} />

                    <Route path="/bar" element={<h1>Bar</h1>} />

                    <Route path="/customers" element={<h1>Customers</h1>} />

                    <Route path="/reservations" element={<h1>Reservations</h1>} />

                    <Route path="/purchasing" element={<h1>Purchasing</h1>} />

                    <Route path="/employees" element={<h1>Employees</h1>} />

                    <Route path="/expenses" element={<h1>Expenses</h1>} />

                    <Route path="/reports" element={<h1>Reports</h1>} />

                </Route>

            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;