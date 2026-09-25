import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useRestaurant } from "../../../context/RestaurantContext";
import { useAuth } from "../../../context/AuthContext";
import TableSelector, { isBarSeatTable } from "../components/TableSelector";
import CategoryTabs from "../components/CategoryTabs";
import ProductGrid from "../components/ProductGrid";
import CurrentOrder from "../components/CurrentOrder";
import api from "../../../services/api";
import ActiveOrders from "../components/ActiveOrders";
import DrinkPortionModal from "../components/DrinkPortionModal";
import { getCustomShotsMap } from "../../products/ProductsPage";
import {
  AlertTriangle,
  PlayCircle,
  ArrowRight,
  Wallet,
  X,
  ShieldCheck,
} from "lucide-react";


function POSPage() {
  const { user } = useAuth();
  const {
    tables,
    loadingTables,
    fetchTables,
    fetchKitchenOrders,
  } = useRestaurant();

  const userRole = (user?.role || "").toUpperCase();
  const isBartender = userRole === "BARTENDER" || user?.role_id === 7;
  const isCashier = userRole === "CASHIER" || user?.role_id === 5;
  const isManagerOrAdmin =
    ["ADMIN", "MANAGER", "CASHIER"].includes(userRole) ||
    user?.role_id === 1 ||
    user?.role_id === 2 ||
    user?.role_id === 4;
  const isWaiter = !isBartender && !isManagerOrAdmin;
  const canManageShift = (isCashier || isManagerOrAdmin) && !isWaiter;

  const [orderItems, setOrderItems] = useState([]);
  const orderType = "Dine In";
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeCategory, setActiveCategory] = useState(isBartender ? "drinks" : "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [portionModalProduct, setPortionModalProduct] = useState(null);

  // Floating search dropdown products
  const matchingSearchProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return allProducts.filter((p) => {
      if (p.is_active === false || p.menu_type === "employee") return false;
      const applicable = (p.applicable_for || p.applicableFor || "both").toLowerCase();
      if (applicable === "inventory") return false;

      if (isBartender) {
        const catType = (p.category_type || "").toLowerCase();
        const catName = (p.category_name || "").toLowerCase();
        const isFood =
          catType === "food" ||
          catName.includes("food") ||
          catName.includes("kitchen") ||
          catName.includes("burger") ||
          catName.includes("pizza") ||
          catName.includes("salad") ||
          catName.includes("meal") ||
          catName.includes("dessert");
        if (isFood) return false;
      }

      const name = (p.name || "").toLowerCase();
      const tags = (p.tags || p.tag || "").toLowerCase();
      const cat = (p.category_name || "").toLowerCase();
      const code = String(p.product_code || "").toLowerCase();
      return name.includes(term) || tags.includes(term) || cat.includes(term) || code.includes(term);
    });
  }, [allProducts, searchTerm, isBartender]);

  /* Cashier Shift Verification & Quick Open State */
  const [currentShift, setCurrentShift] = useState(null);
  const [checkingShift, setCheckingShift] = useState(false);
  const [showQuickStartModal, setShowQuickStartModal] = useState(false);
  const [quickOpeningFloat, setQuickOpeningFloat] = useState("0");
  const [startingQuickShift, setStartingQuickShift] = useState(false);

  const checkCashierShift = async () => {
    if (!canManageShift) return;
    try {
      setCheckingShift(true);
      const res = await api("/pos/shifts/current");
      const shift = res?.shift ?? res?.data ?? null;
      setCurrentShift(shift && shift.status === "open" ? shift : null);
    } catch (err) {
      console.log("POS shift check note:", err);
    } finally {
      setCheckingShift(false);
    }
  };

  useEffect(() => {
    checkCashierShift();
  }, [userRole, canManageShift]);

  const handleQuickStartShift = async (e) => {
    e.preventDefault();
    try {
      setStartingQuickShift(true);
      const res = await api("/pos/shifts/start", {
        method: "POST",
        body: JSON.stringify({
          opening_cash: Number(quickOpeningFloat) || 0,
          terminal_id: 1,
        }),
      });
      const shift = res?.shift || res?.data || null;
      if (shift) {
        setCurrentShift(shift);
      }
      setShowQuickStartModal(false);
      alert("Cash drawer shift opened successfully! All today's sales will link to this shift.");
    } catch (err) {
      alert(err.message || "Failed to start shift");
    } finally {
      setStartingQuickShift(false);
    }
  };

  // Helper to identify spirit/liquor bottle products that should open the portion serving modal
  const isSpiritOrLiquorProduct = (product) => {
    if (!product) return false;

    const localMap = getCustomShotsMap ? getCustomShotsMap() : {};
    const localData = localMap[String(product.id)] || localMap[String(product.product_code || product.productCode)];

    // Strictly check if portion/shot options are enabled for this product
    const isShotItem = product.is_shot_item === true || product.isShotItem === true || localData?.isShotItem === true;
    const capacity = Number(product.shots_capacity || product.shotsCapacity || localData?.shots || 0);

    return Boolean(isShotItem && capacity > 0);
  };

  const handleAddProduct = (product) => {
    // Gentle warning if item is completely out of stock
    const stockVal = product.current_stock !== undefined ? Number(product.current_stock) : null;
    if (stockVal !== null && !isNaN(stockVal) && stockVal <= 0) {
      const confirmAdd = window.confirm(
        `⚠️ "${product.name}" is marked OUT OF STOCK in ${product.stock_department || "inventory"}.\n\nDo you still want to add it to the ticket?`
      );
      if (!confirmAdd) return;
    }

    if (isSpiritOrLiquorProduct(product)) {
      setPortionModalProduct(product);
      return;
    }

    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const handleSelectPortion = (portionOption) => {
    if (!portionModalProduct) return;

    const itemUniqueId = `${portionModalProduct.id}_${portionOption.id}`;
    const formattedName = `${portionModalProduct.name} (${portionOption.title})`;

    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.cartId === itemUniqueId || item.id === itemUniqueId);
      if (existingItem) {
        return prevItems.map((item) =>
          (item.cartId === itemUniqueId || item.id === itemUniqueId)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prevItems,
        {
          ...portionModalProduct,
          cartId: itemUniqueId,
          id: itemUniqueId,
          originalId: portionModalProduct.id,
          name: formattedName,
          price: portionOption.price,
          quantity: 1,
          portion: portionOption.id,
          portionTitle: portionOption.title,
          shotsDeduction: portionOption.shots,
          notes: `${portionOption.title} (${portionOption.shots} Shots)`,
        },
      ];
    });

    setPortionModalProduct(null);
  };

  const handleSendToKitchen = async () => {
    if (!orderItems || orderItems.length === 0) {
      alert("Your order ticket is empty. Please select menu items before sending.");
      return;
    }
    if (!selectedTable) {
      alert("Please select a table for Dine In orders.");
      return;
    }
    if (isWaiter && isBarSeatTable(selectedTable)) {
      alert("Bar tables and counter seats are reserved exclusively for the Bartender. Please select a dining table.");
      return;
    }

    try {
      const orderNumber = `ORD-${Date.now()}`;

      const rawTableId = Number(selectedTable?.id);
      const tableId = (!isNaN(rawTableId) && rawTableId > 0) ? rawTableId : null;

      const orderData = {
        orderNumber,
        orderType: "dine_in",

        tableId,
        is_bar_order: isBartender || Boolean(selectedTable?.is_bar_seat),

        waiterId: user?.employee_id || user?.employeeId || user?.id || 1,
        waiter_id: user?.employee_id || user?.employeeId || user?.id || 1,
        waiterName: user?.username || user?.name || null,
        waiter_name: user?.username || user?.name || null,
        bartender_id: isBartender ? (user?.employee_id || user?.employeeId || user?.id || 1) : null,
        bartender_name: isBartender ? (user?.username || user?.name || null) : null,

        items: orderItems.map((item) => ({
          productId: item.originalId || item.id,
          product_id: item.originalId || item.id,
          name: item.name,
          product_name: item.name,
          price: item.price,
          unit_price: item.price,
          quantity: item.quantity,
          portion: item.portion || "",
          shotsDeduction: item.shotsDeduction || null,
          notes: item.notes || "",
        })),

        notes: "",
      };

      const response = await api("/pos/orders", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      console.log("Order created:", response);

      // Explicitly update table status to occupied if table was selected
      if (selectedTable?.id) {
        try {
          const waiterEmpId = user?.employee_id || user?.employeeId || user?.id || null;
          await api(`/tables/${selectedTable.id}/status`, {
            method: "PUT",
            body: JSON.stringify({
              status: "occupied",
              waiterId: waiterEmpId,
              waiter_id: waiterEmpId,
            }),
          });
        } catch (tableErr) {
          console.log("Table status update note:", tableErr);
        }
      }

      setOrderItems([]);
      setSelectedTable(null);

      // Instantly refresh table status and active orders in Restaurant Context
      if (fetchTables) {
        fetchTables();
      }
      if (fetchKitchenOrders) {
        fetchKitchenOrders();
      }

      const isBarOrder = isBartender || Boolean(selectedTable?.is_bar_seat);
      alert(isBarOrder ? "Order sent to Bar successfully!" : "Order sent to kitchen successfully!");

    } catch (error) {
      console.error("Failed to create order:", error);

      alert(
        error.message ||
        "Failed to send order to kitchen"
      );
    }
  };

  const handleIncrease = (productId) => {
    setOrderItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const handleDecrease = (productId) => {
    setOrderItems((prevItems) =>
      prevItems
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemove = (productId) => {
    setOrderItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId)
    );
  };

  const handleClear = () => {
    setOrderItems([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isBartender ? "Bar Menu & Ordering" : "Point of Sale"}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {isBartender
              ? "Select a bar table or counter stool and place drink orders."
              : "Create and manage restaurant and bar orders."}
          </p>
        </div>
      </div>

      {/* POS Cash Drawer Open Shift Warning Banner for Cashier / Admin / Manager */}
      {canManageShift && !checkingShift && !currentShift && (
        <div className="rounded-2xl border border-amber-300 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 p-4 sm:p-5 shadow-xs transition-all duration-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-amber-950 sm:text-base">
                    Cash Drawer Shift is Closed
                  </h3>
                  <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900 border border-amber-300">
                    Shift Required
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-amber-800">
                  You have not opened a cash till shift today. Open your shift to record starting cash float and accurately track your daily sales audit.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setQuickOpeningFloat("0");
                  setShowQuickStartModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-amber-700 active:scale-95"
              >
                <PlayCircle size={14} />
                <span>Open Shift Now</span>
              </button>
              <Link
                to="/pos/sales-audit"
                className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-white/90 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs transition hover:bg-white"
              >
                <span>Daily Audit</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Compact Active Shift Bar */}
      {canManageShift && currentShift && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-extrabold">Active Cashier Shift #{currentShift.id || currentShift.shift_id}</span>
            <span className="text-emerald-700">
              • Starting Float: {(Number(currentShift.opening_cash || 0)).toLocaleString()} ETB
            </span>
          </div>
          <Link
            to="/pos/sales-audit"
            className="font-bold text-emerald-700 hover:text-emerald-900 underline inline-flex items-center gap-1"
          >
            Daily Sales Audit <ArrowRight size={12} />
          </Link>
        </div>
      )}

      <ActiveOrders />


      {/* Main POS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Left side */}
        <div className="space-y-6 xl:col-span-2">

          {/* Tables */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {isBartender ? "Bar Tables & Stools" : isWaiter ? "Dining Tables" : "Tables"}
              </h2>

              <p className="text-sm text-gray-500">
                {isBartender
                  ? "Select a bar table or counter seat for this order."
                  : isWaiter
                  ? "Select an available dining table for this order."
                  : "Select a table or bar seat for this order."}
              </p>
            </div>

            <TableSelector
              tables={tables}
              loading={loadingTables}
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
            />
          </div>

          {/* Products Search & Categories */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Select Menu Items
                </h2>
                <p className="text-xs text-gray-500">
                  Filter by category or tag to quickly add items to the ticket.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products or tags (#fruit, #beer)..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs font-semibold pr-8"
                />
                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}

                {/* Floating Dropdown for POS Products */}
                {searchTerm.trim() && (
                  <div className="absolute left-0 top-full mt-1.5 w-full sm:w-80 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl z-50 p-1 divide-y divide-slate-100">
                    {matchingSearchProducts.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">No matching products found</div>
                    ) : (
                      matchingSearchProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            handleAddProduct(p);
                            setSearchTerm("");
                          }}
                          className="w-full flex items-center justify-between p-2.5 text-left hover:bg-blue-50 rounded-lg transition group cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate transition">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {p.category_name || p.category || "Item"}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {Number(p.price || 0).toLocaleString()} ETB
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Category & Tag Tabs */}
            <CategoryTabs
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              isBartender={isBartender}
            />
          </div>

          <div className="mt-5">
            <ProductGrid
              onAddProduct={handleAddProduct}
              activeCategory={activeCategory}
              orderItems={orderItems}
              searchTerm={searchTerm}
              isBartender={isBartender}
              onProductsLoaded={setAllProducts}
            />
          </div>
        </div>

        {/* Right side */}
        <div className="xl:col-span-1">
          <CurrentOrder
            orderItems={orderItems}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            onRemove={handleRemove}
            onClear={handleClear}
            onSendToKitchen={handleSendToKitchen}
            selectedTable={selectedTable}
            orderType={orderType}
          />
        </div>

      </div>

      {/* DRINK PORTION SELECTOR MODAL */}
      {portionModalProduct && (
        <DrinkPortionModal
          product={portionModalProduct}
          onClose={() => setPortionModalProduct(null)}
          onSelectPortion={handleSelectPortion}
        />
      )}

      {/* QUICK CASH DRAWER OPEN MODAL */}
      {showQuickStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Open Cash Drawer Shift
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter starting cash float to begin taking orders
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickStartModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickStartShift} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Starting Cash Float (ETB)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs font-bold text-slate-400">
                    ETB
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    autoFocus
                    value={quickOpeningFloat}
                    onChange={(e) => setQuickOpeningFloat(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-13 pr-4 text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Amount of physical cash placed into the till at the start of your shift.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickStartModal(false)}
                  className="w-1/2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startingQuickShift}
                  className="w-1/2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {startingQuickShift ? "Opening..." : "Confirm & Start"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default POSPage;