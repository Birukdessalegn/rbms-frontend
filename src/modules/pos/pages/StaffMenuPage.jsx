import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import {
  Utensils,
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  AlertCircle,
  User,
  Clock,
  Receipt,
  Sparkles,
  RefreshCw,
  Users,
  X,
  CheckCircle2,
  Loader2,
  DollarSign,
  Coffee,
  Wine,
  ArrowDown
} from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";

function StaffMenuPage() {
  const { user } = useAuth();

  const userRole = (user?.role || "").toLowerCase();
  const userRoleId = Number(user?.roleId || user?.role_id || user?.role?.id || 0);
  const isCashier = userRole === "cashier" || userRoleId === 5;
  const isAdminOrManager = ["admin", "superadmin", "manager"].includes(userRole) || userRoleId === 1 || userRoleId === 2;
  const canAccessStaffMenu = isCashier || isAdminOrManager;

  // Waiters and other non-cashier staff cannot access the Staff Menu
  if (!canAccessStaffMenu) {
    return <Navigate to="/pos" replace />;
  }

  const [activeTab, setActiveTab] = useState("order"); // 'order' | 'history'
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchProduct, setSearchProduct] = useState("");

  // Cart for staff order
  const [cartItems, setCartItems] = useState([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashTendered, setCashTendered] = useState("");
  const [paymentTiming, setPaymentTiming] = useState("pay_now"); // 'pay_now' | 'pay_later'

  // Mark as Paid modal state
  const [payingOrder, setPayingOrder] = useState(null);
  const [markPaidMethod, setMarkPaidMethod] = useState("cash");
  const [markingPaid, setMarkingPaid] = useState(false);

  // States
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // History state
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 1. Fetch Employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api("/employees");
        const list = res.employees || res.data || (Array.isArray(res) ? res : []);
        setEmployees(list.filter((e) => e.status !== "inactive" && e.is_active !== false));
      } catch (err) {
        console.warn("Failed to load employees:", err);
      }
    };
    fetchEmployees();
  }, []);

  // 2. Fetch Products
  const loadMenuProducts = async () => {
    try {
      setLoadingMenu(true);
      const [prodRes, catRes] = await Promise.all([
        api("/products").catch(() => ({ products: [] })),
        api("/products/categories").catch(() => ({ categories: [] })),
      ]);

      const allProds = prodRes.products || (Array.isArray(prodRes) ? prodRes : []);
      const allCats = catRes.categories || (Array.isArray(catRes) ? catRes : []);

      // Filter products: ONLY show items allowed for staff (menu_type === 'employee' or 'both')
      const staffAllowed = allProds.filter((p) => {
        const mt = (p.menu_type || "both").toLowerCase();
        return (mt === "employee" || mt === "both") && p.status !== "inactive";
      });

      setProducts(staffAllowed);
      setCategories(allCats);
    } catch (err) {
      console.error("Failed to load staff menu products:", err);
      setErrorMessage("Failed to load menu items.");
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    loadMenuProducts();
  }, []);

  // 3. Fetch Staff Orders History
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api("/pos/staff-orders/today");
      setHistoryOrders(res.orders || []);
    } catch (err) {
      console.warn("Failed to load today staff orders history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase().trim();
    return employees.filter(
      (e) =>
        `${e.first_name || ""} ${e.last_name || ""}`.toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q) ||
        (e.role_name || e.role || "").toLowerCase().includes(q) ||
        String(e.employee_code || e.id).toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  // Filtered staff products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchProduct.trim() ||
        p.name?.toLowerCase().includes(searchProduct.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(searchProduct.toLowerCase());

      // Global search: when user types in search bar, search across the WHOLE catalog
      if (searchProduct.trim()) {
        return matchesSearch;
      }

      const selCat = String(activeCategory || "all").toLowerCase().trim();
      const pCatId = String(p.category_id || p.categoryId || "");
      const pCatName = String(p.category_name || p.category || "").toLowerCase();
      const pCatType = String(p.category_type || p.categoryType || "").toLowerCase();

      const matchesCat =
        selCat === "all" ||
        pCatId === selCat ||
        pCatName === selCat ||
        (selCat === "food" && (pCatType === "food" || pCatName.includes("food") || pCatName.includes("kitchen"))) ||
        (selCat === "drinks" && (pCatType === "beverage" || pCatType === "bar" || pCatName.includes("drink")));

      return matchesCat;
    });
  }, [products, activeCategory, searchProduct]);

  // Cart operations
  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const staffPrice = Number(product.staff_price !== null && product.staff_price !== undefined ? product.staff_price : 0);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, staffPrice }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Compute Cart Totals
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.staffPrice * item.quantity, 0);
  }, [cartItems]);

  const clearCart = () => setCartItems([]);

  const totalCartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const isFreeMeal = cartSubtotal === 0;

  // Submit Staff Order (with Pay Now vs Pay Later options)
  const handlePlaceStaffOrder = async (isPaidNow = true) => {
    if (!selectedEmployee) {
      setErrorMessage("Please select the staff member receiving this meal first.");
      return;
    }
    if (cartItems.length === 0) {
      setErrorMessage("Please select at least one menu item for the staff meal.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const shouldBePaid = isFreeMeal ? true : isPaidNow;

      const payload = {
        employeeId: selectedEmployee.id,
        employeeName: `${selectedEmployee.first_name || ""} ${selectedEmployee.last_name || ""}`.trim() + (selectedEmployee.department ? ` (${selectedEmployee.department})` : ""),
        items: cartItems.map((ci) => ({
          productId: ci.product.id,
          name: ci.product.name,
          quantity: ci.quantity,
          price: ci.staffPrice,
        })),
        paymentStatus: shouldBePaid ? "paid" : "pending",
        paymentMethod: isFreeMeal ? "free" : paymentMethod,
        amountPaid: shouldBePaid ? cartSubtotal : 0,
        notes: orderNotes.trim() || undefined,
      };

      const res = await api("/pos/staff-orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const orderNumber = res.order?.order_number || "SO-New";
      const statusLabel = shouldBePaid ? "PAID" : "PAYMENT PENDING / UNPAID";
      setSuccessMessage(
        `Staff meal #${orderNumber} placed for ${selectedEmployee.first_name} (${statusLabel})! Tickets sent to kitchen/bar.`
      );

      // Reset cart
      setCartItems([]);
      setOrderNotes("");
      setCashTendered("");
      setSelectedEmployee(null);

      // Refresh history if user toggles to it
      loadHistory();
    } catch (err) {
      setErrorMessage(err.message || "Failed to submit staff meal order.");
    } finally {
      setSubmitting(false);
    }
  };

  // Mark an existing unpaid staff order as Paid
  const handleMarkOrderPaid = async () => {
    if (!payingOrder) return;
    try {
      setMarkingPaid(true);
      await api(`/pos/orders/${payingOrder.id}/payment`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payingOrder.total || 0),
          paymentMethod: markPaidMethod,
          status: "paid",
          notes: `Staff meal settled by ${payingOrder.employee_name || "Employee"}`,
        }),
      });

      setPayingOrder(null);
      setSuccessMessage(`Order #${payingOrder.order_number} marked as PAID successfully!`);
      loadHistory();
    } catch (err) {
      alert(err.message || "Failed to record payment for staff order.");
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <div className="space-y-5 p-3 sm:p-4 md:p-6 pb-28 lg:pb-6 max-w-7xl mx-auto">
      
      {/* TOP HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20 font-black shrink-0">
            <Utensils className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Staff Menu & Employee Meals
              </h1>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                Cashier Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Order staff meals, grant employee allowances, or accept subsidized Birr payments.
            </p>
          </div>
        </div>

        {/* TABS (Responsive full-width on mobile phones) */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("order")}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs ${
              activeTab === "order"
                ? "bg-purple-600 text-white shadow-purple-600/20"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Utensils className="h-4 w-4" />
            <span>Order Staff Meal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              loadHistory();
            }}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs ${
              activeTab === "history"
                ? "bg-purple-600 text-white shadow-purple-600/20"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Today's Orders ({historyOrders.length})</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs font-bold text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-700 hover:text-emerald-900 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between rounded-2xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-xs font-bold text-rose-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-rose-700 hover:text-rose-900 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TAB 1: ORDERING INTERFACE */}
      {activeTab === "order" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT COLUMN: STAFF SELECTOR + MENU CATALOG (8 cols on lg) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            
            {/* STEP 1: EMPLOYEE PICKER CARD */}
            <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Step 1: Select Staff Member
                  </span>
                </div>
                {selectedEmployee && (
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(null)}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Change Employee
                  </button>
                )}
              </div>

              {selectedEmployee ? (
                <div className="flex items-center justify-between rounded-xl bg-purple-50/80 border border-purple-200/80 p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white font-bold text-sm shadow-xs shrink-0">
                      {(selectedEmployee.first_name || "S")[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900 truncate">
                        {selectedEmployee.first_name} {selectedEmployee.last_name || ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-purple-700">
                          {selectedEmployee.department || "Staff"}
                        </span>
                        <span>•</span>
                        <span>{selectedEmployee.role_name || selectedEmployee.role || "Employee"}</span>
                        {selectedEmployee.employee_code && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-400">ID: {selectedEmployee.employee_code}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold shrink-0 ml-2">
                    <Check className="h-3.5 w-3.5" /> Selected
                  </span>
                </div>
              ) : (
                <div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search employee by name, department, or ID..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-8 text-xs font-medium outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition"
                    />
                    {employeeSearch.trim() && (
                      <button
                        type="button"
                        onClick={() => setEmployeeSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}

                    {/* Floating Dropdown for Employee Search */}
                    {employeeSearch.trim() && (
                      <div className="absolute left-0 top-full mt-1.5 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl z-50 p-1 divide-y divide-slate-100">
                        {filteredEmployees.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">No active staff members found</div>
                        ) : (
                          filteredEmployees.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setEmployeeSearch("");
                              }}
                              className="w-full flex items-center justify-between p-2.5 text-left hover:bg-purple-50 rounded-lg transition group cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-xs font-bold shrink-0 group-hover:bg-purple-600 group-hover:text-white transition">
                                  {(emp.first_name || "E")[0]}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition">
                                    {emp.first_name} {emp.last_name || ""}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {emp.department || "Staff"} • {emp.role_name || emp.role || "Employee"}
                                  </div>
                                </div>
                              </div>
                              {emp.employee_code && (
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                                  ID: {emp.employee_code}
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Employees Quick Select List */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {filteredEmployees.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No active staff members found.</p>
                    ) : (
                      filteredEmployees.slice(0, 12).map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmployeeSearch("");
                          }}
                          className="shrink-0 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-purple-500 hover:bg-purple-50/40 active:scale-95 transition shadow-2xs"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
                            {(emp.first_name || "E")[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 whitespace-nowrap">
                              {emp.first_name} {emp.last_name || ""}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-none mt-0.5 whitespace-nowrap">
                              {emp.department || "Staff"}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: STAFF MENU ITEMS SECTION */}
            <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
              
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Step 2: Choose Staff Menu Items
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {filteredProducts.length} items
                  </span>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff item..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-7 text-xs outline-none focus:border-purple-500 focus:bg-white"
                  />
                  {searchProduct.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearchProduct("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}

                  {/* Floating Dropdown for Staff Menu Items */}
                  {searchProduct.trim() && (
                    <div className="absolute left-0 top-full mt-1.5 w-full sm:w-80 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl z-50 p-1 divide-y divide-slate-100">
                      {filteredProducts.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">No matching staff items found</div>
                      ) : (
                        filteredProducts.map((prod) => {
                          const sPrice = Number(prod.staff_price !== null && prod.staff_price !== undefined ? prod.staff_price : 0);
                          const isFree = sPrice === 0;
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => {
                                addToCart(prod);
                                setSearchProduct("");
                              }}
                              className="w-full flex items-center justify-between p-2.5 text-left hover:bg-purple-50 rounded-lg transition group cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-bold text-slate-800 group-hover:text-purple-700 truncate transition">
                                  {prod.name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {prod.category_name || "Staff Meal"}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                                  isFree
                                    ? "bg-emerald-100 text-emerald-800 font-black"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {isFree ? "FREE" : `${sPrice.toLocaleString()} ETB`}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 ${
                    activeCategory === "all"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Items
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("food")}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 ${
                    activeCategory === "food"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Kitchen Food
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("drinks")}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 ${
                    activeCategory === "drinks"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Drinks
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCategory(String(c.id))}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 ${
                      activeCategory === String(c.id)
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {loadingMenu ? (
                  <div className="col-span-full py-20 text-center text-xs text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600 mb-2" />
                    Loading staff menu items...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-xs text-slate-400">
                    No staff menu items found.<br />
                    Only products set to "Staff" or "Both" appear here.
                  </div>
                ) : (
                  filteredProducts.map((prod) => {
                    const staffPrice = Number(prod.staff_price !== null && prod.staff_price !== undefined ? prod.staff_price : 0);
                    const custPrice = Number(prod.price || 0);
                    const isFree = staffPrice === 0;
                    const inCart = cartItems.find((ci) => ci.product.id === prod.id);

                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => addToCart(prod)}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left shadow-2xs active:scale-98 transition ${
                          inCart
                            ? "border-purple-400 bg-purple-50/40"
                            : "border-slate-200 bg-white hover:border-purple-400 hover:shadow-md hover:bg-purple-50/20"
                        }`}
                      >
                        {inCart && (
                          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-black shadow-xs">
                            {inCart.quantity}
                          </span>
                        )}

                        <div>
                          <p className="line-clamp-2 text-xs font-extrabold text-slate-900 group-hover:text-purple-700">
                            {prod.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {prod.category_name || "Staff Meal"}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                          <div>
                            {isFree ? (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-800">
                                FREE
                              </span>
                            ) : (
                              <div>
                                <span className="text-xs font-black text-purple-700">
                                  {staffPrice.toLocaleString()} <span className="text-[9px] font-semibold text-slate-400">ETB</span>
                                </span>
                                {custPrice > staffPrice && (
                                  <span className="block text-[9px] text-slate-400 line-through">
                                    Cust: {custPrice.toLocaleString()} ETB
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition shadow-2xs">
                            <Plus className="h-4 w-4" />
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: STAFF MEAL TICKET (Sticky on desktop, smoothly scrolled to on mobile) */}
          <div
            id="staff-meal-ticket"
            className="lg:col-span-5 xl:col-span-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs lg:sticky lg:top-4 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-600" />
                <h2 className="text-sm font-black text-slate-800">Staff Meal Ticket</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                  {cartItems.length} item{cartItems.length === 1 ? "" : "s"}
                </span>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Recipient Badge */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recipient Staff Member</p>
              {selectedEmployee ? (
                <p className="text-xs font-black text-purple-800 mt-0.5">
                  {selectedEmployee.first_name} {selectedEmployee.last_name || ""} ({selectedEmployee.department || "Staff"})
                </p>
              ) : (
                <p className="text-xs font-semibold text-rose-500 mt-0.5 flex items-center gap-1">
                  <span>⚠️ Please select a staff member in Step 1 above</span>
                </p>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1">
              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <Utensils className="h-8 w-8 mx-auto text-slate-300 mb-2 opacity-60" />
                  Your staff ticket is empty.<br />Click items from the catalog above to add.
                </div>
              ) : (
                cartItems.map((ci) => {
                  const lineTotal = ci.staffPrice * ci.quantity;

                  return (
                    <div key={ci.product.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate" title={ci.product.name}>
                          {ci.product.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {ci.staffPrice === 0 ? (
                            <span className="text-emerald-700 font-bold">Free Meal</span>
                          ) : (
                            `${ci.staffPrice.toFixed(2)} ETB × ${ci.quantity} = ${lineTotal.toFixed(2)} ETB`
                          )}
                        </p>
                      </div>

                      {/* Quantity buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(ci.product.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-black text-slate-800">
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(ci.product.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(ci.product.id)}
                          className="ml-1 p-1 text-slate-300 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Notes Input */}
            <div>
              <input
                type="text"
                placeholder="Optional ticket notes (e.g. Less spicy, Takeaway)..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-purple-500 focus:bg-white"
              />
            </div>

            {/* Order Total & Payment Summary */}
            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Staff Bill Total:</span>
                <span className="text-base font-black text-slate-900">
                  {cartSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} ETB
                </span>
              </div>

              {isFreeMeal ? (
                <div className="mt-2.5 rounded-xl bg-emerald-100/70 border border-emerald-300 px-3 py-1.5 text-center text-xs font-black text-emerald-800">
                  🎁 Free Staff Meal Allowance (0.00 ETB)
                </div>
              ) : (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Payment Method:</span>
                    <span className="font-bold text-purple-700 uppercase">Cash Birr</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        placeholder="Birr Received..."
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-3 text-xs font-bold text-slate-900 outline-none focus:border-purple-500"
                      />
                    </div>
                    {Number(cashTendered) > cartSubtotal && (
                      <span className="text-xs font-bold text-emerald-700 shrink-0">
                        Change: {(Number(cashTendered) - cartSubtotal).toFixed(2)} ETB
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Action Buttons */}
            {isFreeMeal ? (
              <button
                type="button"
                disabled={submitting || cartItems.length === 0 || !selectedEmployee}
                onClick={() => handlePlaceStaffOrder(true)}
                className="w-full rounded-2xl py-3 text-xs font-black shadow-md active:scale-95 transition flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting Staff Order...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirm Free Staff Meal & Dispatch</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2 pt-1">
                {/* 1. Pay Now & Dispatch */}
                <button
                  type="button"
                  disabled={submitting || cartItems.length === 0 || !selectedEmployee}
                  onClick={() => handlePlaceStaffOrder(true)}
                  className="w-full rounded-2xl py-3 text-xs font-black shadow-md active:scale-95 transition flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Collect {cartSubtotal.toFixed(2)} ETB & Mark Paid</span>
                    </>
                  )}
                </button>

                {/* 2. Order Unpaid & Pay Later */}
                <button
                  type="button"
                  disabled={submitting || cartItems.length === 0 || !selectedEmployee}
                  onClick={() => handlePlaceStaffOrder(false)}
                  className="w-full rounded-2xl py-2.5 text-xs font-black border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  title="Employee hasn't paid yet. Dispatch order as Payment Pending."
                >
                  <Clock className="h-4 w-4 text-amber-700" />
                  <span>Order First (Unpaid / Pay Later) & Dispatch</span>
                </button>
              </div>
            )}

          </div>

        </div>
      )}

      {/* TAB 2: TODAY'S STAFF ORDERS AUDIT & HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          
          {/* Metrics & Header */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">Today's Staff Meal Orders</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete log of employee meals served today with cashier auditing.
                </p>
              </div>

              <button
                type="button"
                onClick={loadHistory}
                disabled={loadingHistory}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition self-start sm:self-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                <span>Refresh Log</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-2xl bg-purple-50/80 border border-purple-200/60 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Total Staff Meals Today</p>
                <p className="text-xl font-black text-purple-900 mt-0.5">{historyOrders.length}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/60 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Free Staff Allowances</p>
                <p className="text-xl font-black text-emerald-900 mt-0.5">
                  {historyOrders.filter((o) => Number(o.total || 0) === 0 || o.payment_status === "free").length}
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50/80 border border-blue-200/60 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Subsidized Birr Collected</p>
                <p className="text-xl font-black text-blue-900 mt-0.5">
                  {historyOrders
                    .filter((o) => o.payment_status === "paid")
                    .reduce((sum, o) => sum + Number(o.total || 0), 0)
                    .toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-semibold text-blue-700">ETB</span>
                </p>
              </div>
            </div>
          </div>

          {/* History Orders List */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs p-4 sm:p-5">
            {loadingHistory ? (
              <div className="py-20 text-center text-xs text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600 mb-2" />
                Loading staff meal orders...
              </div>
            ) : historyOrders.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No staff meals recorded today yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historyOrders.map((ord) => {
                  const totalAmt = Number(ord.total || 0);
                  const isFree = totalAmt === 0 || ord.payment_status === "free";
                  const isPaid = isFree || ord.payment_status === "paid";
                  const itemsList = Array.isArray(ord.items) ? ord.items : [];

                  return (
                    <div key={ord.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-purple-700">
                            #{ord.order_number}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {ord.employee_name ? `${ord.employee_name}` : (ord.notes || "Staff Meal")}
                          </span>
                          {isFree ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-800">
                              Free Allowance
                            </span>
                          ) : isPaid ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              PAID
                            </span>
                          ) : (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                              <Clock className="h-3 w-3" />
                              UNPAID / PENDING
                            </span>
                          )}
                        </div>

                        {/* Items Summary */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                          {itemsList.map((it, idx) => (
                            <span key={it.id || idx} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {it.quantity}x {it.product_name}
                            </span>
                          ))}
                        </div>

                        <p className="text-[10px] text-slate-400 mt-1">
                          Recorded at {new Date(ord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {ord.cashier_name && ` by Cashier: ${ord.cashier_name}`}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                        <div className="text-left sm:text-right">
                          <span className="text-sm font-black text-slate-900 block">
                            {totalAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} ETB
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">
                            ✓ Dispatched
                          </span>
                        </div>

                        {/* Mark as Paid button for unpaid staff orders */}
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => setPayingOrder(ord)}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 shadow-sm active:scale-95 transition flex items-center gap-1.5"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Mark as Paid</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* FLOATING MOBILE CART SUMMARY PILL (Mobile only) */}
      {activeTab === "order" && cartItems.length > 0 && (
        <div className="fixed bottom-4 inset-x-3 z-40 lg:hidden animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/95 backdrop-blur-sm text-white p-3.5 shadow-2xl border border-slate-800">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Receipt className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>{totalCartCount} item{totalCartCount === 1 ? "" : "s"} in Ticket</span>
              </div>
              <div className="text-sm font-black text-white">
                {isFreeMeal ? "FREE Staff Meal" : `${cartSubtotal.toFixed(2)} ETB`}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("staff-meal-ticket");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 px-3.5 py-2 text-xs font-black text-white shadow-md transition shrink-0"
            >
              <span>View Ticket</span>
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MARK AS PAID MODAL */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">Mark Staff Meal as Paid</h3>
                <p className="text-xs text-slate-500 font-mono">Order #{payingOrder.order_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              <div className="rounded-2xl bg-purple-50 p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900">Amount Due:</span>
                <span className="text-base font-black text-purple-950">
                  {Number(payingOrder.total || 0).toFixed(2)} ETB
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Method Received
                </label>
                <select
                  value={markPaidMethod}
                  onChange={(e) => setMarkPaidMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                >
                  <option value="cash">Cash (Birr)</option>
                  <option value="telebirr">Telebirr</option>
                  <option value="cbe_birr">CBE Birr</option>
                  <option value="card">Card / POS</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                disabled={markingPaid}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkOrderPaid}
                disabled={markingPaid}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-black text-white shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                {markingPaid ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm Paid</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default StaffMenuPage;
