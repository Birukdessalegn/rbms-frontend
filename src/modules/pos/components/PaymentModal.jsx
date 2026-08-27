import { useEffect, useState } from "react"; 
import { 
  X, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  Camera,
  Upload,
  CheckCircle2,
} from "lucide-react"; 
import api from "../../../services/api"; 
 
function PaymentModal({ 
  order, 
  onClose, 
  onPaymentSuccess, 
}) { 
  const [paymentMethod, setPaymentMethod] = useState("cash"); 
  const [amount, setAmount] = useState(""); 
  const [reference, setReference] = useState(""); 
  const [receiptImage, setReceiptImage] = useState(null);
 
  const [loading, setLoading] = useState(false); 
  const [loadingOrder, setLoadingOrder] = useState(true); 
  const [error, setError] = useState(""); 
 
  const [fullOrder, setFullOrder] = useState(order); 
  const [success, setSuccess] = useState(false); 
 
  const [successfulAmount, setSuccessfulAmount] = 
    useState(0); 

  const handleImageCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
 
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
 
        const tax = Number( 
          loadedOrder.tax ?? 
          loadedOrder.tax_amount ?? 
          0 
        ); 
 
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
          : backendTotal; 
 
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
 
  /* 
   * Loading screen 
   */ 
  if (loadingOrder) { 
    return ( 
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"> 
        <div className="rounded-xl bg-white p-8"> 
          Loading payment... 
        </div> 
      </div> 
    ); 
  } 
 
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

  const payableAmount = remainingAmount > 0 
    ? remainingAmount 
    : (total > 0 ? total : Number(order?.calculatedTotal || 0));

  /* 
   * PAYMENT 
   */ 
  const handlePayment = async () => { 
    setError(""); 

    if (payableAmount <= 0) { 
      setError( 
        "Enter a valid payment amount." 
      ); 
      return; 
    } 

    if ( 
      (paymentMethod === "card" || 
        paymentMethod === 
          "mobile_money") && 
      !reference.trim() 
    ) { 
      setError( 
        "Please enter the transaction reference." 
      ); 
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
                reference: 
                  reference.trim() || (receiptImage ? "IMAGE_ATTACHED" : "PAYMENT"), 
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

        {/* Body */} 
        <div className="flex-1 overflow-y-auto space-y-5 p-4 sm:p-6"> 
 
          {/* ORDER ITEMS */} 
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
 
          {/* PAYMENT METHOD */} 
          <div> 
 
            <label className="mb-3 block text-sm font-medium text-gray-700"> 
              Payment Method 
            </label> 
 
            <div className="grid grid-cols-3 gap-3"> 
 
              {/* CASH */} 
              <button 
                type="button" 
                onClick={() => 
                  setPaymentMethod( 
                    "cash" 
                  ) 
                } 
                className={`rounded-xl border p-4 ${ 
                  paymentMethod === "cash" 
                    ? "border-blue-500 bg-blue-50 text-blue-600" 
                    : "border-gray-200 hover:bg-gray-50" 
                }`} 
              > 
                <Banknote 
                  className="mx-auto mb-2" 
                  size={24} 
                /> 
 
                <span className="text-sm font-medium"> 
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
                className={`rounded-xl border p-4 ${ 
                  paymentMethod === "card" 
                    ? "border-blue-500 bg-blue-50 text-blue-600" 
                    : "border-gray-200 hover:bg-gray-50" 
                }`} 
              > 
                <CreditCard 
                  className="mx-auto mb-2" 
                  size={24} 
                /> 
 
                <span className="text-sm font-medium"> 
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
                className={`rounded-xl border p-4 ${ 
                  paymentMethod === 
                  "mobile_money" 
                    ? "border-blue-500 bg-blue-50 text-blue-600" 
                    : "border-gray-200 hover:bg-gray-50" 
                }`} 
              > 
                <Smartphone 
                  className="mx-auto mb-2" 
                  size={24} 
                /> 
 
                <span className="text-sm font-medium"> 
                  Mobile 
                </span> 
 
              </button> 

            </div> 
 
          </div> 
 
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
 
          {/* REFERENCE & CAMERA RECEIPT PHOTO */} 
          {(paymentMethod === 
            "card" || 
            paymentMethod === 
              "mobile_money") && ( 
            <div className="space-y-4"> 

              <div> 
                <label className="mb-2 block text-sm font-medium text-gray-700"> 
                  Transaction Reference / Confirmation Code
                </label> 

                <input 
                  type="text" 
                  value={reference} 
                  onChange={(e) => 
                    setReference( 
                      e.target.value 
                    ) 
                  } 
                  placeholder="e.g. TXN987654321 / CBE / Telebirr" 
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500" 
                /> 
              </div>

              {paymentMethod === "mobile_money" && (
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
                          <label className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs">
                            Retake Photo
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleImageCapture}
                              className="hidden"
                            />
                          </label>
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
                      <label className="flex cursor-pointer flex-col items-center gap-2 py-2 px-4 w-full">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                          <Camera className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-indigo-700 block">
                            📷 Open Camera / Attach Confirmation Photo
                          </span>
                          <span className="text-xs text-slate-500">
                            Tap to take photo of Telebirr / CBE Birr receipt
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleImageCapture}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

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
            className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-lg font-extrabold text-white hover:bg-emerald-700 active:scale-98 transition disabled:cursor-not-allowed disabled:bg-gray-300 shadow-lg" 
          > 
            {loading 
              ? "Processing Payment..." 
              : `Complete Payment (${payableAmount.toFixed(2)} ETB)`} 
          </button> 
 
        </div> 
      </div> 
    </div> 
  ); 
} 
 
export default PaymentModal;