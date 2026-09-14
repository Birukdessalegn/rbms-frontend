import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import api from "../../../services/api";
import { getProductApplicableMap } from "../../products/ProductsPage";

function ProductGrid({
  onAddProduct,
  activeCategory = "all",
  orderItems = [],
  searchTerm = "",
})  {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api("/products");

        setProducts(response.products || []);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setError(
          error.message || "Failed to load products"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

const filteredProducts = products.filter((product) => {
  const localMap = getProductApplicableMap();
  const localApp = localMap[String(product.id)] || localMap[String(product.product_code || product.productCode)];
  const applicableFor = (product.applicable_for || product.applicableFor || localApp || "both").toLowerCase();

  // Exclude raw materials & ingredients from the POS waiter screen
  if (applicableFor === "inventory") {
    return false;
  }

  const matchesCategory =
    activeCategory === "all" ||
    product.category_name?.toLowerCase() ===
      activeCategory.toLowerCase() ||
    product.category_type?.toLowerCase() ===
      activeCategory.toLowerCase() ||
    (activeCategory === "drinks" &&
      product.category_type?.toLowerCase() === "beverage");

  const matchesSearch =
    product.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

  return matchesCategory && matchesSearch;
});

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-500">
        Loading products...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">
        No products available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {filteredProducts.map((product) => {
        const orderItem = orderItems.find(
          (item) => item.id === product.id
        );

        const quantityInOrder = orderItem
          ? orderItem.quantity
          : 0;

        const currentStock = product.current_stock !== undefined ? Number(product.current_stock) : null;
        const minStock = product.minimum_stock !== undefined ? Number(product.minimum_stock) : 5;
        const stockDept = product.stock_department || (product.category_type === "food" ? "Kitchen" : "Bar");

        const productForCard = {
          ...product,
          category:
            product.category_name || product.category_type,
          price: Number(product.price),
          image: product.image_url || "🍽️",
          currentStock,
          minStock,
          stockDept,
        };

        return (
          <ProductCard
            key={product.id}
            product={productForCard}
            onAdd={onAddProduct}
            quantityInOrder={quantityInOrder}
          />
        );
      })}
    </div>
  );
}

export default ProductGrid;