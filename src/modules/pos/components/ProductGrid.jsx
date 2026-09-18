import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import api from "../../../services/api";
import { getProductApplicableMap } from "../../products/ProductsPage";

function ProductGrid({
  onAddProduct,
  activeCategory = "all",
  orderItems = [],
  searchTerm = "",
  isBartender = false,
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
  // Hide disabled products from the POS ordering screen
  if (product.is_active === false) {
    return false;
  }

  const localMap = getProductApplicableMap();
  const localApp = localMap[String(product.id)] || localMap[String(product.product_code || product.productCode)];
  const applicableFor = (product.applicable_for || product.applicableFor || localApp || "both").toLowerCase();

  // Exclude raw materials & ingredients from the POS waiter screen
  if (applicableFor === "inventory") {
    return false;
  }

  // Exclude staff-only items from customer POS dining menu
  if (product.menu_type === "employee") {
    return false;
  }

  const pCatName = (product.category_name || "").toLowerCase();
  const pCatType = (product.category_type || "").toLowerCase();
  const pTags = (product.tags || product.tag || "").toLowerCase();
  const pName = (product.name || "").toLowerCase();

  // For Bartender: strictly only allow drinks, beverages, beers, wines, and spirits
  if (isBartender) {
    const isFood =
      pCatType === "food" ||
      pCatName.includes("food") ||
      pCatName.includes("kitchen") ||
      pCatName.includes("burger") ||
      pCatName.includes("pizza") ||
      pCatName.includes("salad") ||
      pCatName.includes("meal") ||
      pCatName.includes("dessert");
    if (isFood) {
      return false;
    }
  }

  const selCat = String(activeCategory || "all").toLowerCase().trim();

  const matchesCategory =
    selCat === "all" ||
    String(product.category_id) === selCat ||
    pCatName === selCat ||
    pTags.includes(selCat) ||
    (selCat === "food" && (pCatType === "food" || pCatName.includes("food") || pCatName.includes("kitchen"))) ||
    (selCat === "drinks" && (pCatType === "beverage" || pCatType === "bar" || pCatName.includes("drink") || pCatName.includes("beer") || pCatName.includes("wine"))) ||
    (selCat === "fruit" && (pTags.includes("fruit") || pCatName.includes("fruit") || pCatType.includes("fruit") || pName.includes("fruit"))) ||
    (selCat === "bar" && (pCatType === "bar" || pCatName.includes("bar") || pCatName.includes("beer") || pCatName.includes("wine") || pTags.includes("beer") || pTags.includes("whiskey")));

  const matchesSearch =
    !searchTerm.trim() ||
    pName.includes(searchTerm.toLowerCase()) ||
    pTags.includes(searchTerm.toLowerCase()) ||
    pCatName.includes(searchTerm.toLowerCase());

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