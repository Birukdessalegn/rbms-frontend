import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import {
  ShoppingCart,
  BarChart3,
  ClipboardList,
  Clock3,
  CheckCircle2,
  DollarSign,
  PackageCheck,
  X,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";

import api from "../../../services/api";

/* =====================================================
   PURCHASING PAGE
===================================================== */

function PurchasingPage() {
  /* =====================================================
     STATE
  ===================================================== */

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [error, setError] = useState("");
  const [deptFilter, setDeptFilter] = useState("all"); // "all" | "kitchen" | "bar" | "general"

  /* Purchase modal */
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  /* Supplier modal */
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  /* Product modal */
  const [showProductModal, setShowProductModal] = useState(false);
  const [productTargetItemIndex, setProductTargetItemIndex] = useState(null);

  /* Receive modal */
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);

  /* =====================================================
     PURCHASE FORM
  ===================================================== */

  const [purchaseForm, setPurchaseForm] = useState({
    purchaseNumber: "",
    supplierId: "",
    paymentStatus: "credit",
    paymentMethod: "cash",
    notes: "",
    items: [
      {
        productId: "",
        quantity: 1,
        unitPrice: "",
      },
    ],
  });

  /* =====================================================
     SUPPLIER FORM
  ===================================================== */

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
  });

  /* =====================================================
     PRODUCT FORM
  ===================================================== */

  const [productForm, setProductForm] = useState({
    name: "",
  });

  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [receivingPurchase, setReceivingPurchase] = useState(false);

  /* =====================================================
     LOAD INITIAL DATA
  ===================================================== */

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     LOAD ALL DATA
  ===================================================== */

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        loadPurchases(),
        loadSuppliers(),
        loadProducts(),
      ]);
    } catch (error) {
      console.error("Failed to load purchasing data:", error);

      setError(
        error.message || "Failed to load purchasing data"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LOAD PURCHASE ORDERS
  ===================================================== */

  const loadPurchases = async () => {
    try {
      const response = await api("/purchasing");

      setOrders(response.purchases || []);
    } catch (error) {
      console.error("Failed to load purchases:", error);
      throw error;
    }
  };

  /* =====================================================
     LOAD SUPPLIERS
  ===================================================== */

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);

      const response = await api("/purchasing/suppliers");

      console.log("Suppliers response:", response);

      setSuppliers(response.suppliers || response.data || []);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
      setSuppliers([]);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  /* =====================================================
     LOAD PRODUCTS
  ===================================================== */

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);

      const response = await api("/products");

      console.log("Products response:", response);

      setProducts(
        response.products ||
          response.data ||
          []
      );
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  /* =====================================================
     OPEN NEW PURCHASE MODAL
  ===================================================== */

  const openPurchaseModal = async () => {
    setError("");

    const now = new Date();

    const date =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");

    const randomNumber = Math.floor(
      1000 + Math.random() * 9000
    );

    setPurchaseForm({
      purchaseNumber: `PO-${date}-${randomNumber}`,
      supplierId: "",
      paymentStatus: "credit",
      paymentMethod: "cash",
      notes: "",
      items: [
        {
          productId: "",
          quantity: 1,
          unitPrice: "",
        },
      ],
    });

    await loadSuppliers();
    await loadProducts();

    setShowPurchaseModal(true);
  };

  /* =====================================================
     CLOSE PURCHASE MODAL
  ===================================================== */

  const closePurchaseModal = () => {
    if (savingPurchase) return;

    setShowPurchaseModal(false);
  };

  /* =====================================================
     PURCHASE FORM CHANGE
  ===================================================== */

  const handlePurchaseChange = (field, value) => {
    setPurchaseForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* =====================================================
     ADD PURCHASE ITEM
  ===================================================== */

  const addPurchaseItem = () => {
    setPurchaseForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          productId: "",
          quantity: 1,
          unitPrice: "",
        },
      ],
    }));
  };

  /* =====================================================
     REMOVE PURCHASE ITEM
  ===================================================== */

  const removePurchaseItem = (index) => {
    setPurchaseForm((current) => {
      if (current.items.length === 1) {
        return current;
      }

      return {
        ...current,
        items: current.items.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
  };

  /* =====================================================
     UPDATE PURCHASE ITEM
  ===================================================== */

  const updatePurchaseItem = (
    index,
    field,
    value
  ) => {
    setPurchaseForm((current) => ({
      ...current,
      items: current.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item
      ),
    }));
  };

  /* =====================================================
     ADD SUPPLIER MODAL
  ===================================================== */

  const openSupplierModal = () => {
    setSupplierForm({
      name: "",
      phone: "",
    });

    setShowSupplierModal(true);
  };

  /* =====================================================
     SAVE SUPPLIER
  ===================================================== */

  const handleSaveSupplier = async (event) => {
    event.preventDefault();

    if (!supplierForm.name.trim()) {
      alert("Supplier name is required.");
      return;
    }

    try {
      setSavingSupplier(true);

      const response = await api("/purchasing/suppliers", {
        method: "POST",
        body: JSON.stringify(supplierForm),
      });

      const newSupplier = response.supplier || response.data;

      if (!newSupplier?.id) {
        throw new Error(
          "Supplier was created but no supplier ID was returned."
        );
      }

      /* Add new supplier immediately */
      setSuppliers((current) => [
        ...current,
        newSupplier,
      ]);

      /* Automatically select new supplier */
      setPurchaseForm((current) => ({
        ...current,
        supplierId: newSupplier.id,
      }));

      setShowSupplierModal(false);

      alert("Supplier added successfully.");
    } catch (error) {
      console.error(
        "Failed to create supplier:",
        error
      );

      alert(
        error.message ||
          "Failed to create supplier."
      );
    } finally {
      setSavingSupplier(false);
    }
  };

  /* =====================================================
     ADD PRODUCT MODAL
  ===================================================== */

  const openProductModal = (itemIndex = null) => {
    setProductTargetItemIndex(itemIndex);
    setProductForm({
      name: "",
    });

    setShowProductModal(true);
  };

  const closeProductModal = () => {
    if (savingProduct) return;

    setShowProductModal(false);
    setProductTargetItemIndex(null);
  };

  /* =====================================================
     SAVE PRODUCT
  ===================================================== */

  const handleSaveProduct = async (event) => {
    event.preventDefault();

    if (!productForm.name.trim()) {
      alert("Product name is required.");
      return;
    }

    try {
      setSavingProduct(true);

      const response = await api("/products", {
        method: "POST",
        body: JSON.stringify({
          name: productForm.name.trim(),
          price: 0,
          costPrice: 0,
          unit: "pcs",
          isAvailable: true,
          isActive: true,
        }),
      });

      const newProduct = response.product || response.data;

      if (!newProduct?.id) {
        throw new Error(
          "Product was created but no product ID was returned."
        );
      }

      /* Add new product immediately */
      setProducts((current) => [
        newProduct,
        ...current,
      ]);

      /* Automatically select new product in current item if target specified */
      if (productTargetItemIndex !== null) {
        updatePurchaseItem(
          productTargetItemIndex,
          "productId",
          newProduct.id
        );
      }

      setShowProductModal(false);
      setProductTargetItemIndex(null);

      alert("Product added successfully.");
    } catch (error) {
      console.error(
        "Failed to create product:",
        error
      );

      alert(
        error.message ||
          "Failed to create product."
      );
    } finally {
      setSavingProduct(false);
    }
  };

  /* =====================================================
     CREATE PURCHASE ORDER
  ===================================================== */

  const handleCreatePurchase = async (event) => {
    event.preventDefault();

    if (!purchaseForm.purchaseNumber.trim()) {
      alert("Purchase number is required.");
      return;
    }

    if (!purchaseForm.supplierId) {
      alert("Please select a supplier.");
      return;
    }

    if (
      !purchaseForm.items ||
      purchaseForm.items.length === 0
    ) {
      alert("Add at least one item.");
      return;
    }

    const invalidItem =
      purchaseForm.items.find(
        (item) =>
          !item.productId ||
          Number(item.quantity) <= 0 ||
          Number(item.unitPrice) < 0 ||
          item.unitPrice === ""
      );

    if (invalidItem) {
      alert(
        "Please select a product and complete all purchase item details."
      );
      return;
    }

    try {
      setSavingPurchase(true);

      const payload = {
        purchaseNumber:
          purchaseForm.purchaseNumber,

        status: "ordered",

        paymentStatus:
          purchaseForm.paymentStatus || "credit",

        paymentMethod:
          purchaseForm.paymentMethod || "cash",

        supplierId:
          Number(purchaseForm.supplierId),

        notes: purchaseForm.notes,

        items: purchaseForm.items.map(
          (item) => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })
        ),
      };

      console.log(
        "Creating purchase:",
        payload
      );

      const response = await api("/purchasing", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log(
        "Purchase created:",
        response
      );

      await loadPurchases();

      setShowPurchaseModal(false);

      alert(
        "Purchase order created successfully."
      );
    } catch (error) {
      console.error(
        "Failed to create purchase:",
        error
      );

      alert(
        error.message ||
          "Failed to create purchase order."
      );
    } finally {
      setSavingPurchase(false);
    }
  };

  /* =====================================================
     MARK PURCHASE AS PAID
  ===================================================== */

  const handleMarkAsPaid = async (order) => {
    const poNumber =
      order.purchase_number ||
      order.purchaseNumber ||
      `#PO-${order.id}`;

    if (
      !window.confirm(
        `Are you sure you want to mark Purchase Order ${poNumber} as PAID?`
      )
    ) {
      return;
    }

    try {
      await api(`/purchasing/${order.id}/pay`, {
        method: "PUT",
        body: JSON.stringify({
          paymentMethod: order.payment_method || "cash",
        }),
      });

      await loadPurchases();

      alert(
        `Purchase Order ${poNumber} marked as PAID successfully.`
      );
    } catch (error) {
      console.error("Failed to mark purchase as paid:", error);

      alert(
        error.message || "Failed to update purchase payment status."
      );
    }
  };

  /* =====================================================
     RECEIVE PURCHASE
  ===================================================== */

  const handleReceiveClick = (order) => {
    setSelectedOrder(order);
    setShowReceiveModal(true);
  };

  const handleConfirmReceipt = async () => {
    if (!selectedOrder) return;

    try {
      setReceivingPurchase(true);

      const response = await api(`/purchasing/${selectedOrder.id}/receive`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      console.log(
        "Purchase received:",
        response
      );

      await loadPurchases();

      setShowReceiveModal(false);
      setSelectedOrder(null);

      alert(
        "Purchase received and inventory updated successfully."
      );
    } catch (error) {
      console.error(
        "Failed to receive purchase:",
        error
      );

      alert(
        error.message ||
          "Failed to receive purchase."
      );
    } finally {
      setReceivingPurchase(false);
    }
  };

  /* =====================================================
     CALCULATE PURCHASE TOTAL
  ===================================================== */

  const getPurchaseTotal = () => {
    return purchaseForm.items.reduce(
      (total, item) => {
        const quantity =
          Number(item.quantity) || 0;

        const unitPrice =
          Number(item.unitPrice) || 0;

        return (
          total +
          quantity * unitPrice
        );
      },
      0
    );
  };

  /* =====================================================
     STATISTICS
  ===================================================== */

  const pendingOrders = orders.filter(
    (order) =>
      normalizeStatus(order.status) ===
      "pending"
  ).length;

  const orderedOrders = orders.filter(
    (order) =>
      normalizeStatus(order.status) ===
      "ordered"
  ).length;

  const receivedOrders = orders.filter(
    (order) =>
      normalizeStatus(order.status) ===
      "received"
  ).length;

  const totalPurchaseCost = orders.reduce(
    (sum, order) =>
      sum +
      Number(
        order.total ||
          order.amount ||
          order.total_amount ||
          0
      ),
    0
  );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">

            <ShoppingCart className="h-6 w-6" />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-slate-900">
              Purchasing Dashboard
            </h1>

            <p className="text-sm text-slate-500">
              Manage purchase orders, suppliers
              and incoming stock.
            </p>

          </div>

        </div>

        <div className="flex gap-2">

          <Link
            to="/purchasing/reports"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            Purchasing Reports
          </Link>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >

            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh

          </button>

          <button
            type="button"
            onClick={openPurchaseModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >

            <ShoppingCart className="h-4 w-4" />

            New Purchase Order

          </button>

        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* STAT CARDS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <PurchaseCard
          title="Pending Orders"
          value={pendingOrders}
          description="Waiting for approval"
          icon={Clock3}
        />

        <PurchaseCard
          title="Orders Placed"
          value={orderedOrders}
          description="Currently being supplied"
          icon={ClipboardList}
        />

        <PurchaseCard
          title="Received Orders"
          value={receivedOrders}
          description="Successfully received"
          icon={PackageCheck}
        />

        <PurchaseCard
          title="Purchase Cost"
          value={`${totalPurchaseCost.toLocaleString()} ETB`}
          description="Total purchase value"
          icon={DollarSign}
        />

      </div>

      {/* DEPARTMENTAL ITEM USAGE / STOCK AUDIT FOR TODAY */}
      {(() => {
        const todayStr = new Date().toISOString().split("T")[0];
        const kitchenItemsMap = new Map();
        const barItemsMap = new Map();
        const otherItemsMap = new Map();

        orders.forEach((order) => {
          const rawD = order.created_at || order.createdAt || order.date;
          const orderDateStr = rawD ? String(rawD).split(/[T ]/)[0] : todayStr;

          if (orderDateStr === todayStr || !rawD) {
            const items = Array.isArray(order.items) ? order.items : [];

            items.forEach((item) => {
              const q = Number(item.quantity || item.qty || 1);
              const unit = item.unit || "pcs";
              const cat = String(item.category || item.category_name || item.type || "").toLowerCase();
              const rawName = item.name || item.product_name || `Item #${item.productId || item.product_id || ""}`;
              const name = String(rawName).trim();
              if (!name) return;

              const nameLower = name.toLowerCase();
              const isBar = cat.includes("bar") || cat.includes("drink") || nameLower.includes("beer") || nameLower.includes("wine") || nameLower.includes("whiskey") || nameLower.includes("drink") || nameLower.includes("soda") || nameLower.includes("water");
              const isKitchen = cat.includes("food") || cat.includes("kitchen") || cat.includes("meat") || nameLower.includes("doro") || nameLower.includes("burger") || nameLower.includes("pizza") || nameLower.includes("steak") || nameLower.includes("oil") || nameLower.includes("onion") || nameLower.includes("spice");

              const targetMap = isBar ? barItemsMap : isKitchen ? kitchenItemsMap : otherItemsMap;
              const prev = targetMap.get(name) || { qty: 0, unit };
              targetMap.set(name, { qty: prev.qty + q, unit: prev.unit || unit });
            });
          }
        });

        const kitchenItems = Array.from(kitchenItemsMap.entries());
        const barItems = Array.from(barItemsMap.entries());
        const otherItems = Array.from(otherItemsMap.entries());

        return (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-indigo-600" />
                  Today's Departmental Stock & Items Audit (Kitchen vs Bar)
                </h3>
                <p className="text-xs text-slate-500">Live itemized inventory items used & received today (Quantities only)</p>
              </div>
              <span className="text-xs font-bold text-slate-400">Date: {todayStr}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Kitchen Items Card */}
              <div className="rounded-xl bg-amber-50/80 p-4 border border-amber-200/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-amber-900 border-b border-amber-200/60 pb-2">
                  <span>🍲 Kitchen Stock Items ({kitchenItems.length})</span>
                  <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[11px] font-black text-amber-900">Kitchen</span>
                </div>
                {kitchenItems.length === 0 ? (
                  <p className="text-xs text-amber-700 italic py-2">No kitchen items logged today.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {kitchenItems.map(([name, data]) => (
                      <div key={name} className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-amber-200/50">
                        <span className="font-bold text-slate-800">{name}</span>
                        <span className="font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                          {data.qty} {data.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bar Items Card */}
              <div className="rounded-xl bg-purple-50/80 p-4 border border-purple-200/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-purple-900 border-b border-purple-200/60 pb-2">
                  <span>🍸 Bar Stock Items ({barItems.length})</span>
                  <span className="rounded-md bg-purple-200/80 px-2 py-0.5 text-[11px] font-black text-purple-900">Bar</span>
                </div>
                {barItems.length === 0 ? (
                  <p className="text-xs text-purple-700 italic py-2">No bar items logged today.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {barItems.map(([name, data]) => (
                      <div key={name} className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-purple-200/50">
                        <span className="font-bold text-slate-800">{name}</span>
                        <span className="font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded text-[11px]">
                          {data.qty} {data.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Store & Other Items Card */}
              <div className="rounded-xl bg-sky-50/80 p-4 border border-sky-200/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-sky-900 border-b border-sky-200/60 pb-2">
                  <span>📦 Store / General Items ({otherItems.length})</span>
                  <span className="rounded-md bg-sky-200/80 px-2 py-0.5 text-[11px] font-black text-sky-900">General</span>
                </div>
                {otherItems.length === 0 ? (
                  <p className="text-xs text-sky-700 italic py-2">No general store items logged today.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {otherItems.map(([name, data]) => (
                      <div key={name} className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-sky-200/50">
                        <span className="font-bold text-slate-800">{name}</span>
                        <span className="font-black text-sky-900 bg-sky-100 px-2 py-0.5 rounded text-[11px]">
                          {data.qty} {data.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* PURCHASE ORDERS */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

          <div>

            <h2 className="font-bold text-slate-900">
              Recent Purchase Orders
            </h2>

            <p className="text-xs text-slate-500">
              Latest purchasing activity
            </p>

          </div>

          <ClipboardList className="h-5 w-5 text-slate-400" />

        </div>

        {loading ? (

          <div className="flex h-40 items-center justify-center">

            <div className="flex items-center gap-2 text-sm text-slate-500">

              <RefreshCw className="h-4 w-4 animate-spin" />

              Loading purchase orders...

            </div>

          </div>

        ) : orders.length === 0 ? (

          <div className="flex h-40 flex-col items-center justify-center">

            <ShoppingCart className="h-8 w-8 text-slate-300" />

            <p className="mt-2 text-sm font-medium text-slate-500">
              No purchase orders yet.
            </p>

            <button
              type="button"
              onClick={openPurchaseModal}
              className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Create your first purchase order
            </button>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px]">

              <thead className="bg-slate-50">

                <tr className="border-b border-slate-200">

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Order
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Supplier
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Items
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Stock Status
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Payment Status
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Amount
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {orders.map((order) => {

                  const status =
                    normalizeStatus(
                      order.status
                    );

                  const displayStatus =
                    formatStatus(
                      order.status
                    );

                  const isPaid =
                    order.payment_status === "paid";

                  return (

                    <tr
                      key={order.id}
                      className="transition hover:bg-slate-50"
                    >

                      <td className="px-5 py-4">

                        <p className="text-sm font-bold text-slate-900">

                          {order.purchase_number ||
                            order.purchaseNumber ||
                            `#PO-${order.id}`}

                        </p>

                      </td>

                      <td className="px-5 py-4">

                        <p className="text-sm font-medium text-slate-700">

                          {order.supplier_name ||
                            order.supplier ||
                            order.supplierName ||
                            "-"}

                        </p>

                      </td>

                      <td className="px-5 py-4">

                        <p className="max-w-[220px] truncate text-sm text-slate-600">

                          {getOrderItemsText(
                            order
                          )}

                        </p>

                        <p className="mt-1 text-xs text-slate-400">

                          {getOrderItemsCount(
                            order
                          )}{" "}
                          items

                        </p>

                      </td>

                      <td className="px-5 py-4">

                        <PurchaseStatusBadge
                          status={
                            displayStatus
                          }
                        />

                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >

                          <DollarSign className="h-3 w-3" />

                          {isPaid ? "Paid" : "Credit (Unpaid)"}

                        </span>

                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">

                        {formatDate(
                          order.created_at ||
                            order.date
                        )}

                      </td>

                      <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">

                        {Number(
                          order.total ||
                            order.amount ||
                            order.total_amount ||
                            0
                        ).toLocaleString()}{" "}
                        ETB

                      </td>

                      <td className="px-5 py-4 text-center">

                        <div className="flex items-center justify-center gap-2">

                          {status === "ordered" ||
                          status === "pending" ||
                          status === "draft" ? (

                            <button
                              type="button"
                              onClick={() =>
                                handleReceiveClick(
                                  order
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >

                              <PackageCheck className="h-3.5 w-3.5" />

                              Receive

                            </button>

                          ) : (

                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">

                              <CheckCircle2 className="h-3.5 w-3.5" />

                              Received

                            </span>

                          )}

                          {!isPaid ? (

                            <button
                              type="button"
                              onClick={() =>
                                handleMarkAsPaid(order)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                            >

                              <DollarSign className="h-3.5 w-3.5" />

                              Mark Paid

                            </button>

                          ) : (

                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">

                              Paid

                            </span>

                          )}

                        </div>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* QUICK ACTIONS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-5">

          <h2 className="font-bold text-slate-900">
            Quick Actions
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Common purchasing operations
          </p>

        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <QuickAction
            icon={ShoppingCart}
            title="New Purchase"
            description="Create purchase order"
            onClick={openPurchaseModal}
          />

          <QuickAction
            icon={ClipboardList}
            title="Purchase Orders"
            description="View all orders"
            onClick={() => {}}
          />

          <QuickAction
            icon={PackageCheck}
            title="Receive Stock"
            description="Record incoming stock"
            onClick={() => {}}
          />

          <QuickAction
            icon={DollarSign}
            title="Purchase Reports"
            description="View purchasing reports"
            onClick={() => {}}
          />

        </div>

      </div>

      {/* =================================================
          NEW PURCHASE MODAL
      ================================================= */}

      {showPurchaseModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  New Purchase Order
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Purchase existing products from a supplier.
                </p>

              </div>

              <button
                type="button"
                onClick={closePurchaseModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >

                <X className="h-5 w-5" />

              </button>

            </div>

            <form onSubmit={handleCreatePurchase}>

              <div className="space-y-6 p-6">

                {/* BASIC INFORMATION */}

                <div>

                  {/* SUPPLIER */}

                  <div>

                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Supplier
                    </label>

                    <div className="flex gap-2">

                      <select
                        value={
                          purchaseForm.supplierId
                        }
                        onChange={(e) =>
                          handlePurchaseChange(
                            "supplierId",
                            e.target.value
                          )
                        }
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >

                        <option value="">
                          {loadingSuppliers
                            ? "Loading suppliers..."
                            : suppliers.length === 0
                            ? "No suppliers yet"
                            : "Select supplier"}
                        </option>

                        {suppliers.map(
                          (supplier) => (

                            <option
                              key={
                                supplier.id
                              }
                              value={
                                supplier.id
                              }
                            >
                              {supplier.name}
                            </option>

                          )
                        )}

                      </select>

                      <button
                        type="button"
                        onClick={
                          openSupplierModal
                        }
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >

                        <Plus className="h-4 w-4" />

                        Add

                      </button>

                    </div>

                  </div>

                  {/* PAYMENT STATUS & METHOD */}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">

                    <div>

                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Payment Status
                      </label>

                      <select
                        value={
                          purchaseForm.paymentStatus || "credit"
                        }
                        onChange={(e) =>
                          handlePurchaseChange(
                            "paymentStatus",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="credit">
                          Credit (Unpaid)
                        </option>
                        <option value="paid">
                          Paid
                        </option>
                      </select>

                    </div>

                    <div>

                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Payment Method
                      </label>

                      <select
                        value={
                          purchaseForm.paymentMethod || "cash"
                        }
                        onChange={(e) =>
                          handlePurchaseChange(
                            "paymentMethod",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="cash">
                          Cash
                        </option>
                        <option value="bank_transfer">
                          Bank Transfer
                        </option>
                        <option value="check">
                          Check
                        </option>
                        <option value="other">
                          Other
                        </option>
                      </select>

                    </div>

                  </div>

                </div>

                {/* =================================================
                    PURCHASE ITEMS
                ================================================= */}

                <div>

                  <div className="mb-3 flex items-center justify-between">

                    <div>

                      <h3 className="font-bold text-slate-900">
                        Purchase Items
                      </h3>

                      <p className="text-xs text-slate-500">
                        Select existing products and enter the quantity and purchase price.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={
                        addPurchaseItem
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >

                      <Plus className="h-4 w-4" />

                      Add Item

                    </button>

                  </div>

                  <div className="space-y-3">

                    {purchaseForm.items.map(
                      (
                        item,
                        index
                      ) => (

                        <div
                          key={index}
                          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_120px_160px_auto]"
                        >

                          {/* PRODUCT */}

                          <div>

                            <div className="mb-1 flex items-center justify-between">

                              <label className="text-xs font-semibold text-slate-500">
                                Product
                              </label>

                              <button
                                type="button"
                                onClick={() => openProductModal(index)}
                                className="inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </button>

                            </div>

                            <div className="flex gap-2">

                              <select
                                value={
                                  item.productId
                                }
                                onChange={(e) =>
                                  updatePurchaseItem(
                                    index,
                                    "productId",
                                    e.target.value
                                  )
                                }
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                              >

                                <option value="">
                                  {loadingProducts
                                    ? "Loading products..."
                                    : products.length === 0
                                    ? "No products available"
                                    : "Select product"}
                                </option>

                                {products.map(
                                  (
                                    product
                                  ) => (

                                    <option
                                      key={
                                        product.id
                                      }
                                      value={
                                        product.id
                                      }
                                    >
                                      {product.name}
                                    </option>

                                  )
                                )}

                              </select>

                              <button
                                type="button"
                                onClick={() => openProductModal(index)}
                                title="Add new product"
                                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-indigo-700 transition hover:bg-indigo-100"
                              >
                                <Plus className="h-4 w-4" />
                              </button>

                            </div>

                          </div>

                          {/* QUANTITY */}

                          <div>

                            <label className="mb-1 block text-xs font-semibold text-slate-500">
                              Quantity
                            </label>

                            <input
                              type="number"
                              min="1"
                              value={
                                item.quantity
                              }
                              onChange={(
                                e
                              ) =>
                                updatePurchaseItem(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            />

                          </div>

                          {/* UNIT PURCHASE PRICE */}

                          <div>

                            <label className="mb-1 block text-xs font-semibold text-slate-500">
                              Purchase Price
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.unitPrice
                              }
                              onChange={(
                                e
                              ) =>
                                updatePurchaseItem(
                                  index,
                                  "unitPrice",
                                  e.target.value
                                )
                              }
                              placeholder="ETB"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            />

                          </div>

                          {/* DELETE */}

                          <div className="flex items-end">

                            <button
                              type="button"
                              disabled={
                                purchaseForm
                                  .items
                                  .length ===
                                1
                              }
                              onClick={() =>
                                removePurchaseItem(
                                  index
                                )
                              }
                              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                            >

                              <Trash2 className="h-5 w-5" />

                            </button>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                </div>

                {/* NOTES */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Notes
                  </label>

                  <textarea
                    rows="3"
                    value={
                      purchaseForm.notes
                    }
                    onChange={(e) =>
                      handlePurchaseChange(
                        "notes",
                        e.target.value
                      )
                    }
                    placeholder="Optional notes..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>

                {/* TOTAL */}

                <div className="flex items-center justify-between rounded-xl bg-indigo-50 p-5">

                  <div>

                    <p className="text-sm font-semibold text-indigo-700">
                      Purchase Total
                    </p>

                    <p className="text-xs text-indigo-500">
                      Quantity × purchase price
                    </p>

                  </div>

                  <p className="text-2xl font-bold text-indigo-900">

                    {getPurchaseTotal().toLocaleString()}{" "}
                    ETB

                  </p>

                </div>

              </div>

              {/* FOOTER */}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">

                <button
                  type="button"
                  onClick={
                    closePurchaseModal
                  }
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingPurchase
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {savingPurchase ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Create Purchase Order
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =================================================
          ADD SUPPLIER MODAL
      ================================================= */}

      {showSupplierModal && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">

          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

            <form onSubmit={handleSaveSupplier}>

              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Add Supplier
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Add a supplier to your purchasing system.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowSupplierModal(false)
                  }
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >

                  <X className="h-5 w-5" />

                </button>

              </div>

              {/* FORM */}

              <div className="space-y-4 p-6">

                {/* NAME */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Supplier Name *
                  </label>

                  <input
                    type="text"
                    value={
                      supplierForm.name
                    }
                    onChange={(e) =>
                      setSupplierForm(
                        (current) => ({
                          ...current,
                          name: e.target.value,
                        })
                      )
                    }
                    placeholder="ABC Food Suppliers"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>

                {/* PHONE */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={
                      supplierForm.phone
                    }
                    onChange={(e) =>
                      setSupplierForm(
                        (current) => ({
                          ...current,
                          phone: e.target.value,
                        })
                      )
                    }
                    placeholder="09xxxxxxxx"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>

              </div>

              {/* FOOTER */}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">

                <button
                  type="button"
                  onClick={() =>
                    setShowSupplierModal(false)
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingSupplier
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >

                  {savingSupplier ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Save Supplier
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =================================================
          ADD PRODUCT MODAL
      ================================================= */}

      {showProductModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  Add New Product
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Add a product name to your system.
                </p>

              </div>

              <button
                type="button"
                onClick={closeProductModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >

                <X className="h-5 w-5" />

              </button>

            </div>

            {/* FORM */}

            <form onSubmit={handleSaveProduct}>

              <div className="space-y-4 p-6">

                {/* NAME */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Product Name *
                  </label>

                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm({
                        name: e.target.value,
                      })
                    }
                    placeholder="Enter product name (e.g. Tomato, Coffee Beans)"
                    required
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>

              </div>

              {/* FOOTER */}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">

                <button
                  type="button"
                  onClick={closeProductModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingProduct}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >

                  {savingProduct ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Save Product
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =================================================
          RECEIVE PURCHASE MODAL
      ================================================= */}

      {showReceiveModal &&
        selectedOrder && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Receive Purchase Order
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Confirm that the stock has been received.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowReceiveModal(
                      false
                    );
                    setSelectedOrder(
                      null
                    );
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >

                  <X className="h-5 w-5" />

                </button>

              </div>

              {/* INFORMATION */}

              <div className="space-y-4 p-6">

                <div className="rounded-xl bg-slate-50 p-4">

                  <div className="flex justify-between">

                    <span className="text-xs text-slate-500">
                      Purchase Order
                    </span>

                    <span className="text-sm font-bold text-slate-900">

                      {selectedOrder.purchase_number ||
                        selectedOrder.purchaseNumber ||
                        `#PO-${selectedOrder.id}`}

                    </span>

                  </div>

                  <div className="mt-3 flex justify-between">

                    <span className="text-xs text-slate-500">
                      Supplier
                    </span>

                    <span className="text-sm font-semibold text-slate-700">

                      {selectedOrder.supplier_name ||
                        selectedOrder.supplier ||
                        selectedOrder.supplierName ||
                        "-"}

                    </span>

                  </div>

                  <div className="mt-3 flex justify-between">

                    <span className="text-xs text-slate-500">
                      Items
                    </span>

                    <span className="text-sm font-semibold text-slate-700">

                      {getOrderItemsCount(
                        selectedOrder
                      )}{" "}
                      items

                    </span>

                  </div>

                  <div className="mt-3 flex justify-between">

                    <span className="text-xs text-slate-500">
                      Total
                    </span>

                    <span className="text-sm font-bold text-slate-900">

                      {Number(
                        selectedOrder.total ||
                          selectedOrder.amount ||
                          selectedOrder.total_amount ||
                          0
                      ).toLocaleString()}{" "}
                      ETB

                    </span>

                  </div>

                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

                  <p className="text-sm font-semibold text-amber-800">
                    Confirm stock receipt
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Confirm only after the supplier has delivered the stock.
                  </p>

                </div>

              </div>

              {/* FOOTER */}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">

                <button
                  type="button"
                  onClick={() => {
                    setShowReceiveModal(
                      false
                    );
                    setSelectedOrder(
                      null
                    );
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    receivingPurchase
                  }
                  onClick={
                    handleConfirmReceipt
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >

                  {receivingPurchase ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Receiving...
                    </>
                  ) : (
                    <>
                      <PackageCheck className="h-4 w-4" />
                      Confirm Receipt
                    </>
                  )}

                </button>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function normalizeStatus(status) {
  if (!status) return "";

  return String(status)
    .toLowerCase()
    .replace(/_/g, " ");
}

function formatStatus(status) {
  if (!status) return "-";

  const normalized =
    normalizeStatus(status);

  return normalized
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function formatDate(date) {
  if (!date) return "-";

  try {
    return new Date(
      date
    ).toLocaleDateString();
  } catch {
    return date;
  }
}

function getOrderItems(order) {
  if (!order) return [];
  const raw =
    order.items ||
    order.purchase_items ||
    order.purchaseItems ||
    order.order_items ||
    order.orderItems ||
    order.details ||
    order.products;

  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getOrderItemsCount(order) {
  if (!order) return 0;
  const items = getOrderItems(order);

  if (Array.isArray(items) && items.length > 0) {
    const totalQty = items.reduce(
      (total, item) =>
        total +
        Number(
          item.quantity || item.qty || item.count || item.amount || 1
        ),
      0
    );
    return totalQty || items.length;
  }

  return Number(
    order.items_count ||
      order.itemsCount ||
      order.item_count ||
      order.total_items ||
      order.totalItems ||
      0
  );
}

function getOrderItemsText(order) {
  if (!order) return "-";
  const items = getOrderItems(order);

  if (!Array.isArray(items) || items.length === 0) {
    if (order.item_name || order.product_name) {
      return order.item_name || order.product_name;
    }
    return "-";
  }

  return items
    .map((item) => {
      const name =
        item.product_name ||
        item.productName ||
        item.name ||
        item.item_name ||
        (item.product_id ? `Product #${item.product_id}` : "Item");

      const qty = item.quantity || item.qty || item.count || 1;
      return `${name} × ${qty}`;
    })
    .join(", ");
}

/* =====================================================
   PURCHASE CARD
===================================================== */

function PurchaseCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

          <Icon className="h-5 w-5" />

        </div>

      </div>

    </div>
  );
}

/* =====================================================
   STATUS BADGE
===================================================== */

function PurchaseStatusBadge({
  status,
}) {
  const normalized =
    normalizeStatus(status);

  const styles = {
    pending:
      "bg-amber-50 text-amber-700 border-amber-200",

    ordered:
      "bg-blue-50 text-blue-700 border-blue-200",

    received:
      "bg-emerald-50 text-emerald-700 border-emerald-200",

    partially_received:
      "bg-purple-50 text-purple-700 border-purple-200",

    cancelled:
      "bg-red-50 text-red-700 border-red-200",

    draft:
      "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
        styles[normalized] ||
        "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {status || "-"}
    </span>
  );
}

/* =====================================================
   QUICK ACTION
===================================================== */

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
    >

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-indigo-100 group-hover:text-indigo-600">

        <Icon className="h-5 w-5" />

      </div>

      <div>

        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>

      </div>

    </button>
  );
}

export default PurchasingPage;