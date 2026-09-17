import { useState, useEffect, useMemo } from "react";
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
  ChefHat,
  Flame,
  Bell
} from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";

function StaffMenuPage() {
  const { user } = useAuth();

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
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashTendered, setCashTendered] = useState("");

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
        console.warn("Could not fetch employees for staff menu:", err);
      }
    };
    fetchEmployees();
  }, []);

  // 2. Fetch Staff Menu Products
  const loadMenuProducts = async () => {
    try {
      setLoadingMenu(true);
      const [pRes, cRes] = await Promise.all([
        api("/products").catch(() => ({ products: [] })),
        api("/products/categories").catch(() => ({ categories: [] })),
      ]);

      const pList = pRes.products || pRes.data || (Array.isArray(pRes) ? pRes : []);
      // Filter out products marked strictly for Customer Only
      // Only keep products where menu_type is 'employee' or 'both'
      const eligibleForStaff = pList.filter((p) => {
        if (p.is_active === false) return false;
        const app = String(p.applicable_for || p.applicableFor || "both").toLowerCase();
        if (app === "inventory") return false;

        const menuType = String(p.menu_type || p.menuType || "both").toLowerCase();
        return menuType === "employee" || menuType === "both";
      });

      setProducts(eligibleForStaff);

      const cList = cRes.categories || cRes.data || (Array.isArray(cRes) ? cRes : []);
      setCategories(cList);
    } catch (err) {
      console.warn("Failed to load staff menu products:", err);
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
      const interval = setInterval(loadHistory, 8000);
      return () => clearInterval(interval);
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

      const matchesSearch =
        !searchProduct.trim() ||
        p.name?.toLowerCase().includes(searchProduct.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(searchProduct.toLowerCase());

      return matchesCat && matchesSearch;
    });
  }, [products, activeCategory, searchProduct]);

  // Cart operations
  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      const staffPrice = Number(product.staff_price !== null && product.staff_price !== undefined ? product.staff_price : 0);
      return [...prev, { product, quantity: 1, staffPrice }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Compute Cart Totals
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.staffPrice * item.quantity, 0);
  }, [cartItems]);

  const isFreeMeal = cartSubtotal === 0;

  // Submit Staff Order
  const handlePlaceStaffOrder = async (e) => {
    if (e) e.preventDefault();
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

      const payload = {
        employeeId: selectedEmployee.id,
        employeeName: `${selectedEmployee.first_name || ""} ${selectedEmployee.last_name || ""}`.trim() + (selectedEmployee.department ? ` (${selectedEmployee.department})` : ""),
        items: cartItems.map((ci) => ({
          productId: ci.product.id,
          name: ci.product.name,
          quantity: ci.quantity,
          price: ci.staffPrice,
        })),
        paymentMethod: isFreeMeal ? "free" : paymentMethod,
        amountPaid: isFreeMeal ? 0 : cartSubtotal,
      };

      const res = await api("/pos/staff-orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const orderNumber = res.order?.order_number || "SO-New";
      setSuccessMessage(
        `Staff meal order #${orderNumber} successfully placed for ${selectedEmployee.first_name}! Kitchen and Bar tickets dispatched.`
      );

      // Reset cart
      setCartItems([]);
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

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col bg-slate-100/70 p-4 md:p-6 overflow-hidden">
      
      {/* TOP HEADER */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md font-black">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
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

        {/* TABS */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("order")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs ${
              activeTab === "order"
                ? "bg-purple-600 text-white shadow-purple-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Utensils className="h-4 w-4" />
            <span>Order Staff Meal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs ${
              activeTab === "history"
                ? "bg-purple-600 text-white shadow-purple-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Today's Staff Orders</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {successMessage && (
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-xs font-bold text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-rose-500/10 border border-rose-500/30 px-4 py-2.5 text-xs font-bold text-rose-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-rose-700 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TAB 1: ORDERING INTERFACE */}
      {activeTab === "order" && (
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
          
          {/* LEFT COLUMN: STAFF SELECTOR + MENU CATALOG (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-3 overflow-hidden">
            
            {/* EMPLOYEE PICKER CARD */}
            <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
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
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    Change Employee
                  </button>
                )}
              </div>

              {selectedEmployee ? (
                <div className="flex items-center justify-between rounded-xl bg-purple-50/80 border border-purple-200/80 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white font-bold text-sm shadow-xs">
                      {(selectedEmployee.first_name || "S")[0]}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {selectedEmployee.first_name} {selectedEmployee.last_name || ""}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
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
                  <span className="flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold">
                    <Check className="h-3.5 w-3.5" /> Selected
                  </span>
                </div>
              ) : (
                <div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search employee by name, department, or ID..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition"
                    />
                  </div>

                  {/* Employees Quick Select Grid */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {filteredEmployees.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No active staff members found.</p>
                    ) : (
                      filteredEmployees.slice(0, 8).map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmployeeSearch("");
                          }}
                          className="shrink-0 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-purple-500 hover:bg-purple-50/40 active:scale-95 transition shadow-2xs"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                            {(emp.first_name || "E")[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 whitespace-nowrap">
                              {emp.first_name} {emp.last_name || ""}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-none mt-0.5">
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

            {/* STAFF MENU ITEMS SECTION */}
            <div className="flex-1 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
              
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff item..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition shrink-0 ${
                    activeCategory === "all"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Items
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("food")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition shrink-0 ${
                    activeCategory === "food"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Kitchen Food
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("drinks")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition shrink-0 ${
                    activeCategory === "drinks"
                      ? "bg-purple-600 text-white"
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
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition shrink-0 ${
                      activeCategory === String(c.id)
                        ? "bg-purple-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto flex-1 pr-1">
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

                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => addToCart(prod)}
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3 text-left shadow-2xs hover:border-purple-500 hover:shadow-md hover:bg-purple-50/20 active:scale-98 transition"
                      >
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
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-black text-emerald-800">
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

                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: STAFF MEAL TICKET / CHECKOUT (4 cols) */}
          <div className="lg:col-span-4 flex flex-col rounded-3xl bg-white border border-slate-200 shadow-sm p-4 overflow-hidden">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-600" />
                <h2 className="text-sm font-black text-slate-800">Staff Meal Ticket</h2>
              </div>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                {cartItems.length} item{cartItems.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Recipient Badge */}
            <div className="my-2.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recipient Staff Member</p>
              {selectedEmployee ? (
                <p className="text-xs font-black text-purple-800 mt-0.5">
                  {selectedEmployee.first_name} {selectedEmployee.last_name || ""} ({selectedEmployee.department || "Staff"})
                </p>
              ) : (
                <p className="text-xs font-semibold text-rose-500 mt-0.5 italic">
                  ⚠️ No staff member selected yet
                </p>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {cartItems.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  <Utensils className="h-8 w-8 mx-auto text-slate-300 mb-2 opacity-60" />
                  Your staff ticket is empty.<br />Click items from the catalog on the left to add.
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
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-black text-slate-800">
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(ci.product.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(ci.product.id)}
                          className="ml-1 text-slate-300 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>



            {/* Order Total & Payment Summary */}
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Staff Bill Total:</span>
                <span className="text-base font-black text-slate-900">
                  {cartSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} ETB
                </span>
              </div>

              {isFreeMeal ? (
                <div className="mt-2 rounded-xl bg-emerald-100/70 border border-emerald-300 px-3 py-1.5 text-center text-xs font-black text-emerald-800">
                  🎁 Free Staff Meal Allowance (0.00 ETB)
                </div>
              ) : (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Payment Collection:</span>
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
                      <span className="text-xs font-bold text-emerald-700">
                        Change: {(Number(cashTendered) - cartSubtotal).toFixed(2)} ETB
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              disabled={submitting || cartItems.length === 0 || !selectedEmployee}
              onClick={handlePlaceStaffOrder}
              className={`mt-3 w-full rounded-2xl py-3 text-xs font-black shadow-md active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                isFreeMeal
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
                  : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-600/20"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting Staff Order...</span>
                </>
              ) : isFreeMeal ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Confirm Free Staff Meal & Dispatch</span>
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  <span>Accept {cartSubtotal.toFixed(2)} ETB & Dispatch</span>
                </>
              )}
            </button>

          </div>

        </div>
      )}

      {/* TAB 2: TODAY'S STAFF ORDERS AUDIT & HISTORY */}
      {activeTab === "history" && (
        <div className="flex-1 rounded-3xl bg-white border border-slate-200 shadow-xs p-5 flex flex-col overflow-hidden">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-900">Today's Staff Meal Orders</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete log of employee meals served today with cashier auditing.
              </p>
            </div>

            <button
              type="button"
              onClick={loadHistory}
              disabled={loadingHistory}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
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
                  .reduce((sum, o) => sum + Number(o.total || 0), 0)
                  .toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                <span className="text-xs font-semibold text-blue-700">ETB</span>
              </p>
            </div>
          </div>

          {/* History Orders List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
            {loadingHistory ? (
              <div className="py-24 text-center text-xs text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600 mb-2" />
                Loading staff meal orders...
              </div>
            ) : historyOrders.length === 0 ? (
              <div className="py-24 text-center text-xs text-slate-400">
                No staff meals recorded today yet.
              </div>
            ) : (
              historyOrders.map((ord) => {
                const totalAmt = Number(ord.total || 0);
                const isFree = totalAmt === 0 || ord.payment_status === "free";
                const itemsList = Array.isArray(ord.items) ? ord.items : [];
                const overallStatus = String(ord.status || "pending").toLowerCase();

                // Status badge styling helper
                const getStatusBadge = (st) => {
                  const s = String(st || "pending").toLowerCase();
                  if (s === "ready") {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs animate-pulse">
                        <Bell className="h-3 w-3" />
                        READY FOR PICKUP
                      </span>
                    );
                  }
                  if (s === "preparing") {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                        <Flame className="h-3 w-3 animate-bounce" />
                        PREPARING
                      </span>
                    );
                  }
                  if (s === "completed" || s === "served") {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                        <Check className="h-3 w-3" />
                        SERVED
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                      <Clock className="h-3 w-3" />
                      IN QUEUE
                    </span>
                  );
                };

                return (
                  <div key={ord.id} className={`py-3.5 px-3 rounded-2xl mb-2 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    overallStatus === "ready" 
                      ? "bg-emerald-50/80 border-2 border-emerald-400 shadow-sm" 
                      : overallStatus === "preparing"
                      ? "bg-amber-50/50 border border-amber-200"
                      : "bg-white border border-slate-100"
                  }`}>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-purple-700">
                          #{ord.order_number}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {ord.notes || "Staff Meal"}
                        </span>
                        
                        {/* Live Kitchen/Bar Status */}
                        {getStatusBadge(overallStatus)}

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            isFree
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {isFree ? "Free Allowance" : "Paid Subsidized"}
                        </span>
                      </div>

                      {/* Prominent notification if food is ready */}
                      {overallStatus === "ready" && (
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-xl w-fit">
                          <Bell className="h-3.5 w-3.5 text-emerald-700" />
                          <span>Order is Ready! Please notify {ord.staff_member_name || "the staff member"} to pick up.</span>
                        </div>
                      )}

                      {/* Items Summary with item-level status */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {itemsList.map((it, idx) => {
                          const itStatus = String(it.status || overallStatus || "pending").toLowerCase();
                          return (
                            <span key={it.id || idx} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold flex items-center gap-1.5 ${
                              itStatus === "ready"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-black"
                                : itStatus === "preparing"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              <span>{it.quantity}x {it.product_name}</span>
                              {itStatus === "ready" && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">✓ Ready</span>}
                              {itStatus === "preparing" && <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">⚡ Prep</span>}
                            </span>
                          );
                        })}
                      </div>

                      <p className="text-[10px] text-slate-400">
                        Recorded at {new Date(ord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {ord.staff_member_name && ` • Recipient: ${ord.staff_member_name}${ord.staff_department ? ` (${ord.staff_department})` : ""}`}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 block">
                        {totalAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} ETB
                      </span>
                      <span className={`text-[10px] font-bold block mt-0.5 ${
                        overallStatus === "ready" ? "text-emerald-700 font-black" : "text-slate-500"
                      }`}>
                        {overallStatus === "ready" ? "🔔 Ready for Handover" : overallStatus === "preparing" ? "🔥 Cooking in Kitchen / Bar" : "✓ Sent to Kitchen/Bar"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

    </div>
  );
}

export default StaffMenuPage;
