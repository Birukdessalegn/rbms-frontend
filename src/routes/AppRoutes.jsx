import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PermissionRoute from "./PermissionRoute";
import RoleRedirect from "./RoleRedirect";
import PurchasingPage from "../modules/purchasing/pages/PurchasingPage";
import PaymentPage from "../modules/pos/pages/PaymentPage";
import TablesPage from "../modules/pos/components/TablesPage";
import ProductsPage from "../modules/products/ProductsPage";  
import VipCustomersPage from "../modules/customers/VipCustomersPage";
import WaiterServedOrdersPage from "../modules/pos/pages/WaiterServedOrdersPage";


import ExpensesPage from "../modules/expense/pages/ExpensesPage";

import EmployeesPage from "../modules/employees/pages/EmployeesPage";
import BarReportsPage from "../modules/bar/pages/BarReportsPage";
import FinanceReportsPage from "../modules/finance/pages/FinanceReportsPage";
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
import AdminDashboardPage from "../modules/dashboard/pages/AdminDashboardPage";
import { useAuth } from "../context/AuthContext";

function DashboardRoleSwitch() {
  const { user } = useAuth();
  const normalizedRole = user?.role ? String(user.role).toUpperCase() : "";

  if (normalizedRole === "ADMIN") {
    return <AdminDashboardPage />;
  }
  return <DashboardPage />;
}

import KitchenPage from "../modules/kitchen/pages/KitchenPage";
import KitchenLiveAssetsPage from "../modules/kitchen/pages/KitchenLiveAssetsPage";
import KitchenReportsPage from "../modules/kitchen/pages/KitchenReportsPage";

import POSPage from "../modules/pos/pages/POSPage";
import POSReportsPage from "../modules/pos/pages/POSReportsPage";
import MasterReportsPage from "../modules/reports/pages/MasterReportsPage";
import PurchasingReportsPage from "../modules/purchasing/pages/PurchasingReportsPage";
import TodaySalesAuditPage from "../modules/pos/pages/TodaySalesAuditPage";

import BarPage from "../modules/bar/pages/BarPage";

import InventoryPage from "../modules/inventory/pages/InventoryPage";
import InventoryStockPage from "../modules/inventory/pages/InventoryStockPage";
import InventoryLowStockPage from "../modules/inventory/pages/InventoryLowStockPage";
import InventoryTransactionsPage from "../modules/inventory/pages/InventoryTransactionsPage";
import InventoryReportsPage from "../modules/inventory/pages/InventoryReportsPage";
import CashierReconciliationPage from "../modules/finance/pages/CashierReconciliationPage";


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
                element={<DashboardRoleSwitch />}
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
                path="/pos/sales-audit"
                element={<TodaySalesAuditPage />}
              />
              <Route
                path="/pos/tables"
                element={<TablesPage />}
              />

              <Route
                path="/pos/served-orders"
                element={<WaiterServedOrdersPage />}
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
                path="/kitchen/assets"
                element={<KitchenLiveAssetsPage />}
              />

              <Route
                path="/kitchen/inventory"
                element={<KitchenLiveAssetsPage />}
              />

              <Route
                path="/kitchen/new"
                element={<KitchenPage />}
              />

              <Route
                path="/kitchen/preparing"
                element={<KitchenPage />}
              />

              <Route
                path="/kitchen/ready"
                element={<KitchenPage />}
              />

              <Route
                path="/kitchen/history"
                element={<KitchenReportsPage />}
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
                    element={<BarPage />}
                />

                <Route
                    path="/bar/preparing"
                    element={<BarPage />}
                />

                <Route
                    path="/bar/ready"
                    element={<BarPage />}
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
                CUSTOMERS & VIP LEDGER
            -------------------------- */}

            <Route
              element={
                <PermissionRoute permission="customers" />
              }
            >
              <Route
                path="/customers"
                element={<VipCustomersPage />}
              />
              <Route
                path="/admin/vip-customers"
                element={<VipCustomersPage />}
              />
            </Route>





            {/* -------------------------
                PURCHASING
            -------------------------- */}

          <Route
              path="/purchasing"
              element={<PurchasingPage />}
            />
            <Route
              path="/purchasing/reports"
              element={<PurchasingReportsPage />}
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
              <Route path="/reports" element={<MasterReportsPage />} />
            </Route>

            {/* -------------------------
                FINANCE
            -------------------------- */}
            <Route
              element={
                <PermissionRoute permission="finance" />
              }
            >
              <Route
                path="/finance"
                element={<CashierReconciliationPage />}
              />
              <Route
                path="/finance/cashier-reconciliation"
                element={<CashierReconciliationPage />}
              />
              <Route
                path="/finance/sales"
                element={<h1>Sales</h1>}
              />
              <Route
                path="/finance/expenses"
                element={<ExpensesPage />}
              />
              <Route
                path="/finance/purchases"
                element={<PurchasingPage />}
              />
              <Route
                path="/finance/payments"
                element={<PaymentPage />}
              />
              <Route
                path="/finance/transactions"
                element={<CashierReconciliationPage />}
              />
              <Route
                path="/finance/reports"
                element={<FinanceReportsPage />}
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

              <Route path="/chef/kitchen/reports" element={<KitchenReportsPage />} />

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
                element={<BarPage />}
              />

              <Route
                path="/bartender/bar/preparing"
                element={<BarPage />}
              />

              <Route
                path="/bartender/bar/ready"
                element={<BarPage />}
              />

              <Route
                path="/bartender/bar/reports"
                element={<BarReportsPage />}
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

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default AppRoutes;