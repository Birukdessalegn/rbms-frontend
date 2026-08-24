import { useState } from "react";
import { useRestaurant } from "../../../context/RestaurantContext";
import TableSelector from "../components/TableSelector";
import CategoryTabs from "../components/CategoryTabs";
import ProductGrid from "../components/ProductGrid";
import CurrentOrder from "../components/CurrentOrder";


function POSPage() {

const { sendToKitchen } = useRestaurant();

  const [orderItems, setOrderItems] = useState([]);
  const [orderType, setOrderType] = useState("Dine In");
  const [selectedTable, setSelectedTable] = useState(5);
  const [activeCategory, setActiveCategory] = useState("all");

  const handleAddProduct = (product) => {
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

const handleSendToKitchen = () => {
  if (orderItems.length === 0) {
    return;
  }

  sendToKitchen({
    table: selectedTable,
    type: orderType,
    items: orderItems,
  });

  setOrderItems([]);
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

        <div className="flex gap-3">
          <button
            onClick={handleClear}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hold Order
          </button>

          <button
            onClick={handleClear}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Order
          </button>
        </div>
      </div>

      {/* Order Type */}
      <div className="flex gap-2">
        {["Dine In", "Takeaway", "Delivery"].map((type) => (
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
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
            />
          </div>

          {/* Products */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">

            <CategoryTabs
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
            />

            <div className="mt-5">
              <ProductGrid
                onAddProduct={handleAddProduct}
                activeCategory={activeCategory}
                orderItems={orderItems}
              />
            </div>

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
    </div>
  );
}

export default POSPage;