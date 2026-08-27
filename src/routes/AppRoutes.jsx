import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PermissionRoute from "./PermissionRoute";
import RoleRedirect from "./RoleRedirect";
import PurchasingPage from "../modules/purchasing/pages/PurchasingPage";
import PaymentPage from "../modules/pos/pages/PaymentPage";
import TablesPage from "../modules/pos/components/TablesPage";
import ProductsPage from "../modules/products/ProductsPage";  


import ExpensesPage from "../modules/expense/pages/ExpensesPage";

import EmployeesPage from "../modules/employees/pages/EmployeesPage";
import BarReportsPage from "../modules/bar/pages/BarReportsPage";
import AttendancePage from "../modules/employees/pages/AttendancePage";

import LoginPage from "../modules/auth/pages/LoginPage";

// Layouts
import DashboardLayout from "../layouts/DashboardLayout";
import KitchenLayout from "../layouts/KitchenLayout";
import POSLayout from "../layouts/POSLayout";
import BarLayout from "../layouts/BarLayout";
import InventoryLayout from "../layouts/InventoryLayout";
import FinanceLayout from "../layouts/FinanceLayout";

// Pages
import DashboardPage from "../modules/dashboard/pages/DashboardPage";

import KitchenPage from "../modules/kitchen/pages/KitchenPage";
import KitchenReportsPage from "../modules/kitchen/pages/KitchenReportsPage";

import POSPage from "../modules/pos/pages/POSPage";
import POSReportsPage from "../modules/pos/pages/POSReportsPage";

import BarPage from "../modules/bar/pages/BarPage";

import InventoryPage from "../modules/inventory/pages/InventoryPage";
import InventoryStockPage from "../modules/inventory/pages/InventoryStockPage";
import InventoryLowStockPage from "../modules/inventory/pages/InventoryLowStockPage";
import InventoryTransactionsPage from "../modules/inventory/pages/InventoryTransactionsPage";
import InventoryReportsPage from "../modules/inventory/pages/InventoryReportsPage";


function AppRoutes() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =====================================================
            PUBLIC
        ====================================================== */}

        <Route
          path="/login"
          element={<LoginPage />}
        />


        {/* =====================================================
            PROTECTED
        ====================================================== */}

        <Route element={<ProtectedRoute />}>

          {/* ROOT */}

          <Route
            path="/"
            element={<RoleRedirect />}
          />


          


          {/* =================================================
              ADMIN / MANAGER MAIN LAYOUT

              IMPORTANT:
              Everything here stays INSIDE DashboardLayout.

              Therefore clicking POS/Kitchen/Bar/Inventory
              changes only the BODY.

              The main sidebar stays visible.
          ================================================= */}

          <Route element={<DashboardLayout />}>

            {/* -------------------------
                MAIN DASHBOARD
            -------------------------- */}

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



            {/* -------------------------
                POS
            -------------------------- */}

            <Route
              element={
                <PermissionRoute permission="pos" />
              }
            >
              <Route
                path="/pos"
                element={<POSPage />}
              />
              <Route
                path="/pos/tables"
                element={<TablesPage />}
              />

              <Route
                path="/pos/reports"
                element={<POSReportsPage />}
              />
              <Route
                path="/tables"
                element={<TablesPage />}
              />
            </Route>



            {/* -------------------------
                KITCHEN
            -------------------------- */}

            <Route
              element={
                <PermissionRoute permission="kitchen" />
              }
            >
              <Route
                path="/kitchen"
                element={<KitchenPage />}
              />

              <Route
                path="/kitchen/new"
                element={<h1>New Kitchen Orders</h1>}
              />

              <Route
                path="/kitchen/preparing"
                element={<h1>Preparing Orders</h1>}
              />

              <Route
                path="/kitchen/ready"
                element={<h1>Ready Orders</h1>}
              />

              <Route
                path="/kitchen/history"
                element={<h1>Order History</h1>}
              />

              <Route
                path="/kitchen/reports"
                element={<KitchenReportsPage />}
              />
            </Route>


            {/* -------------------------
                BAR
            -------------------------- */}

            <Route element={
                <PermissionRoute permission="bar" />
            }
            >
                <Route
                    path="/bar"
                    element={<BarPage />}
                />

                <Route
                    path="/bar/new"
                    element={<h1>New Drink Orders</h1>}
                />

                <Route
                    path="/bar/preparing"
                    element={<h1>Preparing Drinks</h1>}
                />

                <Route
                    path="/bar/ready"
                    element={<h1>Ready Drinks</h1>}
                />

                <Route
                    path="/bar/reports"
                    element={<BarReportsPage />}
                />
            </Route>


            {/* -------------------------
                INVENTORY
            -------------------------- */}

            <Route
              element={
                <PermissionRoute permission="inventory" />
              }
            >
              <Route
                path="/inventory"
                element={<InventoryPage />}
              />

              <Route
                path="/inventory/stock"
                element={<InventoryStockPage />}
              />

              <Route
                path="/inventory/low-stock"
                element={<InventoryLowStockPage />}
              />

              <Route
                path="/inventory/transactions"
                element={<InventoryTransactionsPage />}
              />

              <Route
                path="/inventory/reports"
                element={<InventoryReportsPage />}
              />
            </Route>


            {/* -------------------------
                PRODUCTS
            -------------------------- */}

            <Route
                element={
                    <PermissionRoute permission="products" />
                }
            >
              <Route
                path="/products"
                element={<ProductsPage />}
            />
            </Route>


            {/* -------------------------
                CUSTOMERS
            -------------------------- */}

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


            {/* -------------------------
                RESERVATIONS
            -------------------------- */}

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


            {/* -------------------------
                PURCHASING
            -------------------------- */}

          <Route
              path="/purchasing"
              element={<PurchasingPage />}
            />


            {/* -------------------------
                EMPLOYEES
            -------------------------- */}

            <Route
              path="/employees"
              element={<EmployeesPage />}
            />

            <Route
              path="/employees/attendance"
              element={<AttendancePage />}
            />


            {/* -------------------------
                EXPENSES
            -------------------------- */}

            <Route
  element={
    <PermissionRoute permission="expenses" />
  }
>
  <Route
    path="/expenses"
    element={<ExpensesPage />}
  />
</Route>


            {/* -------------------------
                REPORTS
            -------------------------- */}

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
              CHEF ONLY

              Chef gets KitchenLayout.
              Admin/Manager DO NOT use this.
          ================================================= */}

          <Route
            element={
              <PermissionRoute permission="kitchen" />
            }
          >
            <Route element={<KitchenLayout />}>

              <Route
                path="/chef/kitchen"
                element={<KitchenPage />}
              />

              <Route
                path="/chef/kitchen/new"
                element={<h1>New Kitchen Orders</h1>}
              />

              <Route
                path="/chef/kitchen/preparing"
                element={<h1>Preparing Orders</h1>}
              />

              <Route
                path="/chef/kitchen/ready"
                element={<h1>Ready Orders</h1>}
              />

              <Route
                path="/chef/kitchen/history"
                element={<h1>Order History</h1>}
              />

              <Route
                path="/chef/kitchen/reports"
                element={<h1>Kitchen Reports</h1>}
              />

            </Route>
          </Route>


          {/* =================================================
              WAITER / CASHIER ONLY
          ================================================= */}

          <Route
            element={
              <PermissionRoute permission="pos" />
            }
          >
            <Route element={<POSLayout />}>

              <Route
                path="/cashier/pos"
                element={<POSPage />}
              />

              <Route
                path="/cashier/pos/reports"
                element={<POSReportsPage />}
              />

            </Route>
          </Route>


          {/* =================================================
              BARTENDER ONLY
          ================================================= */}

          <Route
            element={
              <PermissionRoute permission="bar" />
            }
          >
            <Route element={<BarLayout />}>

              <Route
                path="/bartender/bar"
                element={<BarPage />}
              />

              <Route
                path="/bartender/bar/new"
                element={<h1>New Drink Orders</h1>}
              />

              <Route
                path="/bartender/bar/preparing"
                element={<h1>Preparing Drinks</h1>}
              />

              <Route
                path="/bartender/bar/ready"
                element={<h1>Ready Drinks</h1>}
              />

              <Route
                path="/bartender/bar/reports"
                element={<h1>Bar Reports</h1>}
              />

            </Route>
          </Route>


          {/* =================================================
              INVENTORY / STOREKEEPER ONLY
          ================================================= */}

          <Route
            element={
              <PermissionRoute permission="inventory" />
            }
          >
            <Route element={<InventoryLayout />}>

              <Route
                path="/store/inventory"
                element={<InventoryPage />}
              />

              <Route
                path="/store/inventory/stock"
                element={<InventoryStockPage />}
              />

              <Route
                path="/store/inventory/low-stock"
                element={<InventoryLowStockPage />}
              />

              <Route
                path="/store/inventory/transactions"
                element={<InventoryTransactionsPage />}
              />

              <Route
                path="/store/inventory/reports"
                element={<InventoryReportsPage />}
              />

            </Route>
          </Route>


          {/* =================================================
              FINANCE
          ================================================= */}

          <Route
            element={
              <PermissionRoute permission="finance" />
            }
          >
            <Route element={<FinanceLayout />}>

              <Route
                path="/finance"
                element={<h1>Finance Dashboard</h1>}
              />

              <Route
                path="/finance/sales"
                element={<h1>Sales</h1>}
              />

              <Route
                path="/finance/expenses"
                element={<h1>Expenses</h1>}
              />

              <Route
                path="/finance/purchases"
                element={<h1>Purchases</h1>}
              />

              <Route
                path="/finance/payments"
                element={<h1>Payments</h1>}
              />

              <Route
                path="/finance/transactions"
                element={<h1>Transactions</h1>}
              />

              <Route
                path="/finance/reports"
                element={<h1>Financial Reports</h1>}
              />

            </Route>
          </Route>

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default AppRoutes;