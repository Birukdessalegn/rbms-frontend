import { useState } from "react";
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

function POSPage() {
  const { user } = useAuth();
  const {
    tables,
    loadingTables,
    fetchTables,
    fetchKitchenOrders,
  } = useRestaurant();

  const [orderItems, setOrderItems] = useState([]);
  const [orderType, setOrderType] = useState("Dine In");
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [portionModalProduct, setPortionModalProduct] = useState(null);

  // Helper to identify spirit/liquor bottle products that should open the portion serving modal
  const isSpiritOrLiquorProduct = (product) => {
    if (!product) return false;
    const cat = (product.category_name || product.category || product.type || "").toLowerCase();
    const pName = (product.product_name || product.name || "").toLowerCase();

    const localMap = getCustomShotsMap();
    const localData = localMap[String(product.id)] || localMap[String(product.product_code || product.productCode)];
    const hasCustomShots =
      Number(product.shots_capacity || product.shotsCapacity || localData?.shots || 0) > 0 ||
      localData?.isShotItem === true;

    const isShotItem =
      product.is_shot_item === true ||
      product.isShotItem === true ||
      product.shots_capacity > 0 ||
      product.shotsCapacity > 0 ||
      hasCustomShots;

    const isSpiritCat =
      cat.includes("whiskey") ||
      cat.includes("spirit") ||
      cat.includes("liquor") ||
      cat.includes("vodka") ||
      cat.includes("gin") ||
      cat.includes("rum") ||
      cat.includes("tequila") ||
      cat.includes("brandy") ||
      cat.includes("cognac");

    const isSpiritName =
      pName.includes("whiskey") ||
      pName.includes("red label") ||
      pName.includes("black label") ||
      pName.includes("jack daniel") ||
      pName.includes("jameson") ||
      pName.includes("vodka") ||
      pName.includes("gin") ||
      pName.includes("rum") ||
      pName.includes("tequila");

    const isBeerOrSoft =
      cat.includes("beer") ||
      cat.includes("soft") ||
      cat.includes("water") ||
      pName.includes("beer") ||
      pName.includes("coca") ||
      pName.includes("water");

    if (isBeerOrSoft) return false;
    return isShotItem || isSpiritCat || isSpiritName;
  };

  const handleAddProduct = (product) => {
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

        waiterId: user?.employee_id || user?.employeeId || user?.id || 1,
        waiter_id: user?.employee_id || user?.employeeId || user?.id || 1,
        waiterName: user?.username || user?.name || null,
        waiter_name: user?.username || user?.name || null,

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

      alert("Order sent to kitchen successfully!");

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
            Point of Sale
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage restaurant and bar orders.
          </p>
        </div>
      </div>

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

          {/* Products */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Categories */}
            <div className="flex gap-2">
              {["all", "food", "drinks"].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activeCategory === category
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {category === "all"
                    ? "All"
                    : category === "food"
                    ? "Food"
                    : "Drinks"}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
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