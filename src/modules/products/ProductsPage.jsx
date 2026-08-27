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
} from "lucide-react";

import api from "../../services/api";

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [form, setForm] = useState({
    productCode: "",
    name: "",
    categoryId: "",
    description: "",
    price: "",
    costPrice: "",
    unit: "pcs",
    imageUrl: "",
    isAvailable: true,
    isActive: true,
  });

  // ============================================================
  // FETCH PRODUCTS
  // ============================================================

  const fetchProducts = async () => {
    try {
      setError("");

      const response = await api("/products");

      setProducts(response.products || []);
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

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ============================================================
  // OPEN MODAL
  // ============================================================

  const openCreateModal = () => {
    setError("");
    setSuccess("");

    setForm({
      productCode: "",
      name: "",
      categoryId: "",
      description: "",
      price: "",
      costPrice: "",
      unit: "pcs",
      imageUrl: "",
      isAvailable: true,
      isActive: true,
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
  // CREATE PRODUCT
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

      if (form.price === "") {
        throw new Error("Selling price is required");
      }

      if (Number(form.price) < 0) {
        throw new Error("Selling price cannot be negative");
      }

      const response = await api("/products", {
        method: "POST",
        body: JSON.stringify({
          productCode:
            form.productCode.trim() || null,

          name: form.name.trim(),

          categoryId:
            form.categoryId
              ? Number(form.categoryId)
              : null,

          description:
            form.description.trim() || null,

          price: Number(form.price),

          costPrice:
            form.costPrice === ""
              ? 0
              : Number(form.costPrice),

          unit: form.unit,

          imageUrl:
            form.imageUrl.trim() || null,

          isAvailable: form.isAvailable,

          isActive: form.isActive,
        }),
      });

      setProducts((previous) => [
        response.product,
        ...previous,
      ]);

      setSuccess("Product created successfully.");

      setShowModal(false);

      // Refresh from database
      await fetchProducts();

    } catch (error) {
      console.error(
        "Create product error:",
        error
      );

      setError(
        error.message ||
          "Failed to create product"
      );
    } finally {
      setSaving(false);
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
        String(product.category_id) ===
          String(categoryFilter);

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [
    products,
    search,
    categoryFilter,
  ]);

  // ============================================================
  // SUMMARY
  // ============================================================

  const totalProducts = products.length;

  const availableProducts = products.filter(
    (product) => product.is_available
  ).length;

  const foodProducts = products.filter(
    (product) =>
      product.category_type === "food"
  ).length;

  const barProducts = products.filter(
    (product) =>
      product.category_type === "bar"
  ).length;

  // ============================================================
  // CATEGORY ICON
  // ============================================================

  const getCategoryIcon = (type) => {
    switch (type) {
      case "food":
        return Utensils;

      case "bar":
        return Wine;

      case "drink":
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
            Products
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage food, drinks, and bar products.
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
          PRODUCTS
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

          {/* Category */}

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

        </div>

        {/* Table */}

        {filteredProducts.length === 0 ? (

          <div className="flex h-56 flex-col items-center justify-center">

            <Package className="mb-3 h-10 w-10 text-slate-300" />

            <p className="text-sm font-medium text-slate-500">
              No products found
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Create your first product.
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
                    Price
                  </th>

                  <th className="px-5 py-4">
                    Unit
                  </th>

                  <th className="px-5 py-4">
                    Available
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredProducts.map(
                  (product) => {

                    const CategoryIcon =
                      getCategoryIcon(
                        product.category_type
                      );

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-slate-50"
                      >

                        {/* Product */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">

                              <CategoryIcon className="h-5 w-5" />

                            </div>

                            <div>

                              <p className="font-semibold text-slate-900">
                                {product.name}
                              </p>

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

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {product.category_name ||
                              "Uncategorized"}
                          </span>

                        </td>

                        {/* Price */}

                        <td className="px-5 py-4 font-semibold text-slate-900">

                          {Number(
                            product.price || 0
                          ).toFixed(2)}

                        </td>

                        {/* Unit */}

                        <td className="px-5 py-4 text-slate-500">
                          {product.unit || "pcs"}
                        </td>

                        {/* Available */}

                        <td className="px-5 py-4">

                          {product.is_available ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">

                              <span className="h-2 w-2 rounded-full bg-green-500" />

                              Available

                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500">

                              <span className="h-2 w-2 rounded-full bg-red-500" />

                              Unavailable

                            </span>
                          )}

                        </td>

                        {/* Status */}

                        <td className="px-5 py-4">

                          {product.is_active ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                              Inactive
                            </span>
                          )}

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
                  Add Product
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Create a food, drink, or bar product.
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

                <FormField label="Product Code">

                  <input
                    name="productCode"
                    value={form.productCode}
                    onChange={handleChange}
                    placeholder="e.g. FD-001"
                    className={inputClass}
                  />

                </FormField>

              </div>

              {/* Category + Unit */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Category">

                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    className={inputClass}
                  >

                    <option value="">
                      Select category
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      )
                    )}

                  </select>

                </FormField>

                <FormField label="Unit">

                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    className={inputClass}
                  >

                    <option value="pcs">
                      Pieces
                    </option>

                    <option value="plate">
                      Plate
                    </option>

                    <option value="glass">
                      Glass
                    </option>

                    <option value="bottle">
                      Bottle
                    </option>

                    <option value="kg">
                      Kilogram
                    </option>

                    <option value="liter">
                      Liter
                    </option>

                  </select>

                </FormField>

              </div>

              {/* Prices */}

              <div className="grid gap-4 md:grid-cols-2">

                <FormField label="Selling Price *">

                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="350"
                    min="0"
                    step="0.01"
                    required
                    className={inputClass}
                  />

                </FormField>

                <FormField label="Cost Price">

                  <input
                    type="number"
                    name="costPrice"
                    value={form.costPrice}
                    onChange={handleChange}
                    placeholder="200"
                    min="0"
                    step="0.01"
                    className={inputClass}
                  />

                </FormField>

              </div>

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

              {/* Image */}

              <FormField label="Image URL">

                <input
                  name="imageUrl"
                  value={form.imageUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className={inputClass}
                />

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
                    ? "Creating..."
                    : "Create Product"}

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