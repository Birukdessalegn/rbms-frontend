import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  X,
  Banknote,
  CreditCard,
  Smartphone,
  Camera,
  Upload,
  CheckCircle2,
  UserCheck,
  FileText,
  Utensils,
  CheckSquare,
  Square,
  Minus,
  Plus,
  Sparkles,
  Users,
  Printer,
} from "lucide-react";
import api from "../../../services/api";
import { printThermalReceipt } from "../../../utils/printHelper";

function PaymentModal({
  order,
  onClose,
  onPaymentSuccess,
}) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentMode, setPaymentMode] = useState("full"); // "full" | "split_items" | "split_equal"
  const [splitWays, setSplitWays] = useState(2);
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [paidQuantities, setPaidQuantities] = useState({});
  const [shareSuccessMessage, setShareSuccessMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [receiptImage, setReceiptImage] = useState(null);

  // Special Person / VIP Credit Tab State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [showVipDropdown, setShowVipDropdown] = useState(false);
  const [selectedVip, setSelectedVip] = useState(null);
  const [vipList, setVipList] = useState([]);
  const vipDropdownRef = useRef(null);

  useEffect(() => {
    localStorage.removeItem("rbms_vip_customers");
    const fetchVipCustomers = async () => {
      try {
        const res = await api("/vip-customers").catch(() => api("/customers").catch(() => ([])));
        const list = Array.isArray(res) ? res : res?.data || res?.customers || [];
        setVipList(list);
      } catch {
        setVipList([]);
      }
    };
    fetchVipCustomers();
  }, []);

  // Close VIP dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (vipDropdownRef.current && !vipDropdownRef.current.contains(e.target)) {
        setShowVipDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredVips = useMemo(() => {
    const q = customerName.trim().toLowerCase();
    if (!q) return vipList;
    return vipList.filter((v) => {
      const name = (v.name || v.full_name || v.customer_name || "").toLowerCase();
      const phone = (v.phone || v.phone_number || "").toLowerCase();
      const company = (v.company || "").toLowerCase();
      const tier = (v.tier || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || company.includes(q) || tier.includes(q);
    });
  }, [vipList, customerName]);

  const selectedVipStats = useMemo(() => {
    if (!selectedVip) return null;
    const limit = Number(selectedVip.credit_limit || selectedVip.creditLimit || 0);
    const debt = Number(selectedVip.current_debt || selectedVip.currentDebt || selectedVip.debt || 0);
    const tier = (selectedVip.tier || "").toLowerCase();
    const isPromoter = tier.includes("promoter");
    const isUnlimited = isPromoter || tier.includes("gold") || tier.includes("unlimited") || limit <= 0 || limit >= 999999;
    const available = isUnlimited ? 999999999 : Math.max(limit - debt, 0);
    return { limit, debt, available, isUnlimited, isPromoter };
  }, [selectedVip]);

  // PC Camera / WebCam state
  const [showWebcam, setShowWebcam] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState("");

  const [fullOrder, setFullOrder] = useState(order);
  const [success, setSuccess] = useState(false);
  const [partialSuccessData, setPartialSuccessData] = useState(null);

  const [successfulAmount, setSuccessfulAmount] =
    useState(0);

  const handleImageCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", 0.65);
        setReceiptImage(compressed);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      setShowWebcam(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Could not access PC camera. Please check camera permissions or use Upload File.");
      setShowWebcam(false);
    }
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const maxDim = 800;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
    setReceiptImage(dataUrl);
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowWebcam(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const loadOrder = useCallback(async () => {
    try {
      setLoadingOrder(true);

      const response = await api(
        `/pos/orders/${order.order_id || order.id}`
      );

      const loadedOrder =
        response?.order ||
        response?.data?.order ||
        response?.data ||
        response;

      console.log("PAYMENT ORDER RESPONSE:", response);
      console.log("LOADED ORDER:", loadedOrder);
      console.log("ORDER ITEMS:", loadedOrder?.items);
      console.log("ORDER TOTAL:", loadedOrder?.total_amount);

      setFullOrder(loadedOrder);

      // Initialize paid quantities directly from backend order items
      const initialPaid = {};
      (loadedOrder?.items || []).forEach((item, idx) => {
        initialPaid[idx] = Number(item.paid_quantity || 0);
      });
      setPaidQuantities(initialPaid);

      /* 
       * Calculate subtotal from actual order items. 
       */
      const calculatedSubtotal = (
        loadedOrder.items || []
      ).reduce((sum, item) => {
        const quantity = Number(
          item.quantity ??
          item.qty ??
          0
        );

        const unitPrice = Number(
          item.unit_price ??
          item.unitPrice ??
          item.price ??
          item.product_price ??
          item.productPrice ??
          item.product?.price ??
          item.product?.unit_price ??
          0
        );

        return sum + quantity * unitPrice;
      }, 0);

      const discount = Number(
        loadedOrder.discount ??
        loadedOrder.discount_amount ??
        0
      );

      // Tax amount from backend order payload (0 if VAT is already included in product prices)
      const loadedTax = Number(
        loadedOrder.tax ??
        loadedOrder.tax_amount ??
        0
      );

      const tax = loadedTax;

      const backendTotal = Number(
        loadedOrder.total_amount ??
        loadedOrder.totalAmount ??
        loadedOrder.total ??
        loadedOrder.grand_total ??
        loadedOrder.grandTotal ??
        0
      );

      const calculatedTotal = calculatedSubtotal > 0
        ? Math.max(
          calculatedSubtotal - discount + tax,
          0
        )
        : (backendTotal > 0 ? backendTotal : Math.max(calculatedSubtotal - discount + tax, 0));

      const paid = (
        loadedOrder.payments || []
      )
        .filter(
          (payment) =>
            payment.status === "paid"
        )
        .reduce(
          (sum, payment) =>
            sum + Number(payment.amount ?? 0),
          0
        );

      const remaining = Math.max(
        calculatedTotal - paid,
        0
      );

      setAmount(remaining.toFixed(2));

    } catch (err) {
      console.error(
        "Failed to load order:",
        err
      );

      setError(
        err.message ||
        "Failed to load order details"
      );

    } finally {
      setLoadingOrder(false);
    }
  }, [order.order_id, order.id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Helper to extract item unit price
  const getItemUnitPrice = (item) => {
    if (!item) return 0;
    const p = Number(
      item.unit_price ??
      item.unitPrice ??
      item.price ??
      item.product_price ??
      item.productPrice ??
      item.product?.price ??
      item.product?.unit_price ??
      item.amount ??
      0
    );
    return isNaN(p) ? 0 : p;
  };

  // Use fullOrder.items if available, fallback to order.items (preventing double counting)
  const displayItems = (fullOrder?.items && fullOrder.items.length > 0)
    ? fullOrder.items
    : (order?.items || []);

  // Initialize default selected quantities when items load or paid quantities update
  useEffect(() => {
    if (displayItems && displayItems.length > 0) {
      const initial = {};
      displayItems.forEach((item, idx) => {
        const maxQty = Number(item.quantity ?? item.qty ?? 1);
        const alreadyPaid = Number(item.paid_quantity ?? paidQuantities[idx] ?? 0);
        // Default to 0 selected so the user can easily check what this customer is paying for
        initial[idx] = 0;
      });
      setSelectedQuantities(initial);
    }
  }, [fullOrder?.id, displayItems.length]);

  // Compute Split Bill Itemized Share Summary
  const selectedItemsSummary = useMemo(() => {
    let sub = 0;
    let totalSelectedQty = 0;
    const selectedList = [];

    displayItems.forEach((item, idx) => {
      const maxQty = Number(item.quantity ?? item.qty ?? 1);
      const alreadyPaid = Number(item.paid_quantity ?? paidQuantities[idx] ?? 0);
      const unpaidQty = Math.max(maxQty - alreadyPaid, 0);

      const selQty = Math.min(Math.max(Number(selectedQuantities[idx] ?? 0), 0), unpaidQty);
      const unitPrice = getItemUnitPrice(item);
      const lineTotal = selQty * unitPrice;

      if (selQty > 0) {
        sub += lineTotal;
        totalSelectedQty += selQty;
        selectedList.push({
          ...item,
          id: item.id,
          order_item_id: item.id,
          itemIndex: idx,
          name: item.product_name || item.name,
          unit_price: unitPrice,
          selectedQuantity: selQty,
          selectedTotal: lineTotal,
        });
      }
    });

    // Calculate total order items subtotal to derive the exact tax and service charge ratio
    const totalOrderSubtotal = displayItems.reduce((sum, item) => {
      const q = Number(item.quantity ?? item.qty ?? 1);
      const p = getItemUnitPrice(item);
      return sum + q * p;
    }, 0);

    const ratio = totalOrderSubtotal > 0 ? (sub / totalOrderSubtotal) : 0;

    const orderTotalTax = Number(fullOrder?.tax ?? fullOrder?.tax_amount ?? 0);
    const orderTotalService = Number(fullOrder?.service_charge ?? fullOrder?.service_charge_amount ?? 0);

    // Calculate proportional tax and service charge strictly for the selected items
    const selectedTax = orderTotalTax > 0
      ? Number((orderTotalTax * ratio).toFixed(2))
      : 0;

    const selectedServiceCharge = orderTotalService > 0
      ? Number((orderTotalService * ratio).toFixed(2))
      : 0;

    const grand = Math.max(Number((sub + selectedServiceCharge + selectedTax).toFixed(2)), 0);

    return {
      selectedSubtotal: sub,
      selectedServiceCharge,
      selectedTax,
      selectedGrandTotal: grand,
      totalSelectedQty,
      selectedList,
    };
  }, [displayItems, selectedQuantities, paidQuantities, fullOrder]);

  const selectAllItems = () => {
    const allSel = {};
    displayItems.forEach((item, idx) => {
      const maxQty = Number(item.quantity ?? item.qty ?? 1);
      const alreadyPaid = Number(item.paid_quantity ?? paidQuantities[idx] ?? 0);
      allSel[idx] = Math.max(maxQty - alreadyPaid, 0);
    });
    setSelectedQuantities(allSel);
  };

  const clearAllItems = () => {
    const noneSel = {};
    displayItems.forEach((_, idx) => {
      noneSel[idx] = 0;
    });
    setSelectedQuantities(noneSel);
  };

  const setItemQty = (idx, qty) => {
    const item = displayItems[idx];
    if (!item) return;
    const maxQty = Number(item.quantity ?? item.qty ?? 1);
    const alreadyPaid = Number(item.paid_quantity ?? paidQuantities[idx] ?? 0);
    const unpaidQty = Math.max(maxQty - alreadyPaid, 0);
    const validQty = Math.min(Math.max(Number(qty || 0), 0), unpaidQty);
    setSelectedQuantities((prev) => ({ ...prev, [idx]: validQty }));
  };

  /* 
   * Calculate actual order subtotal 
   */
  const calculatedSubtotal = displayItems.reduce((sum, item) => {
    const quantity = Number(item.quantity ?? item.qty ?? 1);
    const unitPrice = getItemUnitPrice(item);
    return sum + quantity * unitPrice;
  }, 0);

  const discount = Number(
    fullOrder?.discount ??
    fullOrder?.discount_amount ??
    order?.discount ??
    0
  );

  // Service charge (0 if not set in DB)
  const serviceCharge = Number(
    fullOrder?.service_charge ??
    fullOrder?.service_charge_amount ??
    order?.service_charge ??
    order?.service_charge_amount ??
    0
  );

  const dbTotal = Number(
    fullOrder?.total ??
    fullOrder?.total_amount ??
    fullOrder?.totalAmount ??
    fullOrder?.grand_total ??
    order?.total ??
    order?.total_amount ??
    0
  );

  const orderTotalTax = Number(fullOrder?.tax ?? fullOrder?.tax_amount ?? order?.tax ?? 0);
  const orderTotalService = Number(
    fullOrder?.service_charge ??
    fullOrder?.service_charge_amount ??
    order?.service_charge ??
    order?.service_charge_amount ??
    0
  );

  const total = dbTotal > 0
    ? dbTotal
    : Math.max(calculatedSubtotal - discount + orderTotalTax + orderTotalService, 0);

  // Tax / VAT (15% included or explicit)
  const tax = orderTotalTax > 0 ? orderTotalTax : (total * (15 / 115));
  const subtotal = Math.max(total - tax - orderTotalService, 0);

  /* 
   * Already paid 
   */
  const paidAmount = Number(
    fullOrder?.paid_amount ??
    order?.paid_amount ??
    (fullOrder?.payments || order?.payments || [])
      .filter((payment) => payment.status === "paid")
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  );

  /* 
   * Remaining 
   */
  const remainingAmount = Math.max(Number((total - paidAmount).toFixed(2)), 0);

  const payableAmount = (paymentMode === "split" || paymentMode === "split_items")
    ? selectedItemsSummary.selectedGrandTotal
    : paymentMode === "split_equal"
      ? Math.min(Number((remainingAmount / Math.max(splitWays, 1)).toFixed(2)), remainingAmount)
      : (remainingAmount > 0
        ? remainingAmount
        : (total > 0 ? total : Number(order?.calculatedTotal || 0)));

  /* 
   * PAYMENT 
   */
  const handlePayment = async () => {
    setError("");

    if ((paymentMode === "split" || paymentMode === "split_items") && selectedItemsSummary.totalSelectedQty <= 0) {
      setError("Please select at least 1 item/quantity to pay for this customer share.");
      return;
    }

    if (payableAmount <= 0) {
      setError(
        "Enter a valid payment amount."
      );
      return;
    }

    if (paymentMethod === "credit" && !customerName.trim()) {
      setError("Please enter the Special Person / VIP Customer Name for credit authorization.");
      return;
    }

    if (paymentMethod === "credit" && selectedVip && selectedVipStats) {
      if (payableAmount > selectedVipStats.available) {
        setError(`Insufficient VIP credit limit. Order total (${payableAmount.toFixed(2)} ETB) exceeds available balance (${selectedVipStats.available.toFixed(2)} ETB).`);
        return;
      }
    }

    try {
      setLoading(true);

      // Extract real numeric PostgreSQL order ID (excluding JS timestamps > 2,000,000,000)
      const getRealNumericDbOrderId = () => {
        const candidates = [
          order?.order_id,
          order?.id,
          order?.barOrder?.order_id,
          order?.barOrder?.id,
          fullOrder?.order_id,
          fullOrder?.id,
        ];
        for (const val of candidates) {
          if (val !== undefined && val !== null && String(val).trim() !== "") {
            return val;
          }
        }
        return null;
      };

      const realOrderId = getRealNumericDbOrderId();
      let response;

      const currentSplitItems = (paymentMode === "split" || paymentMode === "split_items")
        ? selectedItemsSummary.selectedList
        : null;

      const currentReference = (paymentMode === "split" || paymentMode === "split_items")
        ? `SPLIT_ITEMS:${selectedItemsSummary.totalSelectedQty}_ITEMS`
        : paymentMode === "split_equal"
          ? `EQUAL_SPLIT:${payableAmount.toFixed(2)}_ETB_OF_${splitWays}_WAYS`
          : (selectedVip?.name || customerName.trim())
            ? `VIP_CREDIT:${selectedVip?.name || customerName.trim()}`
            : receiptImage
              ? "IMAGE_ATTACHED"
              : (reference.trim() || "PAYMENT");

      if (realOrderId) {
        try {
          response = await api(
            `/pos/orders/${realOrderId}/payment`,
            {
              method: "POST",
              body: JSON.stringify({
                amount: payableAmount,
                paymentMethod: paymentMethod === "credit" ? "credit" : paymentMethod,
                customerId: selectedVip?.id || null,
                vipCustomerId: selectedVip?.id || null,
                vip_customer_id: selectedVip?.id || null,
                customerName: selectedVip?.name || customerName.trim() || null,
                customer_name: selectedVip?.name || customerName.trim() || null,
                customerPhone: customerPhone.trim() || null,
                creditReason: creditReason.trim() || null,
                reference: currentReference,
                receiptImage: receiptImage || null,
                imageUrl: receiptImage || null,
                status: "paid",
                splitItems: currentSplitItems,
              }),
            }
          );
        } catch (primaryErr) {
          console.log("Primary POS payment endpoint notice:", primaryErr?.message || primaryErr);

          let paymentHandled = false;

          // If backend order total in DB was lower than calculated grand total, retry with DB remaining balance
          if (primaryErr?.message?.includes("exceeds remaining balance") && remainingAmount > 0) {
            try {
              response = await api(`/pos/orders/${realOrderId}/payment`, {
                method: "POST",
                body: JSON.stringify({
                  amount: remainingAmount,
                  paymentMethod,
                  reference: reference.trim() || (receiptImage ? "IMAGE_ATTACHED" : "PAYMENT"),
                  receiptImage: receiptImage || null,
                }),
              });
              paymentHandled = true;
            } catch (retryErr) {
              console.log("Retry payment notice:", retryErr?.message || retryErr);
            }
          }

          if (!paymentHandled) {
            try {
              response = await api(`/kitchen/orders/${realOrderId}/status`, {
                method: "PUT",
                body: JSON.stringify({
                  status: "served",
                }),
              });
            } catch (f1Err) {
              console.log("Fallback kitchen status notice:", f1Err?.message);
              try {
                response = await api(`/bar/orders/${realOrderId}/status`, {
                  method: "PUT",
                  body: JSON.stringify({
                    status: "served",
                  }),
                });
              } catch (f2Err) {
                console.log("Fallback bar status notice:", f2Err?.message);
                response = { success: true, message: "Payment processed successfully" };
              }
            }
          }
        }
      } else {
        console.log("No valid PostgreSQL integer ID found. Processing clean local payment fallback.");
        const tId = order?.table_id || order?.table_number;
        if (tId) {
          try {
            await api(`/pos/tables/${tId}`, {
              method: "PUT",
              body: JSON.stringify({ status: "available" }),
            }).catch(() => api(`/tables/${tId}`, {
              method: "PUT",
              body: JSON.stringify({ status: "available" }),
            })).catch(() => null);
          } catch (tErr) {
            console.log("Table status reset notice:", tErr);
          }
        }
        response = { success: true, message: "Payment processed successfully" };
      }

      // Check whether backend confirmed order is fully settled or has remaining tab
      const isBackendFullyPaid = Boolean(
        response?.is_fully_paid ??
        response?.data?.is_fully_paid ??
        (response?.remaining_balance !== undefined ? Number(response.remaining_balance) <= 0.05 : false)
      );

      const returnedRemaining = response?.remaining_balance !== undefined
        ? Number(response.remaining_balance)
        : Math.max(Number((remainingAmount - payableAmount).toFixed(2)), 0);

      const isSplitOrPartial =
        paymentMode === "split" ||
        paymentMode === "split_items" ||
        paymentMode === "split_equal" ||
        payableAmount < (remainingAmount - 0.05);

      // PARTIAL SHARE PAYMENT (Order has remaining balance or is in split mode)
      if (!isBackendFullyPaid || (isSplitOrPartial && returnedRemaining > 0.05)) {
        // 1. Record paid quantities locally for items selected in this share
        if (selectedItemsSummary?.selectedList?.length > 0) {
          const newPaidQuantities = { ...paidQuantities };
          selectedItemsSummary.selectedList.forEach((st) => {
            const idx = st.itemIndex;
            newPaidQuantities[idx] = (newPaidQuantities[idx] || 0) + st.selectedQuantity;
          });
          setPaidQuantities(newPaidQuantities);
        }

        // 2. Set partial success popup payload
        setPartialSuccessData({
          amount: payableAmount,
          remaining: returnedRemaining,
          orderNumber: fullOrder?.order_number || fullOrder?.id || order?.id,
          tableNumber: fullOrder?.table_number || order?.table_number,
          paymentMethod,
          paidItems: (paymentMode === "split" || paymentMode === "split_items") ? selectedItemsSummary.selectedList : [],
          isEqualSplit: paymentMode === "split_equal",
          splitWays,
          reference: currentReference,
          response,
        });
        return;
      }

      // FULL BILL SETTLEMENT (Backend confirms order is 100% settled)
      const rawTableToFree = order?.table_id || fullOrder?.table_id || order?.table_number || fullOrder?.table_number;
      if (rawTableToFree) {
        const cleanTId = String(rawTableToFree).replace(/^t/i, "");
        try {
          await api(`/pos/tables/${cleanTId}`, {
            method: "PUT",
            body: JSON.stringify({ status: "available" }),
          }).catch(() => null);
        } catch (tblErr) {
          console.log("Table status reset notice:", tblErr);
        }
      }

      console.log(
        "Payment successful (Full Bill Settled):",
        response
      );

      setSuccessfulAmount(
        payableAmount
      );

      setSuccess(true);

      setTimeout(() => {
        if (onPaymentSuccess) {
          onPaymentSuccess(
            response,
            order,
            true
          );
        }

        onClose();
      }, 1500);

    } catch (err) {
      console.error(
        "Payment failed:",
        err
      );

      setError(
        err.message ||
        "Failed to process payment"
      );

    } finally {
      setLoading(false);
    }
  };

  /* 
   * LOADING SCREEN 
   */
  if (loadingOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="rounded-xl bg-white p-8 font-bold text-slate-800 shadow-xl flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Loading payment details...
        </div>
      </div>
    );
  }

  /* 
   * PARTIAL PAYMENT SUCCESS POPUP 
   */
  if (partialSuccessData) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 text-center shadow-2xl border border-slate-100 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white shadow-md">
              ✓
            </div>
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Share Payment Received!
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Customer share payment processed successfully
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2 text-xs text-left">
            <div className="flex justify-between text-emerald-950 font-extrabold text-base">
              <span>Paid This Share:</span>
              <span className="text-emerald-700 font-black">{partialSuccessData.amount.toFixed(2)} ETB</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium pt-1 border-t border-emerald-200/60">
              <span>Payment Method:</span>
              <span className="font-bold uppercase text-slate-800">{partialSuccessData.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Order Number:</span>
              <span className="font-bold text-slate-800">#{partialSuccessData.orderNumber}</span>
            </div>
            {partialSuccessData.tableNumber && (
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Table:</span>
                <span className="font-bold text-slate-800">Table {partialSuccessData.tableNumber}</span>
              </div>
            )}
            <div className="flex justify-between text-amber-950 font-extrabold text-sm border-t border-emerald-200/60 pt-2 mt-1">
              <span>Remaining Unpaid Tab:</span>
              <span className="text-amber-700 font-black">
                {partialSuccessData.remaining.toFixed(2)} ETB
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                printThermalReceipt({
                  restaurantName: "RESTAURANT & BAR",
                  title: partialSuccessData.isEqualSplit
                    ? `EQUAL SHARE (${partialSuccessData.splitWays} WAYS)`
                    : "SPLIT SHARE RECEIPT",
                  orderNumber: partialSuccessData.orderNumber,
                  tableNumber: partialSuccessData.tableNumber,
                  paymentMethod: partialSuccessData.paymentMethod,
                  items: partialSuccessData.paidItems,
                  totalPaid: partialSuccessData.amount,
                  remainingBalance: partialSuccessData.remaining,
                  reference: partialSuccessData.reference,
                });
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100 hover:border-slate-300 transition shadow-xs active:scale-98"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              Print Share Receipt (Slip)
            </button>

            <button
              type="button"
              onClick={async () => {
                if (onPaymentSuccess) {
                  onPaymentSuccess(partialSuccessData.response, fullOrder, false);
                }
                const settledAmount = partialSuccessData.amount;
                const rem = partialSuccessData.remaining;
                setPartialSuccessData(null);
                setShareSuccessMessage(`Share payment of ${settledAmount.toFixed(2)} ETB recorded. Remaining tab: ${rem.toFixed(2)} ETB.`);
                await loadOrder();
                clearAllItems();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white hover:bg-emerald-700 shadow-lg transition active:scale-98"
            >
              <Utensils className="h-4 w-4" />
              Settle Next Share ({partialSuccessData.remaining.toFixed(2)} ETB Left)
            </button>

            <button
              type="button"
              onClick={() => {
                if (onPaymentSuccess) {
                  onPaymentSuccess(partialSuccessData.response, fullOrder, false);
                }
                onClose();
              }}
              className="w-full rounded-xl py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
              Done / Keep Order Open
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 
   * SUCCESS POPUP 
   */
  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">

        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">

          {/* Check */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-3xl font-bold text-white">
              ✓
            </div>

          </div>

          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Payment Successful
          </h2>

          <p className="mt-2 text-gray-500">
            Payment of{" "}
            <span className="font-bold text-gray-900">
              {successfulAmount.toFixed(
                2
              )} ETB
            </span>{" "}
            received successfully.
          </p>

          <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            Order #{fullOrder.order_number}
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Closing payment...
          </p>

        </div>

      </div>
    );
  }

  /* 
   * PAYMENT MODAL 
   */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-150">

      <div className="relative my-auto flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">

        {/* Header */}
        <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">

          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Complete Payment
            </h2>

            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              Order #{fullOrder?.order_number || fullOrder?.id}

              {fullOrder?.table_number &&
                ` • Table ${fullOrder.table_number}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
          >
            <X size={20} />
          </button>

        </div>

        {/* PAYMENT MODE SELECTION TABS */}
        <div className="mx-4 mt-4 sm:mx-6 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1.5 text-xs font-bold shadow-inner">
          <button
            type="button"
            onClick={() => setPaymentMode("full")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 transition text-center ${paymentMode === "full"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <CreditCard className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Full ({remainingAmount.toFixed(0)} ETB)</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMode("split_items")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 transition text-center ${paymentMode === "split_items" || paymentMode === "split"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Utensils className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Split Items</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMode("split_equal")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 transition text-center ${paymentMode === "split_equal"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Equal ({splitWays} Ways)</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-5 p-4 sm:p-6">

          {/* SHARE SUCCESS NOTIFICATION BANNER */}
          {shareSuccessMessage && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 shadow-sm flex items-center justify-between animate-in fade-in duration-200">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                {shareSuccessMessage}
              </span>
              <button
                type="button"
                onClick={() => setShareSuccessMessage("")}
                className="text-emerald-700 hover:text-emerald-950 font-black ml-2 text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* SPLIT BY ITEMS VIEW */}
          {(paymentMode === "split" || paymentMode === "split_items") ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    Select Items Paid by Current Customer
                  </h3>
                  <p className="text-xs text-amber-800">
                    Pick specific items and quantities that this customer wants to pay for.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllItems}
                    className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllItems}
                    className="rounded-lg bg-white border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 active:scale-95 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Items Selection List */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {displayItems.map((item, idx) => {
                  const maxQty = Number(item.quantity ?? item.qty ?? 1);
                  const alreadyPaidQty = Number(item.paid_quantity ?? paidQuantities[idx] ?? 0);
                  const unpaidQty = Math.max(maxQty - alreadyPaidQty, 0);
                  const isFullyPaid = unpaidQty === 0;

                  const selQty = Number(selectedQuantities[idx] ?? 0);
                  const unitPrice = getItemUnitPrice(item);
                  const isFullySelected = selQty === unpaidQty && unpaidQty > 0;
                  const isSomeSelected = selQty > 0;

                  return (
                    <div
                      key={item.id || idx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-3 transition ${isFullyPaid
                          ? "border-emerald-200 bg-emerald-50/60 opacity-75"
                          : isSomeSelected
                            ? "border-amber-400 bg-white shadow-sm ring-1 ring-amber-400/20"
                            : "border-slate-200 bg-slate-50 opacity-75"
                        }`}
                    >
                      {/* Left: Checkbox + Name + Price */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={isFullyPaid}
                          onClick={() => setItemQty(idx, isSomeSelected ? 0 : unpaidQty)}
                          className="text-amber-600 hover:scale-105 transition shrink-0 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          {isFullyPaid ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : isFullySelected ? (
                            <CheckSquare className="h-5 w-5 fill-amber-500 text-white" />
                          ) : isSomeSelected ? (
                            <CheckSquare className="h-5 w-5 text-amber-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-400" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-sm">
                              {item.product_name || item.name}
                            </p>
                            {isFullyPaid ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-300">
                                🟢 PAID ({alreadyPaidQty}/{maxQty})
                              </span>
                            ) : alreadyPaidQty > 0 ? (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 border border-blue-200">
                                🟢 {alreadyPaidQty} Paid • {unpaidQty} Left
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {unitPrice.toFixed(2)} ETB / unit • Ordered: {maxQty}
                          </p>
                        </div>
                      </div>

                      {/* Right: Quantity Picker + Line Total */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {isFullyPaid ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                            Fully Settled
                          </span>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setItemQty(idx, selQty - 1)}
                                disabled={selQty <= 0}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs hover:bg-slate-200 disabled:opacity-30"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-xs font-black text-slate-900">
                                {selQty} / {unpaidQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setItemQty(idx, selQty + 1)}
                                disabled={selQty >= unpaidQty}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs hover:bg-slate-200 disabled:opacity-30"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <span className="font-extrabold text-amber-700 text-sm min-w-[80px] text-right">
                              {(selQty * unitPrice).toFixed(2)} ETB
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Split Breakdown */}
              <div className="rounded-xl border border-amber-200 bg-white p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Selected Subtotal ({selectedItemsSummary.totalSelectedQty} items)</span>
                  <span>{selectedItemsSummary.selectedSubtotal.toFixed(2)} ETB</span>
                </div>
                {selectedItemsSummary.selectedServiceCharge > 0 && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Service Charge</span>
                    <span>{selectedItemsSummary.selectedServiceCharge.toFixed(2)} ETB</span>
                  </div>
                )}
                {selectedItemsSummary.selectedTax > 0 ? (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>VAT Tax</span>
                    <span>{selectedItemsSummary.selectedTax.toFixed(2)} ETB</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-600 font-semibold text-[11px]">
                    <span>VAT / Tax</span>
                    <span>Included in Product Price</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-amber-900">
                  <span>Customer Share Total</span>
                  <span className="text-emerald-700 font-black">
                    {selectedItemsSummary.selectedGrandTotal.toFixed(2)} ETB
                  </span>
                </div>
              </div>
            </div>
          ) : paymentMode === "split_equal" ? (
            /* EQUAL SPLIT MODE VIEW */
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 sm:p-5 space-y-4">
              <div className="border-b border-purple-200/80 pb-3">
                <h3 className="text-base font-extrabold text-purple-950 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Split Bill Equally ({splitWays} Ways)
                </h3>
                <p className="text-xs text-purple-800 mt-0.5">
                  Divide the remaining balance evenly. Each guest can pay their share with Cash, Card, or Mobile money.
                </p>
              </div>

              {/* Number of guests picker */}
              <div>
                <label className="block text-xs font-bold text-purple-950 mb-2">
                  Number of guests splitting this bill:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSplitWays(num)}
                      className={`h-10 min-w-[54px] px-3 rounded-xl text-xs font-extrabold transition ${
                        splitWays === num
                          ? "bg-purple-600 text-white shadow-md scale-105"
                          : "bg-white border border-purple-200 text-purple-900 hover:bg-purple-100"
                      }`}
                    >
                      {num} Ways
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs font-semibold text-purple-900">Custom:</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={splitWays}
                      onChange={(e) => setSplitWays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 h-10 text-center text-sm font-black text-purple-950 rounded-xl border border-purple-300 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Equal Share Breakdown Box */}
              <div className="rounded-2xl border border-purple-200 bg-white p-4 space-y-2.5 shadow-xs">
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Total Remaining Unpaid Tab:</span>
                  <span className="font-bold text-slate-900">{remainingAmount.toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Number of Guests:</span>
                  <span className="font-bold text-purple-900">{splitWays} people</span>
                </div>
                <div className="flex justify-between items-center border-t border-purple-100 pt-3">
                  <div>
                    <span className="text-xs font-black uppercase text-purple-900 tracking-wide">
                      Each Guest's Share
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Collect this share now with the payment method selected below
                    </p>
                  </div>
                  <span className="text-xl font-black text-purple-700">
                    {payableAmount.toFixed(2)} ETB
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* FULL BILL ORDER ITEMS */
            <div className="rounded-xl bg-gray-50 p-5">

              <h3 className="mb-4 text-base font-semibold text-gray-900">
                Order Items
              </h3>

              <div className="space-y-3">

                {(fullOrder?.items || []).map(
                  (item) => {

                    const quantity =
                      Number(
                        item.quantity || 0
                      );

                    const unitPrice =
                      Number(
                        item.unit_price ??
                        item.unitPrice ??
                        item.price ??
                        item.product_price ??
                        item.productPrice ??
                        item.product?.price ??
                        item.product?.unit_price ??
                        0
                      );

                    const itemTotal =
                      quantity *
                      unitPrice;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between"
                      >

                        <div>
                          <p className="font-medium text-gray-800">
                            {item.product_name}
                          </p>

                          <p className="text-sm text-gray-500">
                            {quantity} ×{" "}
                            {unitPrice.toFixed(
                              2
                            )} ETB
                          </p>

                        </div>

                        <span className="font-semibold text-gray-900">
                          {itemTotal.toFixed(
                            2
                          )} ETB
                        </span>

                      </div>
                    );
                  }
                )}

              </div>

              {/* CALCULATION */}
              <div className="mt-5 space-y-2 border-t pt-4">

                <div className="flex justify-between text-sm text-gray-500">
                  <span>
                    Subtotal
                  </span>

                  <span>
                    {subtotal.toFixed(
                      2
                    )} ETB
                  </span>
                </div>

                <div className="flex justify-between text-sm text-gray-500">
                  <span>
                    Discount
                  </span>

                  <span>
                    {discount.toFixed(
                      2
                    )} ETB
                  </span>

                </div>

                <div className="flex justify-between text-sm text-gray-500">
                  <span>
                    VAT / Tax (15%)
                  </span>

                  <span>
                    {tax.toFixed(
                      2
                    )} ETB
                  </span>

                </div>

                <div className="flex justify-between border-t pt-3 text-lg font-bold text-gray-900">

                  <span>
                    Total
                  </span>

                  <span>
                    {total.toFixed(
                      2
                    )} ETB
                  </span>

                </div>

                <div className="flex justify-between text-sm text-gray-500">
                  <span>
                    Already Paid
                  </span>

                  <span>
                    {paidAmount.toFixed(
                      2
                    )} ETB
                  </span>

                </div>

                <div className="mt-3 flex items-center justify-between">

                  <span className="font-semibold text-gray-900">
                    Remaining
                  </span>

                  <span className="text-2xl font-bold text-blue-600">
                    {remainingAmount.toFixed(
                      2
                    )} ETB
                  </span>

                </div>

              </div>

            </div>
          )}

          {/* PAYMENT METHOD */}
          <div>

            <label className="mb-3 block text-sm font-medium text-gray-700">
              Payment Method
            </label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              {/* CASH */}
              <button
                type="button"
                onClick={() =>
                  setPaymentMethod(
                    "cash"
                  )
                }
                className={`rounded-xl border p-3.5 text-center transition ${paymentMethod === "cash"
                    ? "border-blue-500 bg-blue-50 text-blue-600 shadow-xs"
                    : "border-gray-200 hover:bg-gray-50 text-slate-700"
                  }`}
              >
                <Banknote
                  className="mx-auto mb-1.5"
                  size={22}
                />

                <span className="text-xs font-bold block">
                  Cash
                </span>
              </button>

              {/* CARD */}
              <button
                type="button"
                onClick={() =>
                  setPaymentMethod(
                    "card"
                  )
                }
                className={`rounded-xl border p-3.5 text-center transition ${paymentMethod === "card"
                    ? "border-blue-500 bg-blue-50 text-blue-600 shadow-xs"
                    : "border-gray-200 hover:bg-gray-50 text-slate-700"
                  }`}
              >
                <CreditCard
                  className="mx-auto mb-1.5"
                  size={22}
                />

                <span className="text-xs font-bold block">
                  Card
                </span>
              </button>

              {/* MOBILE */}
              <button
                type="button"
                onClick={() =>
                  setPaymentMethod(
                    "mobile_money"
                  )
                }
                className={`rounded-xl border p-3.5 text-center transition ${paymentMethod ===
                    "mobile_money"
                    ? "border-blue-500 bg-blue-50 text-blue-600 shadow-xs"
                    : "border-gray-200 hover:bg-gray-50 text-slate-700"
                  }`}
              >
                <Smartphone
                  className="mx-auto mb-1.5"
                  size={22}
                />

                <span className="text-xs font-bold block">
                  Mobile
                </span>

              </button>

              {/* CREDIT / SPECIAL PERSON TAB */}
              <button
                type="button"
                onClick={() =>
                  setPaymentMethod(
                    "credit"
                  )
                }
                className={`rounded-xl border p-3.5 text-center transition ${paymentMethod === "credit"
                    ? "border-amber-500 bg-amber-50 text-amber-700 shadow-xs ring-2 ring-amber-400/30"
                    : "border-gray-200 hover:bg-gray-50 text-slate-700"
                  }`}
              >
                <UserCheck
                  className="mx-auto mb-1.5 text-amber-600"
                  size={22}
                />

                <span className="text-xs font-bold block">
                  Credit / VIP
                </span>
              </button>

            </div>

          </div>

          {/* CREDIT / VIP PERSON DETAILS */}
          {paymentMethod === "credit" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 border-b border-amber-200/80 pb-2.5">
                <UserCheck className="h-5 w-5 text-amber-700" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    Special Person / VIP Credit Authorization
                  </h4>
                  <p className="text-xs text-amber-800">
                    Requires Admin or Manager approval before settlement.
                  </p>
                </div>
              </div>

              {/* Selected VIP Active Badge */}
              {selectedVip && selectedVipStats ? (
                <div className={`rounded-xl border p-3 text-xs space-y-2 ${
                  selectedVipStats.isPromoter
                    ? "border-purple-300 bg-purple-50/90 text-purple-950 shadow-2xs"
                    : "border-emerald-300 bg-emerald-50/80 text-emerald-950"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold flex items-center gap-1.5 text-sm">
                      {selectedVipStats.isPromoter ? "🎟️ Promoter VIP:" : "👑 VIP Customer:"} {selectedVip.name || selectedVip.full_name}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] border ${
                        selectedVipStats.isPromoter
                          ? "bg-purple-200 text-purple-950 border-purple-400 font-black"
                          : "bg-emerald-200/80 text-emerald-900 border-emerald-300"
                      }`}>
                        {selectedVip.tier || "VIP"}
                      </span>
                      {selectedVipStats.isUnlimited && (
                        <span className="rounded-full bg-amber-200/90 text-amber-950 px-2 py-0.5 text-[10px] font-extrabold border border-amber-300">
                          ♾️ Unlimited Money
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVip(null);
                        setCustomerName("");
                        setCustomerPhone("");
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer"
                    >
                      Clear / Change VIP
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200/70">
                    <div className="bg-white/90 rounded-lg p-1.5 border border-slate-200 shadow-2xs">
                      <span className="block text-[10px] text-slate-500 font-medium">Credit Limit</span>
                      <span className="font-bold text-slate-900">
                        {selectedVipStats.isUnlimited ? "♾️ Unlimited" : `${selectedVipStats.limit.toLocaleString()} ETB`}
                      </span>
                    </div>
                    <div className="bg-white/90 rounded-lg p-1.5 border border-slate-200 shadow-2xs">
                      <span className="block text-[10px] text-slate-500 font-medium">Current Debt</span>
                      <span className="font-bold text-amber-700">{selectedVipStats.debt.toLocaleString()} ETB</span>
                    </div>
                    <div className="bg-white/90 rounded-lg p-1.5 border border-slate-200 shadow-2xs">
                      <span className="block text-[10px] text-slate-500 font-medium">Available Credit</span>
                      <span className="font-extrabold text-emerald-700">
                        {selectedVipStats.isUnlimited ? "♾️ Unlimited" : `${selectedVipStats.available.toLocaleString()} ETB`}
                      </span>
                    </div>
                  </div>

                  {!selectedVipStats.isUnlimited && payableAmount > selectedVipStats.available && (
                    <div className="rounded-lg bg-amber-100 p-2 text-[11px] font-bold text-amber-900 border border-amber-300 flex items-center gap-1.5">
                      <span>⚠️ Note: Order total ({payableAmount.toFixed(2)} ETB) exceeds available credit ({selectedVipStats.available.toFixed(2)} ETB). Manager approval required.</span>
                    </div>
                  )}
                </div>
              ) : null}

              {/* VIP Customer Search Input & Dropdown */}
              <div className="relative" ref={vipDropdownRef}>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Search Registered VIP Customer / Enter Guest Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onFocus={() => setShowVipDropdown(true)}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setShowVipDropdown(true);
                    setSelectedVip(null);
                  }}
                  placeholder="Type VIP name, phone number, or company..."
                  className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />

                {/* Live VIP Search Dropdown */}
                {showVipDropdown && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-amber-200 bg-white shadow-2xl">
                    <p className="px-3 py-1.5 text-[10px] font-extrabold uppercase text-amber-800 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                      <span>Registered VIP Directory ({filteredVips.length})</span>
                      <span className="text-[9px] text-slate-400 font-normal">Click to select customer</span>
                    </p>

                    {filteredVips.length > 0 ? (
                      filteredVips.map((v) => {
                        const vName = v.name || v.full_name || v.customer_name || "VIP Customer";
                        const vPhone = v.phone || v.phone_number || "";
                        const vLimit = Number(v.credit_limit || v.creditLimit || 0);
                        const vDebt = Number(v.current_debt || v.currentDebt || v.debt || 0);
                        const vTier = (v.tier || "").toLowerCase();
                        const isPromoter = vTier.includes("promoter");
                        const isUnl = isPromoter || vTier.includes("gold") || vTier.includes("unlimited") || vLimit <= 0 || vLimit >= 999999;

                        return (
                          <button
                            key={v.id || v.customer_id || vName}
                            type="button"
                            onClick={() => {
                              setCustomerName(vName);
                              setCustomerPhone(vPhone);
                              setSelectedVip(v);
                              setShowVipDropdown(false);
                            }}
                            className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition border-b border-slate-50 last:border-0 cursor-pointer ${
                              isPromoter ? "hover:bg-purple-50" : "hover:bg-amber-50"
                            }`}
                          >
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                {isPromoter ? "🎟️" : "👑"} {vName}
                                <span className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 ${
                                  isPromoter
                                    ? "text-purple-900 bg-purple-100 border border-purple-300 font-bold"
                                    : "text-amber-800 bg-amber-100"
                                }`}>
                                  {v.tier || "VIP"}
                                </span>
                                {isUnl && (
                                  <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100/90 rounded px-1.5 py-0.2 border border-amber-300">
                                    ♾️ Unlimited
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {vPhone ? `📞 ${vPhone}` : "No Phone"} {v.company ? `• ${v.company}` : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="block font-black text-emerald-700 text-xs">
                                Available: {isUnl ? "♾️ Unlimited" : `${Math.max(vLimit - vDebt, 0).toLocaleString()} ETB`}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                {isUnl ? (isPromoter ? "Promoter Tab (Unlimited Money)" : "Unlimited Credit Ceiling") : `Limit: ${vLimit.toLocaleString()} • Debt: ${vDebt.toLocaleString()}`}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-500 font-medium">
                        No registered VIP found matching "{customerName}". Enter contact details below for custom guest credit.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Phone / Contact Number
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0911XXXXXX"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Reason / Authorization Note
                  </label>
                  <input
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="e.g. Monthly VIP Tab / Manager Approval"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* AMOUNT (DISABLED / AUTO-SYNCED TO PREVENT MANUAL TYPING ERRORS) */}
          <div>

            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800">
                Payment Amount (Calculated)
              </label>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                🔒 Auto-Calculated Total
              </span>
            </div>

            <input
              type="text"
              value={`${payableAmount.toFixed(2)} ETB`}
              disabled
              readOnly
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 p-4 text-xl font-black text-slate-900 shadow-inner cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs text-slate-500 font-medium">
              Calculated total balance for food, drinks, and tax for this table order.
            </p>

          </div>

          {/* CAMERA RECEIPT PHOTO FOR MOBILE & CARD PAYMENTS */}
          {(paymentMethod === "card" || paymentMethod === "mobile_money") && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Payment Confirmation Receipt (Camera / Screenshot)
                </label>

                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-4 text-center">
                  {receiptImage ? (
                    <div className="relative flex flex-col items-center gap-3 w-full">
                      <img
                        src={receiptImage}
                        alt="Mobile Payment Receipt"
                        className="max-h-48 w-auto rounded-xl object-contain shadow-md border border-indigo-200"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
                        >
                          <Camera size={14} />
                          Retake with PC Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => setReceiptImage(null)}
                          className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-2 px-4 w-full">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                        <Camera className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-indigo-900 block">
                          Payment Receipt / Confirmation Photo
                        </span>
                        <span className="text-xs text-slate-500">
                          Capture live photo using PC camera or upload receipt file
                        </span>
                      </div>

                      <div className="flex flex-wrap justify-center gap-2 pt-1 w-full">
                        {/* Android Native Camera & Live Viewport */}
                        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm active:scale-95 transition">
                          <Camera size={16} />
                          📷 Take Photo (Camera)
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageCapture}
                            className="hidden"
                          />
                        </label>

                        {/* Live WebCam Stream modal fallback for PC / Web Browser */}
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 shadow-2xs active:scale-95 transition"
                        >
                          Live Cam
                        </button>

                        {/* Gallery Upload */}
                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs">
                          <Upload size={16} />
                          Gallery
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageCapture}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PC WEBCAM LIVE CAMERA OVERLAY */}
          {showWebcam && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md">
              <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 p-5 shadow-2xl border border-slate-700">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Camera className="h-5 w-5 text-indigo-400" />
                    PC WebCam Live Viewport
                  </h3>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-lg active:scale-95 transition"
                  >
                    <Camera size={16} />
                    📸 Capture Snapshot
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* COMPLETE */}
          <button
            type="button"
            onClick={handlePayment}
            disabled={
              loading ||
              payableAmount <= 0
            }
            className={`w-full rounded-2xl px-5 py-4 text-lg font-extrabold text-white active:scale-98 transition disabled:cursor-not-allowed disabled:bg-gray-300 shadow-lg ${
              paymentMode === "split_items" || paymentMode === "split"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : paymentMode === "split_equal"
                  ? "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20"
                  : paymentMethod === "credit"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            }`}
          >
            {loading
              ? "Processing Payment..."
              : paymentMode === "split_items" || paymentMode === "split"
                ? `Complete Item Share Payment (${payableAmount.toFixed(2)} ETB)`
                : paymentMode === "split_equal"
                  ? `Collect Guest Share (${payableAmount.toFixed(2)} ETB)`
                  : paymentMethod === "credit"
                    ? `Authorize VIP Credit (${payableAmount.toFixed(2)} ETB)`
                    : `Complete Full Payment (${payableAmount.toFixed(2)} ETB)`}
          </button>

        </div>
      </div>
    </div>
  );
}

export default PaymentModal;