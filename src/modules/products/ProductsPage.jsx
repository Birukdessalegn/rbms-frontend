import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Package,
  Utensils,
  Wine,
  Coffee,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Star,
  Users,
  UserCheck,
  Sparkles,
  BookOpen,
  Upload,
  Image as ImageIcon,
  Apple,
  Tag,
} from "lucide-react";

import api from "../../services/api";

// Helper to format food/drink image URLs
export const formatImageUrl = (url) => {
  if (!url) return null;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  const baseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000";
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const getProductApplicableMap = () => {
  try {
    return JSON.parse(localStorage.getItem("rbms_product_applicable_map") || "{}");
  } catch {
    return {};
  }
};

export const setProductApplicableFor = (productIdOrCode, applicableFor = "both") => {
  try {
    if (!productIdOrCode) return;
    const map = getProductApplicableMap();
    map[String(productIdOrCode)] = applicableFor;
    localStorage.setItem("rbms_product_applicable_map", JSON.stringify(map));
  } catch (err) {
    console.warn("Could not save product applicable map", err);
  }
};

export const getCustomShotsMap = () => {
  try {
    return JSON.parse(localStorage.getItem("rbms_custom_shots_map") || "{}");
  } catch {
    return {};
  }
};

export const setCustomProductShots = (productIdOrCode, shots, isShotItem = true, extra = {}) => {
  try {
    if (!productIdOrCode) return;
    const map = getCustomShotsMap();
    map[String(productIdOrCode)] = {
      shots: Number(shots) > 0 ? Number(shots) : 30,
      isShotItem: Boolean(isShotItem),
      doubleShotPrice: extra.doubleShotPrice !== undefined ? extra.doubleShotPrice : (map[String(productIdOrCode)]?.doubleShotPrice ?? null),
      halfBottlePrice: extra.halfBottlePrice !== undefined ? extra.halfBottlePrice : (map[String(productIdOrCode)]?.halfBottlePrice ?? null),
      bottlePrice: extra.bottlePrice !== undefined ? extra.bottlePrice : (map[String(productIdOrCode)]?.bottlePrice ?? null),
      allowSingleShot: extra.allowSingleShot !== undefined ? extra.allowSingleShot : (map[String(productIdOrCode)]?.allowSingleShot ?? true),
      allowDoubleShot: extra.allowDoubleShot !== undefined ? extra.allowDoubleShot : (map[String(productIdOrCode)]?.allowDoubleShot ?? true),
      allowHalfBottle: extra.allowHalfBottle !== undefined ? extra.allowHalfBottle : (map[String(productIdOrCode)]?.allowHalfBottle ?? true),
      allowFullBottle: extra.allowFullBottle !== undefined ? extra.allowFullBottle : (map[String(productIdOrCode)]?.allowFullBottle ?? true),
    };
    localStorage.setItem("rbms_custom_shots_map", JSON.stringify(map));
  } catch (err) {
    console.warn("Could not save custom shots map", err);
  }
};

export const getCustomTags = () => {
  try {
    return JSON.parse(localStorage.getItem("rbms_custom_tags") || "[]");
  } catch {
    return [];
  }
};

export const saveCustomTag = (tag) => {
  try {
    const clean = String(tag || "").trim();
    if (!clean) return;
    const existing = getCustomTags();
    if (!existing.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      const updated = [...existing, clean];
      localStorage.setItem("rbms_custom_tags", JSON.stringify(updated));
    }
  } catch (err) {
    console.warn("Could not save custom tag", err);
  }
};

export const removeCustomTag = (tag) => {
  try {
    const existing = getCustomTags();
    const updated = existing.filter((t) => t.toLowerCase() !== String(tag).toLowerCase());
    localStorage.setItem("rbms_custom_tags", JSON.stringify(updated));
  } catch (err) {
    console.warn("Could not remove custom tag", err);
  }
};

// ============================================================
// ============================================================
// AUTOMATIC CATEGORY & TAG-BASED PRODUCT CODE GENERATOR
// ============================================================
export const getCategoryPrefix = (categoryName = "", categoryType = "", tags = "") => {
  const tag = String(tags || "").trim().toUpperCase();
  const name = String(categoryName || "").trim().toUpperCase();
  const type = String(categoryType || "").trim().toUpperCase();

  if (tag.includes("FRUIT") || name.includes("FRUIT")) return "FR";
  if (tag.includes("BEER") || name.includes("BEER")) return "BR";
  if (tag.includes("JUICE") || name.includes("JUICE")) return "JC";
  if (tag.includes("WINE") || name.includes("WINE")) return "WN";
  if (tag.includes("WHISKEY") || tag.includes("SPIRIT") || name.includes("WHISKEY")) return "SP";
  if (tag.includes("COCKTAIL") || name.includes("COCKTAIL")) return "CK";
  if (tag.includes("FAST") || tag.includes("BURGER") || tag.includes("PIZZA")) return "FF";
  if (tag.includes("SALAD") || name.includes("SALAD")) return "SL";
  if (tag.includes("DESSERT") || name.includes("DESSERT")) return "DS";
  if (tag.includes("SNACK") || name.includes("SNACK")) return "SN";
  if (tag.includes("COFFEE") || tag.includes("TEA") || name.includes("COFFEE")) return "CF";
  if (tag.includes("WATER") || name.includes("WATER")) return "WT";

  if (name.includes("FOOD") || type === "FOOD") return "FD";
  if (name.includes("BEVERAGE") || name.includes("SOFT") || type === "BEVERAGE") return "BV";
  if (name.includes("BAR") || type === "BAR") return "BR";
  if (name.includes("SUPPL") || type === "SUPPLY") return "KS";

  const clean = tag ? tag.replace(/[^A-Z0-9]/g, "").slice(0, 2) : name.replace(/[^A-Z0-9]/g, "").slice(0, 3);
  return clean || "PRD";
};

export const getNextProductCodeForCategory = (categoryId, categories = [], products = [], tags = "") => {
  if (!categoryId) return "";
  const catObj = categories.find((c) => String(c.id) === String(categoryId));
  const prefix = getCategoryPrefix(catObj?.name, catObj?.type, tags);

  let maxNum = 0;
  const prefixDash = `${prefix}-`;

  products.forEach((p) => {
    const pCode = String(p.product_code || p.productCode || "").toUpperCase().trim();
    const pCatId = String(p.category_id || p.categoryId || "");

    if (pCode.startsWith(prefixDash)) {
      const numPart = parseInt(pCode.slice(prefixDash.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    } else if (pCatId === String(categoryId)) {
      const match = pCode.match(/\d+/);
      if (match) {
        const numPart = parseInt(match[0], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  });

  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
};

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState("all");
  const [applicableFilter, setApplicableFilter] = useState("all"); // "all" | "both" | "sales" | "inventory"
  const [customTagsList, setCustomTagsList] = useState(getCustomTags());

  const [activeTab, setActiveTab] = useState("catalog"); // "catalog" | "menu"
  const [menuAudienceFilter, setMenuAudienceFilter] = useState("all"); // "all" | "customer" | "employee"

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [basePriceInput, setBasePriceInput] = useState("");

  const [form, setForm] = useState({
    productCode: "",
    name: "",
    categoryId: "",
    tags: "",
    description: "",
    price: "",
    costPrice: "",
    staffPrice: "",
    unit: "pcs",
    imageUrl: "",
    isAvailable: true,
    isActive: true,
    menuType: "both", // "both" | "customer" | "employee"
    isTodaysSpecial: false,
    shotsCapacity: "30",
    isShotItem: false,
    doubleShotPrice: "",
    halfBottlePrice: "",
    bottlePrice: "",
    allowSingleShot: true,
    allowDoubleShot: true,
    allowHalfBottle: true,
    allowFullBottle: true,
    applicableFor: "both", // "both" | "sales" | "inventory"
  });

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "food",
    description: "",
  });
  const [categoryModalError, setCategoryModalError] = useState("");
  const [categoryModalSuccess, setCategoryModalSuccess] = useState("");

  // ============================================================
  // FETCH PRODUCTS
  // ============================================================

  const fetchProducts = async () => {
    try {
      setError("");

      const response = await api("/products");
      const rawProducts = response.products || [];
      const localMap = getCustomShotsMap();
      const appMap = getProductApplicableMap();
      const enriched = rawProducts.map((p) => {
        const cat = (p.category_name || p.category || p.type || "").toLowerCase();
        const pName = (p.name || p.product_name || "").toLowerCase();
        const isFoodOrSoft =
          cat.includes("food") ||
          cat.includes("kitchen") ||
          cat.includes("fruit") ||
          pName.includes("fruit") ||
          cat.includes("beer") ||
          cat.includes("soft") ||
          cat.includes("water") ||
          cat.includes("wine") ||
          pName.includes("salad") ||
          pName.includes("beer") ||
          pName.includes("water") ||
          pName.includes("coca") ||
          pName.includes("pizza") ||
          pName.includes("burger");

        const local = localMap[String(p.id)] || localMap[String(p.product_code || p.productCode)];
        const isShot = Boolean(p.is_shot_item === true || p.isShotItem === true || local?.isShotItem === true);
        const cap = isShot
          ? Number(p.shots_capacity || p.shotsCapacity || p.bottle_shots || local?.shots || 30)
          : 0;

        const localApp = appMap[String(p.id)] || appMap[String(p.product_code || p.productCode)];
        const resolvedApplicableFor = p.applicable_for || p.applicableFor || localApp || "both";

        return {
          ...p,
          shots_capacity: cap,
          shotsCapacity: cap,
          is_shot_item: Boolean(isShot),
          isShotItem: Boolean(isShot),
          applicable_for: resolvedApplicableFor,
          applicableFor: resolvedApplicableFor,
        };
      });

      setProducts(enriched);
    } catch (error) {
      console.error("Failed to fetch products:", error);

      setError(
        error.message || "Failed to load products"
      );
    }
  };

  // ============================================================
  // FETCH CATEGORIES
  // ============================================================

  const fetchCategories = async () => {
    try {
      const response = await api("/products/categories");

      setCategories(response.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);

      setError(
        error.message || "Failed to load categories"
      );
    }
  };

  // ============================================================
  // CREATE CATEGORY
  // ============================================================

  const handleCreateCategory = async (e) => {
    e?.preventDefault?.();
    const catName = categoryForm.name?.trim();
    if (!catName) {
      setCategoryModalError("Category name is required.");
      return;
    }

    try {
      setCategorySubmitting(true);
      setCategoryModalError("");
      setCategoryModalSuccess("");

      const response = await api("/products/categories", {
        method: "POST",
        body: JSON.stringify({
          name: catName,
          type: categoryForm.type || "food",
          description: categoryForm.description?.trim() || "",
        }),
      });

      const newCategory = response.category;
      await fetchCategories();

      if (newCategory?.id) {
        const nextCode = getNextProductCodeForCategory(
          newCategory.id,
          [...categories, newCategory],
          products
        );
        setForm((previous) => ({
          ...previous,
          categoryId: String(newCategory.id),
          productCode: nextCode || previous.productCode,
        }));
      }

      setCategoryModalSuccess(`Category "${catName}" created successfully!`);
      setTimeout(() => {
        setShowCategoryModal(false);
        setCategoryForm({ name: "", type: "food", description: "" });
        setCategoryModalSuccess("");
      }, 700);
    } catch (err) {
      console.error("Failed to create category:", err);
      setCategoryModalError(err.message || "Failed to create category");
    } finally {
      setCategorySubmitting(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => {
      const nextVal = type === "checkbox" ? checked : value;
      const updated = {
        ...previous,
        [name]: nextVal,
      };

      if (name === "categoryId") {
        const catObj = categories.find((c) => String(c.id) === String(value));
        const catType = (catObj?.type || catObj?.name || "").toLowerCase();
        if (catType.includes("food") || catType.includes("kitchen") || catType.includes("fruit")) {
          if (["bottle", "shot", "half_bottle"].includes(updated.unit)) {
            updated.unit = "plate";
          }
          updated.isShotItem = false;
        }

        // Auto-generate sequential product code based on selected category
        if (value && !editingProduct) {
          updated.productCode = getNextProductCodeForCategory(value, categories, products);
        }
      }

      return updated;
    });
  };

  // ============================================================
  // OPEN MODAL
  // ============================================================

  // ============================================================
  // FILE CHANGE & IMAGE PREVIEW
  // ============================================================

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedImage = () => {
    setImageFile(null);
    setImagePreview("");
    setForm((prev) => ({ ...prev, imageUrl: "" }));
  };

  // ============================================================
  // OPEN MODAL
  // ============================================================

  const openCreateModal = () => {
    setError("");
    setSuccess("");
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview("");
    setBasePriceInput("");

    const initialCatId = categories[0] ? String(categories[0].id) : "";
    const initialCode = initialCatId
      ? getNextProductCodeForCategory(initialCatId, categories, products)
      : "";

    setForm({
      productCode: initialCode,
      name: "",
      categoryId: initialCatId,
      tags: "",
      description: "",
      price: "",
      costPrice: 0,
      staffPrice: "",
      unit: "pcs",
      imageUrl: "",
      isAvailable: true,
      isActive: true,
      menuType: "both",
      isTodaysSpecial: false,
      shotsCapacity: "30",
      isShotItem: false,
      doubleShotPrice: "",
      halfBottlePrice: "",
      bottlePrice: "",
      allowSingleShot: true,
      allowDoubleShot: true,
      allowHalfBottle: true,
      allowFullBottle: true,
      applicableFor: "both",
    });

    setShowModal(true);
  };

  const openEditModal = (prod) => {
    setError("");
    setSuccess("");
    setEditingProduct(prod);
    setImageFile(null);
    setImagePreview(prod.image_url || prod.imageUrl || "");
    const prodPrice = Number(prod.price || 0);
    setBasePriceInput(prodPrice > 0 ? (prodPrice / 1.15).toFixed(2) : "");

    const localMap = getCustomShotsMap();
    const localData = localMap[String(prod.id)] || localMap[String(prod.product_code || prod.productCode)];
    const resolvedIsShotItem = Boolean(prod.is_shot_item === true || prod.isShotItem === true || localData?.isShotItem === true);
    const resolvedShots = String(
      prod.shots_capacity ??
      prod.shotsCapacity ??
      prod.bottle_shots ??
      localData?.shots ??
      (resolvedIsShotItem ? 30 : "")
    );

    const appMap = getProductApplicableMap();
    const localApp = appMap[String(prod.id)] || appMap[String(prod.product_code || prod.productCode)];
    const resolvedApplicableFor = prod.applicable_for || prod.applicableFor || localApp || "both";

    const resolvedDoubleShotPrice = prod.double_shot_price !== null && prod.double_shot_price !== undefined ? String(prod.double_shot_price) : (localData?.doubleShotPrice !== null && localData?.doubleShotPrice !== undefined ? String(localData.doubleShotPrice) : "");
    const resolvedHalfBottlePrice = prod.half_bottle_price !== null && prod.half_bottle_price !== undefined ? String(prod.half_bottle_price) : (localData?.halfBottlePrice !== null && localData?.halfBottlePrice !== undefined ? String(localData.halfBottlePrice) : "");
    const resolvedBottlePrice = prod.bottle_price !== null && prod.bottle_price !== undefined ? String(prod.bottle_price) : (localData?.bottlePrice !== null && localData?.bottlePrice !== undefined ? String(localData.bottlePrice) : "");

    const resolvedAllowSingle = prod.allow_single_shot !== undefined && prod.allow_single_shot !== null ? Boolean(prod.allow_single_shot) : (localData?.allowSingleShot !== undefined ? Boolean(localData.allowSingleShot) : true);
    const resolvedAllowDouble = prod.allow_double_shot !== undefined && prod.allow_double_shot !== null ? Boolean(prod.allow_double_shot) : (localData?.allowDoubleShot !== undefined ? Boolean(localData.allowDoubleShot) : true);
    const resolvedAllowHalf = prod.allow_half_bottle !== undefined && prod.allow_half_bottle !== null ? Boolean(prod.allow_half_bottle) : (localData?.allowHalfBottle !== undefined ? Boolean(localData.allowHalfBottle) : true);
    const resolvedAllowFull = prod.allow_full_bottle !== undefined && prod.allow_full_bottle !== null ? Boolean(prod.allow_full_bottle) : (localData?.allowFullBottle !== undefined ? Boolean(localData.allowFullBottle) : true);

    setForm({
      productCode: prod.product_code || prod.productCode || "",
      name: prod.name || "",
      categoryId: prod.category_id || prod.categoryId || "",
      tags: prod.tags || prod.tag || "",
      description: prod.description || "",
      price: prod.price || "",
      costPrice: prod.cost_price || prod.costPrice || 0,
      staffPrice: prod.staff_price || prod.staffPrice || "",
      unit: prod.unit || "pcs",
      imageUrl: prod.image_url || prod.imageUrl || "",
      isAvailable: prod.is_available ?? prod.isAvailable ?? true,
      isActive: prod.is_active ?? prod.isActive ?? true,
      menuType: prod.menu_type || prod.menuType || "both",
      isTodaysSpecial: prod.is_todays_special ?? prod.isTodaysSpecial ?? false,
      shotsCapacity: resolvedShots,
      isShotItem: Boolean(resolvedIsShotItem),
      doubleShotPrice: resolvedDoubleShotPrice,
      halfBottlePrice: resolvedHalfBottlePrice,
      bottlePrice: resolvedBottlePrice,
      allowSingleShot: resolvedAllowSingle,
      allowDoubleShot: resolvedAllowDouble,
      allowHalfBottle: resolvedAllowHalf,
      allowFullBottle: resolvedAllowFull,
      applicableFor: resolvedApplicableFor,
    });

    setShowModal(true);
  };

  // ============================================================
  // CLOSE MODAL
  // ============================================================

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
  };

  // ============================================================
  // CREATE / EDIT PRODUCT (MULTIPART FORM-DATA)
  // ============================================================

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!form.name.trim()) {
        throw new Error("Product name is required");
      }

      if (form.applicableFor !== "inventory" && form.price === "") {
        throw new Error("Selling price is required");
      }

      if (form.price !== "" && Number(form.price) < 0) {
        throw new Error("Selling price cannot be negative");
      }

      const parseNumStr = (val, fallback = "0") => {
        if (val === undefined || val === null || val === "" || String(val).toLowerCase() === "undefined" || isNaN(Number(val))) {
          return fallback;
        }
        return String(Number(val));
      };

      const safePrice = parseNumStr(form.price, "0");
      const safeCostPrice = parseNumStr(form.costPrice, "0");
      const safeStaffPrice = parseNumStr(form.staffPrice, "0");
      const isShotItemBool = Boolean(form.isShotItem);
      const safeShotsCapacity = isShotItemBool ? parseNumStr(form.shotsCapacity, "30") : "0";

      // Build FormData payload for multipart image upload (supports both camelCase & snake_case backend keys)
      const formData = new FormData();
      const code = (form.productCode || "").trim();
      if (code) {
        formData.append("productCode", code);
        formData.append("product_code", code);
      }

      formData.append("name", form.name.trim());
      formData.append("product_name", form.name.trim());

      if (form.categoryId) {
        formData.append("categoryId", String(form.categoryId));
        formData.append("category_id", String(form.categoryId));
      }

      if (form.description.trim()) {
        formData.append("description", form.description.trim());
      }

      formData.append("price", safePrice);
      formData.append("unit_price", safePrice);

      formData.append("costPrice", safeCostPrice);
      formData.append("cost_price", safeCostPrice);

      formData.append("staffPrice", safeStaffPrice);
      formData.append("staff_price", safeStaffPrice);

      formData.append("shotsCapacity", safeShotsCapacity);
      formData.append("shots_capacity", safeShotsCapacity);

      formData.append("isShotItem", String(isShotItemBool));
      formData.append("is_shot_item", String(isShotItemBool));

      const doubleShotVal = form.doubleShotPrice !== undefined && form.doubleShotPrice !== "" ? String(form.doubleShotPrice) : "";
      formData.append("doubleShotPrice", doubleShotVal);
      formData.append("double_shot_price", doubleShotVal);

      const halfBottleVal = form.halfBottlePrice !== undefined && form.halfBottlePrice !== "" ? String(form.halfBottlePrice) : "";
      formData.append("halfBottlePrice", halfBottleVal);
      formData.append("half_bottle_price", halfBottleVal);

      const bottleVal = form.bottlePrice !== undefined && form.bottlePrice !== "" ? String(form.bottlePrice) : "";
      formData.append("bottlePrice", bottleVal);
      formData.append("bottle_price", bottleVal);

      formData.append("allowSingleShot", String(form.allowSingleShot !== false));
      formData.append("allow_single_shot", String(form.allowSingleShot !== false));
      formData.append("allowDoubleShot", String(form.allowDoubleShot !== false));
      formData.append("allow_double_shot", String(form.allowDoubleShot !== false));
      formData.append("allowHalfBottle", String(form.allowHalfBottle !== false));
      formData.append("allow_half_bottle", String(form.allowHalfBottle !== false));
      formData.append("allowFullBottle", String(form.allowFullBottle !== false));
      formData.append("allow_full_bottle", String(form.allowFullBottle !== false));

      const appFor = form.applicableFor || "both";
      formData.append("applicableFor", appFor);
      formData.append("applicable_for", appFor);

      const safeTags = (form.tags || "").trim();
      formData.append("tags", safeTags);
      formData.append("tag", safeTags);

      formData.append("unit", form.unit || "pcs");
      formData.append("menuType", form.menuType || "both");
      formData.append("menu_type", form.menuType || "both");

      formData.append("isAvailable", String(form.isAvailable));
      formData.append("is_available", String(form.isAvailable));

      formData.append("isActive", String(form.isActive));
      formData.append("is_active", String(form.isActive));

      formData.append("isTodaysSpecial", String(form.isTodaysSpecial));
      formData.append("is_todays_special", String(form.isTodaysSpecial));

      if (form.imageUrl.trim()) {
        formData.append("imageUrl", form.imageUrl.trim());
        formData.append("image_url", form.imageUrl.trim());
      }

      // Attach file if selected from gallery
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const endpoint = editingProduct ? `/products/${editingProduct.id}` : "/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await api(endpoint, {
        method,
        body: formData,
      });

      // Persist custom shots and applicable_for immediately to local registry so it's instantly available
      const savedShotsNum = Number(safeShotsCapacity);
      const savedProdId = editingProduct?.id || res?.product?.id || res?.id || res?.data?.id;
      const extraPortionData = {
        doubleShotPrice: form.doubleShotPrice !== "" ? Number(form.doubleShotPrice) : null,
        halfBottlePrice: form.halfBottlePrice !== "" ? Number(form.halfBottlePrice) : null,
        bottlePrice: form.bottlePrice !== "" ? Number(form.bottlePrice) : null,
        allowSingleShot: form.allowSingleShot !== false,
        allowDoubleShot: form.allowDoubleShot !== false,
        allowHalfBottle: form.allowHalfBottle !== false,
        allowFullBottle: form.allowFullBottle !== false,
      };
      if (savedProdId) {
        setCustomProductShots(savedProdId, savedShotsNum, form.isShotItem, extraPortionData);
        setProductApplicableFor(savedProdId, appFor);
      }
      if (code) {
        setCustomProductShots(code, savedShotsNum, form.isShotItem, extraPortionData);
        setProductApplicableFor(code, appFor);
      }

      setSuccess(editingProduct ? "Product updated successfully." : "Product created successfully.");
      setShowModal(false);
      await fetchProducts();

    } catch (error) {
      console.error(
        "Save product error:",
        error
      );

      setError(
        error.message ||
          "Failed to save product"
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // FAST INLINE MENU TOGGLE
  // ============================================================

  const handleToggleMenuSetting = async (product, payload) => {
    try {
      // Optimistic state update
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ...payload } : p))
      );

      await api(`/products/${product.id}/menu`, {
        method: "PUT",
        body: JSON.stringify({
          menuType: payload.menu_type !== undefined ? payload.menu_type : product.menu_type,
          isAvailable: payload.is_available !== undefined ? payload.is_available : product.is_available,
          isTodaysSpecial: payload.is_todays_special !== undefined ? payload.is_todays_special : product.is_todays_special,
          staffPrice: payload.staff_price !== undefined ? payload.staff_price : product.staff_price,
        }),
      });
    } catch (err) {
      console.error("Failed to update menu setting:", err);
      setError("Failed to update menu setting.");
      await fetchProducts();
    }
  };

  // ============================================================
  // FILTER PRODUCTS
  // ============================================================

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchText =
        search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        product.name
          ?.toLowerCase()
          .includes(searchText) ||
        product.product_code
          ?.toLowerCase()
          .includes(searchText);

      const matchesCategory =
        categoryFilter === "all" ||
        String(product.category_id) === String(categoryFilter) ||
        ((categoryFilter === "food" || categoryFilter === "group_food") && (
          (product.category_type || "").toLowerCase() === "food" ||
          (product.category_name || "").toLowerCase().includes("food") ||
          (product.category_name || "").toLowerCase().includes("kitchen")
        )) ||
        (categoryFilter === "group_fruit" && (
          (product.category_name || "").toLowerCase().includes("fruit") ||
          (product.category_type || "").toLowerCase().includes("fruit") ||
          (product.name || "").toLowerCase().includes("fruit")
        )) ||
        ((categoryFilter === "drink" || categoryFilter === "group_bar") && (
          (product.category_type || "").toLowerCase() === "bar" ||
          (product.category_type || "").toLowerCase() === "beverage" ||
          (product.category_name || "").toLowerCase().includes("bar") ||
          (product.category_name || "").toLowerCase().includes("drink") ||
          (product.category_name || "").toLowerCase().includes("beer") ||
          (product.category_name || "").toLowerCase().includes("wine")
        )) ||
        (categoryFilter === "inventory" && (
          (product.category_type || "").toLowerCase() === "inventory" ||
          (product.category_name || "").toLowerCase().includes("inventory") ||
          (product.applicable_for || "").toLowerCase() === "inventory"
        ));

      const prodApp = (product.applicable_for || product.applicableFor || "both").toLowerCase();
      const matchesApplicable =
        applicableFilter === "all" ||
        prodApp === applicableFilter.toLowerCase();

      const pTags = (product.tags || product.tag || "").toLowerCase();
      const selTag = selectedTagFilter.toLowerCase().trim();
      const matchesTag =
        selTag === "all" ||
        pTags.includes(selTag) ||
        (selTag === "fruit" && ((product.category_name || "").toLowerCase().includes("fruit") || product.name?.toLowerCase().includes("fruit"))) ||
        (selTag === "beer" && ((product.category_name || "").toLowerCase().includes("beer") || product.name?.toLowerCase().includes("beer"))) ||
        (selTag === "juice" && ((product.category_name || "").toLowerCase().includes("juice") || product.name?.toLowerCase().includes("juice"))) ||
        (selTag === "wine" && ((product.category_name || "").toLowerCase().includes("wine") || product.name?.toLowerCase().includes("wine"))) ||
        (selTag === "whiskey" && ((product.category_name || "").toLowerCase().includes("whiskey") || (product.category_name || "").toLowerCase().includes("spirit") || product.name?.toLowerCase().includes("whiskey")));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesApplicable &&
        matchesTag
      );
    });
  }, [
    products,
    search,
    categoryFilter,
    selectedTagFilter,
    applicableFilter,
  ]);

  // Standard 3-Department Category Architecture: Food, Drink, Inventory
  const standardCategories = useMemo(() => {
    const foodCat = categories.find(
      (c) => (c.name || "").toLowerCase() === "food" || (c.type || "").toLowerCase() === "food"
    );
    const drinkCat = categories.find(
      (c) =>
        (c.name || "").toLowerCase() === "drink" ||
        (c.type || "").toLowerCase() === "bar" ||
        (c.type || "").toLowerCase() === "beverage"
    );
    const invCat = categories.find(
      (c) =>
        (c.name || "").toLowerCase() === "inventory" ||
        (c.type || "").toLowerCase() === "inventory" ||
        (c.name || "").toLowerCase() === "store" ||
        (c.type || "").toLowerCase() === "supply"
    );

    const list = [];
    if (foodCat) list.push({ ...foodCat, name: "Food", type: "food" });
    if (drinkCat) list.push({ ...drinkCat, name: "Drink", type: "bar" });
    if (invCat) list.push({ ...invCat, name: "Inventory", type: "inventory" });

    if (list.length === 0) {
      return categories.filter((c) => {
        const n = (c.name || "").toLowerCase();
        return n === "food" || n === "drink" || n === "inventory";
      });
    }

    return list;
  }, [categories]);

  // Dynamic tags list with live item counts
  const availableTags = useMemo(() => {
    const tagMap = new Map();
    products.forEach((p) => {
      const rawTags = (p.tags || p.tag) ? String(p.tags || p.tag).split(",") : [];
      if (rawTags.length === 0) {
        const pName = (p.name || "").toLowerCase();
        const cName = (p.category_name || "").toLowerCase();
        if (pName.includes("fruit") || cName.includes("fruit")) rawTags.push("Fruit");
        else if (pName.includes("beer") || cName.includes("beer")) rawTags.push("Beer");
        else if (pName.includes("juice") || cName.includes("juice")) rawTags.push("Juice");
        else if (pName.includes("wine") || cName.includes("wine")) rawTags.push("Wine");
        else if (pName.includes("whiskey") || cName.includes("whiskey") || cName.includes("spirit")) rawTags.push("Whiskey");
        else if (pName.includes("salad") || cName.includes("salad")) rawTags.push("Salad");
        else if (pName.includes("burger") || pName.includes("pizza") || cName.includes("fast")) rawTags.push("Fast Food");
      }
      rawTags.forEach((t) => {
        const clean = t.trim();
        if (clean) {
          tagMap.set(clean, (tagMap.get(clean) || 0) + 1);
        }
      });
    });

    customTagsList.forEach((ct) => {
      const clean = (ct || "").trim();
      if (clean && !tagMap.has(clean)) {
        tagMap.set(clean, 0);
      }
    });

    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products, customTagsList]);

  // All known tags (base suggestions + products' tags + user custom tags)
  const allKnownTags = useMemo(() => {
    const set = new Set();
    const baseTags = [
      "Fruit",
      "Beer",
      "Juice",
      "Soft Drink",
      "Wine",
      "Whiskey",
      "Vodka",
      "Gin",
      "Cocktail",
      "Water",
      "Coffee",
      "Main Dish",
      "Fast Food",
      "Salad",
      "Breakfast",
      "Appetizer",
      "Dessert",
      "Snacks",
    ];
    baseTags.forEach((t) => set.add(t));
    products.forEach((p) => {
      const raw = (p.tags || p.tag || "").split(",");
      raw.forEach((t) => {
        const clean = t.trim();
        if (clean) set.add(clean);
      });
    });
    customTagsList.forEach((t) => {
      const clean = (t || "").trim();
      if (clean) set.add(clean);
    });
    return Array.from(set);
  }, [products, customTagsList]);

  // Filtered tag pills for modal, prioritized by current selected department
  const displayedTagPills = useMemo(() => {
    const curCat = categories.find((c) => String(c.id) === String(form.categoryId));
    const curType = (curCat?.type || "").toLowerCase();
    const curName = (curCat?.name || "").toLowerCase();

    const isDrink = curType === "bar" || curType === "beverage" || curName.includes("bar") || curName.includes("drink");
    const isFood = curType === "food" || curName.includes("food") || curName.includes("kitchen");

    if (isDrink) {
      const drinkDefaults = ["Beer", "Soft Drink", "Juice", "Wine", "Whiskey", "Vodka", "Gin", "Cocktail", "Water", "Coffee"];
      const others = allKnownTags.filter((t) => !drinkDefaults.some((d) => d.toLowerCase() === t.toLowerCase()));
      return [...drinkDefaults, ...others];
    }
    if (isFood) {
      const foodDefaults = ["Fruit", "Main Dish", "Fast Food", "Salad", "Breakfast", "Appetizer", "Dessert", "Snacks"];
      const others = allKnownTags.filter((t) => !foodDefaults.some((d) => d.toLowerCase() === t.toLowerCase()));
      return [...foodDefaults, ...others];
    }
    return allKnownTags;
  }, [allKnownTags, categories, form.categoryId]);

  // ============================================================
  // SUMMARY
  // ============================================================

  const totalProducts = products.length;

  const availableProducts = products.filter(
    (product) => product.is_available
  ).length;

  const foodProducts = products.filter(
    (product) =>
      product.category_type === "food" ||
      (product.category_name || "").toLowerCase().includes("food") ||
      (product.category_name || "").toLowerCase().includes("kitchen")
  ).length;

  const barProducts = products.filter(
    (product) =>
      product.category_type === "bar" ||
      product.category_type === "beverage" ||
      (product.category_name || "").toLowerCase().includes("bar") ||
      (product.category_name || "").toLowerCase().includes("drink")
  ).length;

  const inventoryProducts = products.filter(
    (product) =>
      product.category_type === "inventory" ||
      (product.category_name || "").toLowerCase().includes("inventory") ||
      (product.applicable_for || "").toLowerCase() === "inventory"
  ).length;

  // ============================================================
  // CATEGORY ICON
  // ============================================================

  const getCategoryIcon = (type, name = "") => {
    const t = (type || "").toLowerCase();
    const n = (name || "").toLowerCase();
    if (t.includes("fruit") || n.includes("fruit")) {
      return Apple;
    }
    switch (t) {
      case "food":
        return Utensils;

      case "bar":
        return Wine;

      case "drink":
      case "beverage":
        return Coffee;

      default:
        return Package;
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading products...
        </div>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Products & Menu Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage food & drinks catalog, customer menus, staff meal rules, and daily specials.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />

          Add Product
        </button>

      </div>

      {/* ======================================================
          TOP TAB SWITCHER (CATALOG vs DAILY MENU MANAGER)
      ====================================================== */}

      <div className="flex border-b border-slate-200">

        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "catalog"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Package className="h-4 w-4" />
          Master Catalog ({products.length})
        </button>

        <button
          onClick={() => setActiveTab("menu")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "menu"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Daily Menu Manager (Customer vs Staff)
        </button>

      </div>

      {/* ======================================================
          SUCCESS
      ====================================================== */}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5" />

          {success}
        </div>
      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <XCircle className="h-5 w-5" />

          {error}

          <button
            onClick={() => setError("")}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

        <SummaryCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
        />

        <SummaryCard
          title="Available"
          value={availableProducts}
          icon={CheckCircle2}
        />

        <SummaryCard
          title="Food"
          value={foodProducts}
          icon={Utensils}
        />

        <SummaryCard
          title="Bar"
          value={barProducts}
          icon={Wine}
        />

      </div>

      {/* ======================================================
          PRODUCTS CONTAINER (CATALOG vs MENU MANAGER)
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

        {/* Toolbar */}

        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">

          {/* Search */}

          <div className="relative w-full md:max-w-sm">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />

          </div>

          <div className="flex flex-wrap items-center gap-3">

            {/* Menu Audience Filter (Only in Menu Tab) */}

            {activeTab === "menu" && (
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">

                <button
                  type="button"
                  onClick={() => setMenuAudienceFilter("all")}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    menuAudienceFilter === "all"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All Items
                </button>

                <button
                  type="button"
                  onClick={() => setMenuAudienceFilter("customer")}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold transition ${
                    menuAudienceFilter === "customer"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Customer Menu
                </button>

                <button
                  type="button"
                  onClick={() => setMenuAudienceFilter("employee")}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold transition ${
                    menuAudienceFilter === "employee"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Employee Menu
                </button>

              </div>
            )}

            {/* Category Filter */}

            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
            >

              <option value="all">
                All Categories
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}

            </select>

            {/* Purpose / Applicable Filter */}
            <select
              value={applicableFilter}
              onChange={(e) => setApplicableFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="all">All Purposes</option>
              <option value="both">🔄 Sales & Stock</option>
              <option value="sales">💳 POS Sales Only</option>
              <option value="inventory">📦 Raw Inventory / Ingredients</option>
            </select>

          </div>

        </div>

        {/* Category Quick-Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            <Tag className="h-3.5 w-3.5" />
            Categories:
          </span>

          {/* All */}
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
              categoryFilter === "all"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            All Products
            <span className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
              categoryFilter === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {products.length}
            </span>
          </button>

          {/* Food Group */}
          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === "group_food" ? "all" : "group_food")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
              categoryFilter === "group_food"
                ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Utensils className="h-3.5 w-3.5 text-amber-500" />
            Food & Kitchen
            <span className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
              categoryFilter === "group_food" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {foodProducts}
            </span>
          </button>

          {/* Fruit Group */}
          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === "group_fruit" ? "all" : "group_fruit")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
              categoryFilter === "group_fruit"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Apple className="h-3.5 w-3.5 text-emerald-500" />
            Fruit
            <span className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
              categoryFilter === "group_fruit" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {products.filter((p) => (p.category_name || "").toLowerCase().includes("fruit") || (p.name || "").toLowerCase().includes("fruit")).length}
            </span>
          </button>

          {/* Bar Group */}
          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === "group_bar" ? "all" : "group_bar")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
              categoryFilter === "group_bar"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-600/20"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Wine className="h-3.5 w-3.5 text-purple-500" />
            Bar & Drinks
            <span className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
              categoryFilter === "group_bar" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {barProducts}
            </span>
          </button>

          {/* Individual Dynamic Categories */}
          {categories.map((cat) => {
            const count = products.filter(
              (p) => String(p.category_id) === String(cat.id)
            ).length;
            const isCatActive = String(categoryFilter) === String(cat.id);
            const CatIcon = getCategoryIcon(cat.type, cat.name);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(isCatActive ? "all" : String(cat.id))}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                  isCatActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                <CatIcon className="h-3.5 w-3.5" />
                {cat.name}
                <span className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                  isCatActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Specific Tags Quick-Filter Bar */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 scrollbar-thin">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              <Tag className="h-3 w-3 text-blue-500" />
              Tags:
            </span>

            {/* All Tags */}
            <button
              type="button"
              onClick={() => setSelectedTagFilter("all")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition shrink-0 ${
                selectedTagFilter === "all"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              All Tags
            </button>

            {availableTags.map((tag) => {
              const isTagActive = selectedTagFilter.toLowerCase() === tag.name.toLowerCase();
              return (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => setSelectedTagFilter(isTagActive ? "all" : tag.name.toLowerCase())}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition shrink-0 ${
                    isTagActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  #{tag.name}
                  <span
                    className={`ml-0.5 rounded-full px-1 py-0.1 text-[9px] font-extrabold ${
                      isTagActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tag.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Table / Content */}

        {filteredProducts.length === 0 ? (

          <div className="flex h-56 flex-col items-center justify-center">

            <Package className="mb-3 h-10 w-10 text-slate-300" />

            <p className="text-sm font-medium text-slate-500">
              No products found
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Create your first product or adjust search filters.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                <tr>

                  <th className="px-5 py-4">
                    Product
                  </th>

                  <th className="px-5 py-4">
                    Category
                  </th>

                  <th className="px-5 py-4">
                    Applicable For
                  </th>

                  <th className="px-5 py-4">
                    Customer Price
                  </th>

                  <th className="px-5 py-4">
                    Staff Price
                  </th>

                  <th className="px-5 py-4">
                    Menu Audience
                  </th>

                  {activeTab === "menu" && (
                    <th className="px-5 py-4 text-center">
                      Today's Special
                    </th>
                  )}

                  <th className="px-5 py-4 text-center">
                    Available Today
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredProducts
                  .filter((product) => {
                    if (activeTab !== "menu" || menuAudienceFilter === "all") return true;
                    const scope = product.menu_type || "both";
                    if (menuAudienceFilter === "customer") return scope === "customer" || scope === "both";
                    if (menuAudienceFilter === "employee") return scope === "employee" || scope === "both";
                    return true;
                  })
                  .map((product) => {

                    const CategoryIcon =
                      getCategoryIcon(
                        product.category_type,
                        product.category_name
                      );

                    const menuScope = product.menu_type || "both";

                    return (
                      <tr
                        key={product.id}
                        onClick={() => openEditModal(product)}
                        className="transition hover:bg-slate-100/80 cursor-pointer active:bg-slate-200/60"
                        title="Click to view & edit product price and details"
                      >

                        {/* Product */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 overflow-hidden">

                              {(product.image_url || product.imageUrl) ? (
                                <img
                                  src={formatImageUrl(product.image_url || product.imageUrl)}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <CategoryIcon className="h-5 w-5" />
                              )}

                              {product.is_todays_special && (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                                  <Star className="h-2.5 w-2.5 fill-white" />
                                </span>
                              )}

                            </div>

                            <div>

                              <div className="flex items-center gap-2">

                                <p className="font-semibold text-slate-900">
                                  {product.name}
                                </p>

                                {product.is_todays_special && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    Special
                                  </span>
                                )}

                              </div>

                              {product.product_code && (
                                <p className="text-xs text-slate-400">
                                  {product.product_code}
                                </p>
                              )}

                            </div>

                          </div>

                        </td>

                        {/* Category */}

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700">
                              {product.category_name || "Uncategorized"}
                            </span>
                            {(product.tags || product.tag) && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                <Tag className="h-2.5 w-2.5" />
                                {product.tags || product.tag}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Applicable For Column */}
                        <td className="px-5 py-4">
                          {((product.applicable_for || product.applicableFor || "both").toLowerCase() === "inventory") ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                              <Package className="h-3 w-3 text-amber-600" />
                              Raw Inventory
                            </span>
                          ) : ((product.applicable_for || product.applicableFor || "both").toLowerCase() === "sales") ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              POS Sales Only
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                              <span className="h-2 w-2 rounded-full bg-blue-500" />
                              Sales & Stock
                            </span>
                          )}
                        </td>

                        {/* Customer Price */}

                        <td className="px-5 py-4 font-semibold text-slate-900">

                          {Number(
                            product.price || 0
                          ).toLocaleString()}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            ETB / {product.unit || "pcs"}
                          </span>

                          {Boolean(product.is_shot_item || product.isShotItem) && Number(product.shots_capacity || product.shotsCapacity) > 0 && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-purple-700 border border-purple-200">
                                🥃 {product.shots_capacity || product.shotsCapacity || 30} Shots/Bottle
                              </span>
                            </div>
                          )}

                        </td>

                        {/* Staff Price */}

                        <td className="px-5 py-4 font-medium text-slate-700">

                          {Number(product.staff_price || 0) === 0 ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                              Free (0 ETB)
                            </span>
                          ) : (
                            <span>
                              {Number(product.staff_price).toLocaleString()} ETB
                            </span>
                          )}

                        </td>

                        {/* Menu Audience Toggle */}

                        <td className="px-5 py-4">

                          {activeTab === "menu" ? (
                            <select
                              value={menuScope}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                handleToggleMenuSetting(product, {
                                  menu_type: e.target.value,
                                })
                              }
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                            >
                              <option value="both">Both (Cust & Staff)</option>
                              <option value="customer">Customer Only</option>
                              <option value="employee">Employee Only</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                menuScope === "customer"
                                  ? "bg-blue-100 text-blue-800"
                                  : menuScope === "employee"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {menuScope === "customer"
                                ? "Customer Only"
                                : menuScope === "employee"
                                ? "Employee Only"
                                : "Both"}
                            </span>
                          )}

                        </td>

                        {/* Today's Special Toggle (Menu Tab) */}

                        {activeTab === "menu" && (
                          <td className="px-5 py-4 text-center">

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleMenuSetting(product, {
                                  is_todays_special: !product.is_todays_special,
                                });
                              }}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                product.is_todays_special
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  product.is_todays_special
                                    ? "fill-amber-500 text-amber-500"
                                    : ""
                                }`}
                              />
                              {product.is_todays_special ? "Special" : "Normal"}
                            </button>

                          </td>
                        )}

                        {/* Available Today Switch */}

                        <td className="px-5 py-4 text-center">

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMenuSetting(product, {
                                is_available: !product.is_available,
                              });
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                              product.is_available
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                          >

                            <span
                              className={`h-2 w-2 rounded-full ${
                                product.is_available
                                  ? "bg-emerald-500"
                                  : "bg-red-500"
                              }`}
                            />

                            {product.is_available ? "Available" : "Sold Out"}

                          </button>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ======================================================
          CREATE PRODUCT MODAL
      ====================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* Modal Header */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingProduct
                    ? "Update product details, pricing, and system purpose."
                    : "Create a food, drink, bar product, or raw inventory item."}
                </p>

              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* Form */}

            <form
              onSubmit={handleCreateProduct}
              className="space-y-5 p-6"
            >

              {/* Name + Code */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Product Name *">

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Classic Burger"
                    required
                    className={inputClass}
                  />

                </FormField>

                <FormField
                  label={
                    <span className="flex items-center justify-between w-full">
                      <span>Product Code</span>
                      {form.categoryId && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = getNextProductCodeForCategory(form.categoryId, categories, products);
                            setForm((prev) => ({ ...prev, productCode: next }));
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <Sparkles className="h-3 w-3" />
                          Auto-generate
                        </button>
                      )}
                    </span>
                  }
                >

                  <div className="relative">
                    <input
                      name="productCode"
                      value={form.productCode}
                      onChange={handleChange}
                      placeholder="e.g. FD-001"
                      className={`${inputClass} pr-14`}
                    />
                    {form.productCode && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 uppercase tracking-wide pointer-events-none">
                        Auto
                      </span>
                    )}
                  </div>

                </FormField>

              </div>

              {/* Category + Applicable For (Side by Side) */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Category *">

                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    className={inputClass}
                  >

                    <option value="">
                      Select category
                    </option>

                    {standardCategories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      )
                    )}

                    {editingProduct &&
                      form.categoryId &&
                      !standardCategories.some((c) => String(c.id) === String(form.categoryId)) && (
                        <option value={form.categoryId}>
                          {categories.find((c) => String(c.id) === String(form.categoryId))?.name || "Current Category"}
                        </option>
                      )}

                  </select>

                </FormField>

                <FormField label="Applicable For *">

                  <select
                    name="applicableFor"
                    value={form.applicableFor || "both"}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="both">Both Sales And Inventory</option>
                    <option value="sales">Sales (POS Menu Item Only)</option>
                    <option value="inventory">Inventory (Raw Material / Ingredient)</option>
                  </select>

                </FormField>

              </div>

              {/* Specific Category Tag Input & Customizable Tags */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-blue-600" />
                    Specific Category Tag (Subcategory)
                  </label>
                  {form.tags && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, tags: "" }))}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 hover:underline cursor-pointer"
                    >
                      Clear tag
                    </button>
                  )}
                </div>

                {/* Tag Input + Add New Tag Button */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      name="tags"
                      placeholder="Type custom tag or pick below..."
                      value={form.tags || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          tags: val,
                          productCode: !editingProduct && prev.categoryId
                            ? getNextProductCodeForCategory(prev.categoryId, categories, products, val)
                            : prev.productCode,
                        }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = form.tags?.trim();
                          if (val) {
                            saveCustomTag(val);
                            setCustomTagsList(getCustomTags());
                          }
                        }
                      }}
                      className={inputClass}
                    />
                  </div>

                  {form.tags?.trim() && !allKnownTags.some((t) => t.toLowerCase() === form.tags.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => {
                        const val = form.tags.trim();
                        saveCustomTag(val);
                        setCustomTagsList(getCustomTags());
                      }}
                      className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Save Tag
                    </button>
                  )}
                </div>

                {/* Available Customizable Tag Pills */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>Tags (click to assign / remove custom):</span>
                    <span className="text-[10px] text-slate-400">Type & click "Save Tag" to create new</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto scrollbar-thin pr-1">
                    {displayedTagPills.map((t) => {
                      const isSelected = (form.tags || "").toLowerCase() === t.toLowerCase();
                      const isUserCustom = customTagsList.some((ct) => ct.toLowerCase() === t.toLowerCase());

                      return (
                        <div
                          key={t}
                          className={`inline-flex items-center rounded-lg border transition shadow-2xs text-[11px] font-bold overflow-hidden ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                tags: t,
                                productCode: !editingProduct && prev.categoryId
                                  ? getNextProductCodeForCategory(prev.categoryId, categories, products, t)
                                  : prev.productCode,
                              }));
                            }}
                            className="px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isSelected ? "✓" : "+"}</span>
                            <span>{t}</span>
                          </button>

                          {isUserCustom && (
                            <button
                              type="button"
                              title="Delete custom tag"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCustomTag(t);
                                setCustomTagsList(getCustomTags());
                                if ((form.tags || "").toLowerCase() === t.toLowerCase()) {
                                  setForm((prev) => ({ ...prev, tags: "" }));
                                }
                              }}
                              className={`px-1.5 py-1 border-l hover:bg-black/10 transition cursor-pointer ${
                                isSelected ? "border-blue-500 text-white/80 hover:text-white" : "border-slate-200 text-slate-400 hover:text-rose-600"
                              }`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Applicable For Indicator Banner */}
              <div>
                {form.applicableFor === "inventory" ? (
                  <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                    <span className="font-bold flex items-center gap-1 mb-0.5">📦 Raw Material / Ingredient</span>
                    Tracked in stock & purchasing. Automatically hidden from the POS waiter screen.
                  </div>
                ) : form.applicableFor === "sales" ? (
                  <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900">
                    <span className="font-bold flex items-center gap-1 mb-0.5">💳 POS Sales Only</span>
                    Sold at POS without tracking single retail stock units.
                  </div>
                ) : (
                  <div className="w-full rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900">
                    <span className="font-bold flex items-center gap-1 mb-0.5">🔄 Both Sales & Inventory</span>
                    Sold on POS and automatically decrements inventory count when ordered.
                  </div>
                )}
              </div>

              {/* Portion / Unit & Staff Price */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Portion / Unit">

                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <optgroup label="🍽️ Food & Kitchen Servings">
                      <option value="plate">Plate (Main dishes / Food meals)</option>
                      <option value="portion">Portion (Salads / Appetizers / Sides)</option>
                      <option value="bowl">Bowl (Soups / Stews)</option>
                      <option value="pcs">Pieces / pcs (Burgers / Sambusa / Shisha)</option>
                    </optgroup>

                    <optgroup label="🍸 Bar & Beverage Servings">
                      <option value="bottle">Full Bottle (Liquor / Wine / Beer)</option>
                      <option value="half_bottle">Half Bottle</option>
                      <option value="glass">Glass (Cocktails / Wine)</option>
                      <option value="shot">Shot Glass (Spirits / Liquor)</option>
                      <option value="can">Can (Soft Drinks / Canned Beer)</option>
                      <option value="cup">Cup (Coffee / Tea)</option>
                    </optgroup>

                    <optgroup label="⚖️ Volume & Bulk Weight">
                      <option value="liter">Liter (l)</option>
                      <option value="kg">Kilogram (kg)</option>
                    </optgroup>
                  </select>

                </FormField>

                <FormField label="Staff Price (ETB)">

                  <input
                    type="number"
                    name="staffPrice"
                    value={form.staffPrice}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={inputClass}
                  />

                </FormField>

              </div>

              {/* Prices with Live VAT Auto-Calculation */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Customer Price (Menu Price Incl. 15% VAT) *">

                  <div className="relative">
                    <input
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((prev) => ({ ...prev, price: val }));
                        if (val !== "" && !isNaN(Number(val))) {
                          const base = (Number(val) / 1.15).toFixed(2);
                          setBasePriceInput(base);
                        } else {
                          setBasePriceInput("");
                        }
                      }}
                      placeholder="e.g. 500 or 25000"
                      min="0"
                      step="0.01"
                      required
                      className={inputClass}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-blue-600 font-medium">
                    Type selling price here. POS & receipts will show this amount.
                  </p>

                </FormField>

                <FormField label="Base Price (Net Excl. 15% VAT)">

                  <div className="relative">
                    <input
                      type="number"
                      value={basePriceInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBasePriceInput(val);
                        if (val !== "" && !isNaN(Number(val))) {
                          const finalWithVat = (Number(val) * 1.15).toFixed(2);
                          setForm((prev) => ({ ...prev, price: finalWithVat }));
                        } else {
                          setForm((prev) => ({ ...prev, price: "" }));
                        }
                      }}
                      placeholder="Auto-calculated (e.g. 434.78)"
                      min="0"
                      step="0.01"
                      className={`${inputClass} pr-16 bg-slate-50`}
                    />
                    {basePriceInput && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide pointer-events-none">
                        -15% VAT
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Automatically calculated net revenue after deducting 15% VAT.
                  </p>

                </FormField>

              </div>

              {/* VAT Live Preview Card */}
              {Number(form.price) > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 shadow-sm">
                  <p className="font-bold text-emerald-900 text-xs mb-1.5 flex items-center gap-1.5">
                    ✨ Live 15% VAT Deduction Breakdown (Ethiopian Standard)
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>Customer Pays (Menu Price):</span>
                      <span className="font-mono text-blue-700 font-bold">{Number(form.price).toFixed(2)} ETB</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>- 15% VAT Deducted (Tax Amount):</span>
                      <span className="font-mono font-medium">-{(Number(form.price) - Number(form.price) / 1.15).toFixed(2)} ETB</span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-1.5 font-bold text-emerald-950 text-sm">
                      <span>= Net Base Price (Your Income):</span>
                      <span className="font-mono text-emerald-700">{(Number(form.price) / 1.15).toFixed(2)} ETB</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Scope & Today's Special */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Menu Assignment">

                  <select
                    name="menuType"
                    value={form.menuType || "both"}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="both">
                      Both (Customers & Employees)
                    </option>
                    <option value="customer">
                      Customer Only
                    </option>
                    <option value="employee">
                      Employee / Staff Only
                    </option>
                  </select>

                </FormField>

                <div className="flex items-end">

                  <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-3">

                    <div className="flex items-center gap-2">

                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />

                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          Today's Special
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Highlight in POS & Menu
                        </p>
                      </div>

                    </div>

                    <input
                      type="checkbox"
                      name="isTodaysSpecial"
                      checked={form.isTodaysSpecial}
                      onChange={handleChange}
                      className="h-4 w-4 accent-amber-500"
                    />

                  </label>

                </div>

              </div>

              {/* Spirit & Liquor Portion Configuration (Only shown for beverage/spirits or if enabled) */}
              {(() => {
                const selectedCat = categories.find((c) => String(c.id) === String(form.categoryId));
                const catType = (selectedCat?.type || selectedCat?.name || "").toLowerCase();
                const isFoodCategory = catType.includes("food") || catType.includes("kitchen") || catType.includes("fruit");
                if (isFoodCategory && !form.isShotItem) return null;

                return (
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wine className="h-5 w-5 text-purple-600" />
                        <div>
                          <h4 className="text-xs font-extrabold text-purple-900 uppercase tracking-wider">
                            Spirit / Liquor Shot & Bottle Setup
                          </h4>
                          <p className="text-[11px] text-purple-700">
                            Configure custom shots per bottle (Single/Double Shot, Half & Full Bottle)
                          </p>
                        </div>
                      </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">
                      Enable Portion Items
                    </span>
                    <input
                      type="checkbox"
                      name="isShotItem"
                      checked={form.isShotItem}
                      onChange={handleChange}
                      className="h-4 w-4 rounded-sm accent-purple-600 cursor-pointer"
                    />
                  </label>
                </div>

                {form.isShotItem ? (
                  <div className="space-y-4 pt-2 border-t border-purple-200/60">
                    {/* AVAILABLE PORTION SIZES CHECKBOXES */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-purple-950 block">
                        Available Serving Sizes on POS / Order Page:
                      </label>
                      <p className="text-[11px] text-purple-700">
                        Select which portions can be ordered (e.g. uncheck Single/Double for Wine or Champagne served only as Half &amp; Full Bottle).
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <label className={`flex items-center gap-2 rounded-xl p-2.5 border cursor-pointer transition select-none ${form.allowSingleShot ? "bg-white border-purple-500 shadow-xs ring-1 ring-purple-500/20" : "bg-slate-100/70 border-slate-200 opacity-60"}`}>
                          <input type="checkbox" name="allowSingleShot" checked={form.allowSingleShot} onChange={handleChange} className="h-4 w-4 rounded-sm accent-purple-600 cursor-pointer" />
                          <span className="text-xs font-bold text-slate-800">🥃 Single Shot</span>
                        </label>
                        <label className={`flex items-center gap-2 rounded-xl p-2.5 border cursor-pointer transition select-none ${form.allowDoubleShot ? "bg-white border-purple-500 shadow-xs ring-1 ring-purple-500/20" : "bg-slate-100/70 border-slate-200 opacity-60"}`}>
                          <input type="checkbox" name="allowDoubleShot" checked={form.allowDoubleShot} onChange={handleChange} className="h-4 w-4 rounded-sm accent-purple-600 cursor-pointer" />
                          <span className="text-xs font-bold text-slate-800">🥃🥃 Double Shot</span>
                        </label>
                        <label className={`flex items-center gap-2 rounded-xl p-2.5 border cursor-pointer transition select-none ${form.allowHalfBottle ? "bg-white border-purple-500 shadow-xs ring-1 ring-purple-500/20" : "bg-slate-100/70 border-slate-200 opacity-60"}`}>
                          <input type="checkbox" name="allowHalfBottle" checked={form.allowHalfBottle} onChange={handleChange} className="h-4 w-4 rounded-sm accent-purple-600 cursor-pointer" />
                          <span className="text-xs font-bold text-slate-800">🍾 Half Bottle</span>
                        </label>
                        <label className={`flex items-center gap-2 rounded-xl p-2.5 border cursor-pointer transition select-none ${form.allowFullBottle ? "bg-white border-purple-500 shadow-xs ring-1 ring-purple-500/20" : "bg-slate-100/70 border-slate-200 opacity-60"}`}>
                          <input type="checkbox" name="allowFullBottle" checked={form.allowFullBottle} onChange={handleChange} className="h-4 w-4 rounded-sm accent-purple-600 cursor-pointer" />
                          <span className="text-xs font-bold text-slate-800">🍾🍾 Full Bottle</span>
                        </label>
                      </div>
                    </div>

                    {/* BOTTLE CAPACITY & CUSTOM PORTION PRICING INPUTS */}
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                      <FormField label="Bottle Capacity (Shots) *">
                        <input
                          type="number"
                          name="shotsCapacity"
                          value={form.shotsCapacity ?? ""}
                          onChange={handleChange}
                          placeholder="e.g. 25, 30, 40"
                          min="1"
                          step="1"
                          className="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm font-extrabold text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 shadow-xs"
                        />
                      </FormField>

                      {form.allowDoubleShot && (
                        <FormField label="Custom Double Shot Price (ETB)">
                          <input
                            type="number"
                            name="doubleShotPrice"
                            value={form.doubleShotPrice ?? ""}
                            onChange={handleChange}
                            placeholder={Number(form.price) > 0 ? `Auto: ${(Number(form.price) * 2).toFixed(0)} ETB` : "Optional"}
                            min="0"
                            step="0.01"
                            className="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm font-bold text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 shadow-xs"
                          />
                        </FormField>
                      )}

                      {form.allowHalfBottle && (
                        <FormField label="Custom Half Bottle Price (ETB)">
                          <input
                            type="number"
                            name="halfBottlePrice"
                            value={form.halfBottlePrice ?? ""}
                            onChange={handleChange}
                            placeholder={Number(form.price) > 0 ? `Auto: ${(Number(form.price) * Math.max(1, Math.round(Number(form.shotsCapacity || 30) / 2))).toFixed(0)} ETB` : "Optional"}
                            min="0"
                            step="0.01"
                            className="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm font-bold text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 shadow-xs"
                          />
                        </FormField>
                      )}

                      {form.allowFullBottle && (
                        <FormField label="Custom Full Bottle Price (ETB)">
                          <input
                            type="number"
                            name="bottlePrice"
                            value={form.bottlePrice ?? ""}
                            onChange={handleChange}
                            placeholder={Number(form.price) > 0 ? `Auto: ${(Number(form.price) * Number(form.shotsCapacity || 30)).toFixed(0)} ETB` : "Optional"}
                            min="0"
                            step="0.01"
                            className="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm font-bold text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 shadow-xs"
                          />
                        </FormField>
                      )}
                    </div>

                    {/* LIVE PORTION PRICE CALCULATOR PREVIEW */}
                    {Number(form.price) > 0 && (
                      <div className="rounded-xl bg-white p-3 border border-purple-200 text-xs space-y-2 shadow-xs">
                        <p className="font-extrabold text-purple-900 uppercase text-[10px] tracking-wider">
                          Active Selling Prices on POS:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-bold text-slate-800">
                          {form.allowSingleShot && (
                            <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                              <span className="text-[10px] text-slate-400 block">Single Shot (1x)</span>
                              <span className="text-purple-700 font-extrabold">{Number(form.price).toFixed(2)} ETB</span>
                            </div>
                          )}
                          {form.allowDoubleShot && (
                            <div className={`p-2 rounded-lg text-center border ${Number(form.doubleShotPrice) > 0 ? "bg-purple-50 border-purple-200" : "bg-slate-50 border-slate-100"}`}>
                              <span className="text-[10px] text-slate-400 block">
                                Double Shot {Number(form.doubleShotPrice) > 0 ? "⭐ Custom" : "(2x Auto)"}
                              </span>
                              <span className="text-purple-700 font-extrabold">
                                {Number(form.doubleShotPrice) > 0 ? Number(form.doubleShotPrice).toFixed(2) : (Number(form.price) * 2).toFixed(2)} ETB
                              </span>
                            </div>
                          )}
                          {form.allowHalfBottle && (
                            <div className={`p-2 rounded-lg text-center border ${Number(form.halfBottlePrice) > 0 ? "bg-purple-50 border-purple-200" : "bg-slate-50 border-slate-100"}`}>
                              <span className="text-[10px] text-slate-400 block">
                                Half Bottle ({Math.max(1, Math.round(Number(form.shotsCapacity || 30) / 2))} Shots) {Number(form.halfBottlePrice) > 0 ? "⭐ Custom" : ""}
                              </span>
                              <span className="text-purple-700 font-extrabold">
                                {Number(form.halfBottlePrice) > 0 ? Number(form.halfBottlePrice).toFixed(2) : (Number(form.price) * Math.max(1, Math.round(Number(form.shotsCapacity || 30) / 2))).toFixed(2)} ETB
                              </span>
                            </div>
                          )}
                          {form.allowFullBottle && (
                            <div className={`p-2 rounded-lg text-center border ${Number(form.bottlePrice) > 0 ? "bg-purple-50 border-purple-200" : "bg-slate-50 border-slate-100"}`}>
                              <span className="text-[10px] text-slate-400 block">
                                Full Bottle ({form.shotsCapacity || 30} Shots) {Number(form.bottlePrice) > 0 ? "⭐ Custom" : ""}
                              </span>
                              <span className="text-purple-700 font-extrabold">
                                {Number(form.bottlePrice) > 0 ? Number(form.bottlePrice).toFixed(2) : (Number(form.price) * Number(form.shotsCapacity || 30)).toFixed(2)} ETB
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-purple-200/40 text-xs text-purple-700 font-medium">
                    Portion &amp; shot options are disabled for this product. It will sell strictly as a direct regular item on the Order / POS page.
                  </div>
                )}
              </div>
            );
          })()}

              {/* Description */}

              <FormField label="Description">

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the product..."
                  rows="3"
                  className={inputClass}
                />

              </FormField>

              {/* Image Upload & URL */}

              <FormField label="Product Image (Upload from Local Storage or Paste URL)">

                <div className="space-y-3">

                  {/* Image Preview Thumbnail */}

                  {imagePreview ? (
                    <div className="relative flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">

                      <img
                        src={formatImageUrl(imagePreview)}
                        alt="Product Preview"
                        className="h-16 w-16 rounded-lg object-cover shadow-sm"
                      />

                      <div className="flex-1 min-w-0">

                        <p className="truncate text-xs font-semibold text-slate-800">
                          {imageFile ? imageFile.name : "Uploaded Image"}
                        </p>

                        <p className="text-[11px] text-slate-500">
                          {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : "Image attached"}
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={removeSelectedImage}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        title="Remove Image"
                      >
                        <X className="h-4 w-4" />
                      </button>

                    </div>
                  ) : null}

                  {/* File Input Upload Button */}

                  <div className="relative">

                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 transition hover:border-blue-500 hover:bg-blue-50/30">

                      <Upload className="h-4 w-4 text-blue-600" />

                      <span className="text-xs font-semibold text-slate-700">
                        {imageFile ? "Change Image File" : "Choose Image from Computer / Gallery"}
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                    </label>

                  </div>

                  {/* Optional Image URL Input */}

                  <div className="relative">

                    <input
                      name="imageUrl"
                      value={form.imageUrl}
                      onChange={(e) => {
                        handleChange(e);
                        if (e.target.value) {
                          setImagePreview(e.target.value);
                        }
                      }}
                      placeholder="Or paste image URL (https://...)"
                      className={inputClass}
                    />

                  </div>

                </div>

              </FormField>

              {/* Toggles */}

              <div className="grid gap-3 sm:grid-cols-2">

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">

                  <div>

                    <p className="text-sm font-semibold text-slate-800">
                      Available
                    </p>

                    <p className="text-xs text-slate-400">
                      Can be ordered from POS
                    </p>

                  </div>

                  <input
                    type="checkbox"
                    name="isAvailable"
                    checked={form.isAvailable}
                    onChange={handleChange}
                    className="h-4 w-4 accent-blue-600"
                  />

                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">

                  <div>

                    <p className="text-sm font-semibold text-slate-800">
                      Active
                    </p>

                    <p className="text-xs text-slate-400">
                      Product exists in the system
                    </p>

                  </div>

                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 accent-blue-600"
                  />

                </label>

              </div>

              {/* Buttons */}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {saving
                    ? (editingProduct ? "Saving Changes..." : "Creating...")
                    : (editingProduct ? "Update Changes" : "Create Product")}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ======================================================
          CREATE CATEGORY MODAL
      ====================================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Add Product Category
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create a new category for foods, fruits, or beverages.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCategory} className="mt-4 space-y-4">
              {/* Category Quick Suggestions */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Quick Suggestions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Fruit", type: "food" },
                    { label: "Dessert", type: "food" },
                    { label: "Salad", type: "food" },
                    { label: "Wine", type: "bar" },
                    { label: "Juice", type: "beverage" },
                    { label: "Cocktail", type: "bar" },
                  ].map((sug) => (
                    <button
                      key={sug.label}
                      type="button"
                      onClick={() =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          name: sug.label,
                          type: sug.type,
                        }))
                      }
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
                    >
                      + {sug.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fruit, Fresh Salads, Appetizers..."
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>

              {/* Department / Category Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Target Department / Operational Type *
                </label>
                <select
                  value={categoryForm.type}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="food">
                    Kitchen & Food (Fruit, Kitchen meals, dishes)
                  </option>
                  <option value="bar">
                    Bar & Liquor (Beers, spirits, wines)
                  </option>
                  <option value="beverage">
                    Non-Alcoholic Beverages (Sodas, juices, water, coffee)
                  </option>
                  <option value="supply">
                    Supply / Operational Materials
                  </option>
                  <option value="other">Other</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Determines which department receives tickets when ordered via POS.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Brief description..."
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>

              {/* Error & Success alerts */}
              {categoryModalError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
                  {categoryModalError}
                </div>
              )}

              {categoryModalSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {categoryModalSuccess}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  disabled={categorySubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categorySubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {categorySubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {categorySubmitting ? "Creating..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>

      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}


// ============================================================
// FORM FIELD
// ============================================================

function FormField({
  label,
  children,
}) {
  return (
    <div className="space-y-1.5">

      <label className="text-xs font-semibold text-slate-700">
        {label}
      </label>

      {children}

    </div>
  );
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10";


export default ProductsPage;