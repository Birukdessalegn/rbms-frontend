
import { useEffect, useState } from "react";
import api from "../../../services/api";
import {
  Utensils,
  Wine,
  Coffee,
  Apple,
  Sparkles,
  Tag,
  Package,
} from "lucide-react";

export const getCategoryIcon = (name = "", type = "") => {
  const n = String(name).toLowerCase();
  const t = String(type).toLowerCase();

  if (n.includes("fruit") || t.includes("fruit")) return Apple;
  if (n.includes("beer") || n.includes("wine") || n.includes("liquor") || t === "bar") return Wine;
  if (n.includes("drink") || n.includes("soda") || n.includes("juice") || n.includes("water") || t === "beverage") return Coffee;
  if (n.includes("food") || n.includes("burger") || n.includes("pizza") || t === "food") return Utensils;
  if (n.includes("special") || t.includes("special")) return Sparkles;
  return Tag;
};

function CategoryTabs({
  activeCategory = "all",
  onSelectCategory,
  products = [],
}) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api("/products/categories");
        const list = res.categories || res.data || [];
        setCategories(list);
      } catch (err) {
        console.warn("CategoryTabs: failed to load categories", err);
      }
    };
    fetchCats();
  }, []);

  // Compute counts if products are provided
  const getCategoryCount = (catId, catName, catType) => {
    if (!products || products.length === 0) return null;
    if (catId === "all") return products.length;

    const lowerName = (catName || "").toLowerCase();
    const lowerType = (catType || "").toLowerCase();

    return products.filter((p) => {
      const pCatId = String(p.category_id || p.categoryId || "");
      const pCatName = (p.category_name || p.category || "").toLowerCase();
      const pCatType = (p.category_type || p.categoryType || "").toLowerCase();
      const pName = (p.name || p.product_name || "").toLowerCase();

      if (catId && String(catId) === pCatId) return true;
      if (lowerType === "food" && (pCatType === "food" || pCatName.includes("food") || pCatName.includes("kitchen"))) return true;
      if (lowerType === "beverage" && (pCatType === "beverage" || pCatType === "bar" || pCatName.includes("drink") || pCatName.includes("beverage"))) return true;
      if (lowerName === "drinks" && (pCatType === "beverage" || pCatType === "bar" || pCatName.includes("drink"))) return true;
      if (lowerName === "fruit" && (pCatName.includes("fruit") || pName.includes("fruit"))) return true;
      if (lowerName === "bar" && (pCatType === "bar" || pCatName.includes("bar") || pCatName.includes("beer") || pCatName.includes("wine"))) return true;
      return pCatName === lowerName;
    }).length;
  };

  // Base smart tabs
  const defaultTabs = [
    { id: "all", name: "All", type: "all" },
    { id: "food", name: "Food", type: "food" },
    { id: "fruit", name: "Fruit", type: "fruit" },
    { id: "drinks", name: "Drinks", type: "beverage" },
    { id: "bar", name: "Bar", type: "bar" },
  ];

  // Merge with dynamic categories from database
  const dynamicTabs = categories.map((c) => ({
    id: String(c.id),
    name: c.name,
    type: c.type,
    isDynamic: true,
  }));

  // Combine and deduplicate
  const allTabs = [
    ...defaultTabs,
    ...dynamicTabs.filter(
      (d) => !defaultTabs.some((def) => def.name.toLowerCase() === d.name.toLowerCase())
    ),
  ];

  return (
    <div className="w-full">
      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
        {allTabs.map((category) => {
          const isActive =
            String(activeCategory).toLowerCase() === String(category.id).toLowerCase() ||
            String(activeCategory).toLowerCase() === String(category.name).toLowerCase();

          const count = getCategoryCount(category.id, category.name, category.type);
          const IconComponent = getCategoryIcon(category.name, category.type);

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory && onSelectCategory(category.id)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-2xs shrink-0 ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                  : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <IconComponent className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span>{category.name}</span>
              {count !== null && count !== undefined && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryTabs;