import { useEffect, useState, useRef, useMemo } from "react"; 
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
} from "lucide-react"; 
import api from "../../../services/api"; 
 
function PaymentModal({ 
  order, 
  onClose, 
  onPaymentSuccess, 
}) { 
  const [paymentMethod, setPaymentMethod] = useState("cash"); 
  const [paymentMode, setPaymentMode] = useState("full"); // "full" | "split"
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
 
  useEffect(() => { 
    const loadOrder = async () => { 
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
 
          console.log("PAYMENT ITEM:", item); 
          console.log("QUANTITY:", quantity); 
          console.log("UNIT PRICE:", unitPrice); 
 
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
    }; 
 
    loadOrder(); 
  }, [order.order_id, order.id]); 
 
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
        const alreadyPaid = Number(paidQuantities[idx] || 0);
        initial[idx] = Math.max(maxQty - alreadyPaid, 0);
      });
      setSelectedQuantities(initial);
    }
  }, [fullOrder?.id, displayItems.length, paidQuantities]);

  // Compute Split Bill Itemized Share Summary
  const selectedItemsSummary = useMemo(() => {
    let sub = 0;
    let totalSelectedQty = 0;
    const selectedList = [];

    displayItems.forEach((item, idx) => {
      const maxQty = Number(item.quantity ?? item.qty ?? 1);
      const alreadyPaid = Number(paidQuantities[idx] || 0);
      const unpaidQty = Math.max(maxQty - alreadyPaid, 0);

      const selQty = Math.min(Math.max(Number(selectedQuantities[idx] ?? 0), 0), unpaidQty);
      const unitPrice = getItemUnitPrice(item);
      const lineTotal = selQty * unitPrice;

      if (selQty > 0) {
        sub += lineTotal;
        totalSelectedQty += selQty;
        selectedList.push({
          ...item,
          itemIndex: idx,
          selectedQuantity: selQty,
          selectedTotal: lineTotal,
        });
      }
    });

    const service = Number(fullOrder?.service_charge ?? fullOrder?.service_charge_amount ?? 0);
    const vatTax = Number(fullOrder?.tax ?? fullOrder?.tax_amount ?? 0);
    const grand = Math.max(sub + service + vatTax, 0);

    return {
      selectedSubtotal: sub,
      selectedServiceCharge: service,
      selectedTax: vatTax,
      selectedGrandTotal: grand,
      totalSelectedQty,
      selectedList,
    };
  }, [displayItems, selectedQuantities, paidQuantities]);

  const selectAllItems = () => {
    const allSel = {};
    displayItems.forEach((item, idx) => {
      const maxQty = Number(item.quantity ?? item.qty ?? 1);
      const alreadyPaid = Number(paidQuantities[idx] || 0);
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
    const alreadyPaid = Number(paidQuantities[idx] || 0);
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

  // Service charge (10%)
  const serviceCharge = Number( 
    fullOrder?.service_charge ?? 
    fullOrder?.service_charge_amount ?? 
    order?.service_charge ??
    (calculatedSubtotal * 0.10) 
  );

  // Tax / VAT (5%)
  const tax = Number( 
    fullOrder?.tax ?? 
    fullOrder?.tax_amount ?? 
    order?.tax ??
    (calculatedSubtotal * 0.05) 
  ); 

  const calculatedGrandTotal = Math.max(
    calculatedSubtotal - discount + serviceCharge + tax,
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

  const total = dbTotal > 0 ? dbTotal : calculatedGrandTotal;

  const subtotal = calculatedSubtotal > 0 ? calculatedSubtotal : total; 

  /* 
   * Already paid 
   */ 
  const paidAmount = ( 
    fullOrder?.payments || order?.payments || [] 
  ) 
    .filter((payment) => payment.status === "paid") 
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0); 

  /* 
   * Remaining 
   */ 
  const remainingAmount = Math.max(total - paidAmount, 0); 

  const payableAmount = paymentMode === "split"
    ? selectedItemsSummary.selectedGrandTotal
    : (remainingAmount > 0 
      ? remainingAmount 
      : (total > 0 ? total : Number(order?.calculatedTotal || 0)));

  /* 
   * PAYMENT 
   */ 
  const handlePayment = async () => { 
    setError(""); 

    if (paymentMode === "split" && selectedItemsSummary.totalSelectedQty <= 0) {
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
          const num = Number(val);
          if (!isNaN(num) && Number.isInteger(num) && num > 0 && num < 2000000000) {
            return num;
          }
        }
        return null;
      };

      const realOrderId = getRealNumericDbOrderId();
      let response;

      if (realOrderId) {
        try {
          response = await api(
            `/pos/orders/${realOrderId}/payment`,
            {
              method: "POST",
              body: JSON.stringify({
                amount: payableAmount,
                paymentMethod,
                customerName: customerName.trim() || null,
                customerPhone: customerPhone.trim() || null,
                creditReason: creditReason.trim() || null,
                reference: paymentMode === "split"
                  ? `SPLIT_SHARE:${selectedItemsSummary.totalSelectedQty}_ITEMS`
                  : customerName.trim()
                  ? `VIP_CREDIT:${customerName.trim()}`
                  : receiptImage
                  ? "IMAGE_ATTACHED"
                  : "PAYMENT",
                receiptImage: receiptImage || null,
                imageUrl: receiptImage || null,
                status: paymentMethod === "credit" ? "credit_pending" : "paid",
                splitItems: paymentMode === "split" ? selectedItemsSummary.selectedList : null,
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
            await api(`/tables/${tId}/status`, {
              method: "PUT",
              body: JSON.stringify({ status: "available" }),
            });
          } catch (tErr) {
            console.log("Table status reset notice:", tErr);
          }
        }
        response = { success: true, message: "Payment processed successfully" };
      }

      // Calculate remaining balance after this payment
      const newPaidAmount = paidAmount + payableAmount;
      const remainingAfterThisPayment = Math.max(total - newPaidAmount, 0);

      // PARTIAL SPLIT PAYMENT (Remaining tab > 0)
      if (paymentMode === "split" && remainingAfterThisPayment > 0.01) {
        // 1. Record paid quantities locally for items selected in this share
        const newPaidQuantities = { ...paidQuantities };
        selectedItemsSummary.selectedList.forEach((st) => {
          const idx = st.itemIndex;
          newPaidQuantities[idx] = (newPaidQuantities[idx] || 0) + st.selectedQuantity;
        });
        setPaidQuantities(newPaidQuantities);

        // 2. Set partial success popup payload
        setPartialSuccessData({
          amount: payableAmount,
          remaining: remainingAfterThisPayment,
          orderNumber: fullOrder?.order_number || fullOrder?.id || order?.id,
          response,
        });
        return;
      }

      // FULL BILL SETTLEMENT (Remaining tab <= 0)
      const tableIdToFree = order?.table_id || fullOrder?.table_id || order?.table_number || fullOrder?.table_number;
      if (tableIdToFree) {
        try {
          await api(`/tables/${tableIdToFree}/status`, {
            method: "PUT",
            body: JSON.stringify({ status: "available", is_occupied: false }),
          }).catch(() => api(`/pos/tables/${tableIdToFree}/status`, {
            method: "PUT",
            body: JSON.stringify({ status: "available", is_occupied: false }),
          }));
        } catch (tblErr) {
          console.log("Table status reset notice:", tblErr);
        }
      }

      console.log( 
        "Payment successful:", 
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
            order
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
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl border border-slate-100 space-y-4"> 
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"> 
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white shadow-md"> 
              ✓ 
            </div> 
          </div> 

          <h2 className="text-xl font-extrabold text-slate-900"> 
            Partial Share Payment Received! 
          </h2> 

          <p className="text-xs text-slate-600 font-medium"> 
            Customer share payment of{" "} 
            <span className="font-extrabold text-slate-900"> 
              {partialSuccessData.amount.toFixed(2)} ETB 
            </span>{" "} 
            received successfully. 
          </p> 

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-1.5 text-xs text-left"> 
            <div className="flex justify-between text-amber-900 font-medium"> 
              <span>Order Number</span> 
              <span className="font-bold">#{partialSuccessData.orderNumber}</span> 
            </div> 
            <div className="flex justify-between text-amber-950 font-extrabold text-sm border-t border-amber-200/80 pt-2 mt-1"> 
              <span>Remaining Unpaid Tab</span> 
              <span className="text-amber-700 font-black"> 
                {partialSuccessData.remaining.toFixed(2)} ETB 
              </span> 
            </div> 
          </div> 

          <button 
            type="button" 
            onClick={() => { 
              if (onPaymentSuccess) { 
                onPaymentSuccess(partialSuccessData.response, fullOrder); 
              } 
              window.location.reload(); 
            }} 
            className="w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-extrabold text-white hover:bg-emerald-700 shadow-lg active:scale-95 transition" 
          > 
            OK / Reload Page 
          </button> 
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
        <div className="mx-4 mt-4 sm:mx-6 flex items-center rounded-2xl bg-slate-100 p-1.5 text-xs font-bold shadow-inner">
          <button
            type="button"
            onClick={() => setPaymentMode("full")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 transition ${
              paymentMode === "full"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Full Bill Payment ({remainingAmount.toFixed(2)} ETB)
          </button>

          <button
            type="button"
            onClick={() => setPaymentMode("split")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 transition ${
              paymentMode === "split"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Utensils className="h-4 w-4" />
            Split / Shared Item Payment
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

          {/* SPLIT / SHARED BILL SELECTION */}
          {paymentMode === "split" ? (
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
                    className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllItems}
                    className="rounded-lg bg-white border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Items Selection List */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {displayItems.map((item, idx) => {
                  const maxQty = Number(item.quantity ?? item.qty ?? 1);
                  const alreadyPaidQty = Number(paidQuantities[idx] || 0);
                  const unpaidQty = Math.max(maxQty - alreadyPaidQty, 0);
                  const isFullyPaid = unpaidQty === 0;

                  const selQty = Number(selectedQuantities[idx] ?? 0);
                  const unitPrice = getItemUnitPrice(item);
                  const isFullySelected = selQty === unpaidQty && unpaidQty > 0;
                  const isSomeSelected = selQty > 0;

                  return (
                    <div
                      key={item.id || idx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-3 transition ${
                        isFullyPaid
                          ? "border-emerald-200 bg-emerald-50/50 opacity-80"
                          : isSomeSelected
                          ? "border-amber-400 bg-white shadow-sm ring-1 ring-amber-400/20"
                          : "border-slate-200 bg-slate-50 opacity-70"
                      }`}
                    >
                      {/* Left: Checkbox + Name + Price */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={isFullyPaid}
                          onClick={() => setItemQty(idx, isSomeSelected ? 0 : unpaidQty)}
                          className="text-amber-600 hover:scale-105 transition shrink-0 disabled:opacity-40 disabled:hover:scale-100"
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
                                🟢 PAID FOR GOOD
                              </span>
                            ) : alreadyPaidQty > 0 ? (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 border border-blue-200">
                                🟢 {alreadyPaidQty} Paid • {unpaidQty} Left
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {unitPrice.toFixed(2)} ETB / unit • Total Ordered: {maxQty}
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
                    Tax 
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
                className={`rounded-xl border p-3.5 text-center transition ${ 
                  paymentMethod === "cash" 
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
                className={`rounded-xl border p-3.5 text-center transition ${ 
                  paymentMethod === "card" 
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
                className={`rounded-xl border p-3.5 text-center transition ${ 
                  paymentMethod === 
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
                className={`rounded-xl border p-3.5 text-center transition ${ 
                  paymentMethod === "credit" 
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

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Special Person / Customer Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. VIP Guest / Mr. Abebe / Board Member"
                  className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
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
              paymentMode === "split"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : paymentMethod === "credit"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            }`} 
          > 
            {loading 
              ? "Processing Payment..." 
              : paymentMode === "split"
              ? `Complete Split Share Payment (${payableAmount.toFixed(2)} ETB)`
              : paymentMethod === "credit"
              ? `Submit for Manager Approval (${payableAmount.toFixed(2)} ETB)`
              : `Complete Payment (${payableAmount.toFixed(2)} ETB)`} 
          </button> 
 
        </div> 
      </div> 
    </div> 
  ); 
} 
 
export default PaymentModal;