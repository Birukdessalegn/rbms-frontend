import { useState } from "react";
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


function POSPage() {
  const { user } = useAuth();
  const {
    tables,
    loadingTables,
    fetchTables,
    fetchKitchenOrders,
  } = useRestaurant();

  const userRole = (user?.role || "").toUpperCase();
  const isBartender = userRole === "BARTENDER" || user?.role_id === 8;
  const isManagerOrAdmin =
    ["ADMIN", "MANAGER", "CASHIER"].includes(userRole) ||
    user?.role_id === 1 ||
    user?.role_id === 2 ||
    user?.role_id === 4;
  const isWaiter = !isBartender && !isManagerOrAdmin;

  const [orderItems, setOrderItems] = useState([]);
  const orderType = "Dine In";
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeCategory, setActiveCategory] = useState(isBartender ? "drinks" : "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [portionModalProduct, setPortionModalProduct] = useState(null);


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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Point of Sale
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage restaurant and bar orders.
          </p>
        </div>
      </div>

      <ActiveOrders />


      {/* Main POS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Left side */}
        <div className="space-y-6 xl:col-span-2">

          {/* Tables */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {isWaiter ? "Dining Tables" : "Tables"}
              </h2>

              <p className="text-sm text-gray-500">
                {isWaiter
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