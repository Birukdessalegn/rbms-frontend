import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PermissionRoute from "./PermissionRoute";
import RoleRedirect from "./RoleRedirect";

import LoginPage from "../modules/auth/pages/LoginPage";
import POSReportsPage from "../modules/pos/pages/POSReportsPage";

// Layouts
import DashboardLayout from "../layouts/DashboardLayout";
import KitchenLayout from "../layouts/KitchenLayout";
import POSLayout from "../layouts/POSLayout";
import BarLayout from "../layouts/BarLayout";

// Pages
import DashboardPage from "../modules/dashboard/pages/DashboardPage";
import KitchenPage from "../modules/kitchen/pages/KitchenPage";
import POSPage from "../modules/pos/pages/POSPage";
import BarPage from "../modules/bar/pages/BarPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =====================================================
            PUBLIC ROUTES
        ====================================================== */}

        <Route
          path="/login"
          element={<LoginPage />}
        />


        {/* =====================================================
            PROTECTED ROUTES
        ====================================================== */}

        <Route element={<ProtectedRoute />}>

          {/* =================================================
              ROOT
              Automatically redirects according to role
          ================================================= */}

          <Route
            path="/"
            element={<RoleRedirect />}
          />


          {/* =================================================
              ADMIN / MANAGER
              Main Management Dashboard
          ================================================= */}

          <Route element={<DashboardLayout />}>

            {/* Dashboard */}
            <Route
              element={
                <PermissionRoute permission="dashboard" />
              }
            >
              <Route
                path="/dashboard"
                element={<DashboardPage />}
              />
            </Route>


            {/* Products */}
            <Route
              element={
                <PermissionRoute permission="products" />
              }
            >
              <Route
                path="/products"
                element={<h1>Products</h1>}
              />
            </Route>


            {/* Inventory */}
            <Route
              element={
                <PermissionRoute permission="inventory" />
              }
            >
              <Route
                path="/inventory"
                element={<h1>Inventory</h1>}
              />
            </Route>


            {/* Customers */}
            <Route
              element={
                <PermissionRoute permission="customers" />
              }
            >
              <Route
                path="/customers"
                element={<h1>Customers</h1>}
              />
            </Route>


            {/* Reservations */}
            <Route
              element={
                <PermissionRoute permission="reservations" />
              }
            >
              <Route
                path="/reservations"
                element={<h1>Reservations</h1>}
              />
            </Route>


            {/* Purchasing */}
            <Route
              element={
                <PermissionRoute permission="purchasing" />
              }
            >
              <Route
                path="/purchasing"
                element={<h1>Purchasing</h1>}
              />
            </Route>


            {/* Employees */}
            <Route
              element={
                <PermissionRoute permission="employees" />
              }
            >
              <Route
                path="/employees"
                element={<h1>Employees</h1>}
              />
            </Route>


            {/* Expenses */}
            <Route
              element={
                <PermissionRoute permission="expenses" />
              }
            >
              <Route
                path="/expenses"
                element={<h1>Expenses</h1>}
              />
            </Route>


            {/* Reports */}
            <Route
              element={
                <PermissionRoute permission="reports" />
              }
            >
              <Route
                path="/reports"
                element={<h1>Reports</h1>}
              />
            </Route>

          </Route>


          {/* =================================================
              POS / WAITER
              Shared workspace
          ================================================= */}

          <Route
            element={
              <PermissionRoute permission="pos" />
            }
          >

            <Route element={<POSLayout />}>

              {/* POS */}
              <Route
                path="/pos"
                element={<POSPage />}
              />

              {/* POS Reports */}
              <Route
                path="/pos/reports"
                element={<POSReportsPage />}
              />

            </Route>

          </Route>


          {/* =================================================
              CHEF / KITCHEN
          ================================================= */}

          <Route
            element={
              <PermissionRoute permission="kitchen" />
            }
          >

            <Route element={<KitchenLayout />}>

              {/* Kitchen Dashboard */}
              <Route
                path="/kitchen"
                element={<KitchenPage />}
              />

              {/* New Orders */}
              <Route
                path="/kitchen/new"
                element={<h1>New Kitchen Orders</h1>}
              />

              {/* Preparing */}
              <Route
                path="/kitchen/preparing"
                element={<h1>Preparing Orders</h1>}
              />

              {/* Ready */}
              <Route
                path="/kitchen/ready"
                element={<h1>Ready Orders</h1>}
              />

              {/* History */}
              <Route
                path="/kitchen/history"
                element={<h1>Order History</h1>}
              />

              {/* Reports */}
              <Route
                path="/kitchen/reports"
                element={<h1>Kitchen Reports</h1>}
              />

            </Route>

          </Route>


          {/* =================================================
              BARTENDER / BAR
          ================================================= */}

          <Route
            element={
              <PermissionRoute permission="bar" />
            }
          >

            <Route element={<BarLayout />}>

              {/* Bar Dashboard */}
              <Route
                path="/bar"
                element={<BarPage />}
              />

              {/* New Drink Orders */}
              <Route
                path="/bar/new"
                element={<h1>New Drink Orders</h1>}
              />

              {/* Preparing */}
              <Route
                path="/bar/preparing"
                element={<h1>Preparing Drinks</h1>}
              />

              {/* Ready */}
              <Route
                path="/bar/ready"
                element={<h1>Ready Drinks</h1>}
              />

              {/* Reports */}
              <Route
                path="/bar/reports"
                element={<h1>Bar Reports</h1>}
              />

            </Route>

          </Route>

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;