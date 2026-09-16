import { useState, useEffect } from "react";
import { DollarSign, Lock } from "lucide-react";
import { useRestaurant } from "../../../context/RestaurantContext";
import { useAuth } from "../../../context/AuthContext";
import TableSelector from "../components/TableSelector";
import CategoryTabs from "../components/CategoryTabs";
import ProductGrid from "../components/ProductGrid";
import CurrentOrder from "../components/CurrentOrder";
import api from "../../../services/api";
import ActiveOrders from "../components/ActiveOrders";
import DrinkPortionModal from "../components/DrinkPortionModal";
import { getCustomShotsMap } from "../../products/ProductsPage";
import CashierShiftBanner from "../components/CashierShiftBanner";
import ShiftStartModal from "../components/ShiftStartModal";
import ShiftCloseModal from "../components/ShiftCloseModal";
import { getCurrentShift } from "../services/posApi";


function POSPage() {
  const { user } = useAuth();
  const {
    tables,
    loadingTables,
    fetchTables,
    fetchKitchenOrders,
  } = useRestaurant();

  const isBartender = user?.role?.toUpperCase() === "BARTENDER" || user?.role_id === 8;

  const [orderItems, setOrderItems] = useState([]);
  const [orderType, setOrderType] = useState("Dine In");
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeCategory, setActiveCategory] = useState(isBartender ? "drinks" : "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [portionModalProduct, setPortionModalProduct] = useState(null);

  const [currentShift, setCurrentShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [isStartShiftModalOpen, setIsStartShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);

  const fetchCurrentShift = async () => {
    try {
      setLoadingShift(true);
      const res = await getCurrentShift();
      const active = res?.shift || res?.data || null;
      setCurrentShift(active);
    } catch (err) {
      console.warn("Current cashier shift fetch:", err);
      setCurrentShift(null);
    } finally {
      setLoadingShift(false);
    }
  };

  useEffect(() => {
    fetchCurrentShift();
  }, []);


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
    if (orderItems.length === 0) {
      return;
    }
    if (orderType === "Dine In" && !selectedTable) {
      alert("Please select a table for Dine In orders.");
      return;
    }

    try {
      const orderNumber = `ORD-${Date.now()}`;

      const rawTableId = Number(selectedTable?.id);
      const tableId = (!isNaN(rawTableId) && rawTableId > 0) ? rawTableId : null;

      const orderData = {
        orderNumber,
        orderType:
          orderType === "Dine In"
            ? "dine_in"
            : orderType === "Takeaway"
            ? "takeaway"
            : "delivery",

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
          await api(`/tables/${selectedTable.id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status: "occupied" }),
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Point of Sale
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage restaurant and bar orders.
          </p>
        </div>

        {/* Top Header Quick Shift Controls */}
        <div className="flex items-center gap-2.5">
          {(!currentShift || currentShift.status !== "open") ? (
            <button
              type="button"
              onClick={() => setIsStartShiftModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-blue-700 active:scale-95"
            >
              <DollarSign className="h-4 w-4" />
              <span>Start Shift</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              {/* Little Card: Total Money Collected */}
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 shadow-2xs">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shrink-0">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div className="leading-tight">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Total Collected</span>
                  <span className="text-xs font-black text-emerald-900">
                    {parseFloat(currentShift.total_sales ?? currentShift.totalSales ?? 0).toLocaleString()} ETB
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCloseShiftModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-rose-700 active:scale-95"
              >
                <Lock className="h-4 w-4" />
                <span>Close Shift</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cashier Shift Status Banner */}
      <CashierShiftBanner
        currentShift={currentShift}
        loadingShift={loadingShift}
        onStartShiftClick={() => setIsStartShiftModalOpen(true)}
        onCloseShiftClick={() => setIsCloseShiftModalOpen(true)}
      />

      <ActiveOrders />

      {/* Order Type */}
      <div className="flex gap-2">
        {["Dine In", "Takeaway"].map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
              orderType === type
                ? "bg-blue-600 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Main POS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Left side */}
        <div className="space-y-6 xl:col-span-2">

          {/* Tables */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Tables
              </h2>

              <p className="text-sm text-gray-500">
                Select a table for this order.
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
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products or tags (#fruit, #beer)..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs font-semibold"
                />
              </div>
            </div>

            {/* Dynamic Category & Tag Tabs */}
            <CategoryTabs
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
            />
          </div>

          <div className="mt-5">
            <ProductGrid
              onAddProduct={handleAddProduct}
              activeCategory={activeCategory}
              orderItems={orderItems}
              searchTerm={searchTerm}
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

            {/* CASHIER SHIFT MANAGEMENT MODALS */}
      <ShiftStartModal
        isOpen={isStartShiftModalOpen}
        onClose={() => setIsStartShiftModalOpen(false)}
        cashierName={user?.name || user?.username}
        onShiftStarted={(newShift) => {
          setCurrentShift(newShift);
          setIsStartShiftModalOpen(false);
          fetchCurrentShift();
        }}
      />

      <ShiftCloseModal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        currentShift={currentShift}
        onShiftClosed={() => {
          setCurrentShift(null);
          setIsCloseShiftModalOpen(false);
          fetchCurrentShift();
        }}
      />

      {/* DRINK PORTION SELECTOR MODAL */}
      {portionModalProduct && (
        <DrinkPortionModal
          product={portionModalProduct}
          onClose={() => setPortionModalProduct(null)}
          onSelectPortion={handleSelectPortion}
        />
      )}

    </div>
  );
}

export default POSPage;