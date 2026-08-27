import { useEffect, useState } from "react"; 
import { 
  X, 
  Banknote, 
  CreditCard, 
  Smartphone, 
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
 
  const [loading, setLoading] = useState(false); 
  const [loadingOrder, setLoadingOrder] = useState(true); 
  const [error, setError] = useState(""); 
 
  const [fullOrder, setFullOrder] = useState(order); 
  const [success, setSuccess] = useState(false); 
 
  const [successfulAmount, setSuccessfulAmount] = 
    useState(0); 
 
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
 
  /* 
   * Calculate actual order subtotal 
   */ 
  const subtotal = ( 
    fullOrder?.items || [] 
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
    fullOrder?.discount ?? 
    fullOrder?.discount_amount ?? 
    0 
  ); 
 
  const tax = Number( 
    fullOrder?.tax ?? 
    fullOrder?.tax_amount ?? 
    0 
  ); 
 
  /* 
   * Actual total 
   */ 
  const backendTotal = Number( 
    fullOrder?.total_amount ?? 
    fullOrder?.totalAmount ?? 
    fullOrder?.total ?? 
    fullOrder?.grand_total ?? 
    fullOrder?.grandTotal ?? 
    0 
  ); 
 
  const total = subtotal > 0 
    ? Math.max( 
        subtotal - discount + tax, 
        0 
      ) 
    : backendTotal; 
 
  /* 
   * Already paid 
   */ 
  const paidAmount = ( 
    fullOrder?.payments || [] 
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
 
  /* 
   * Remaining 
   */ 
  const remainingAmount = Math.max( 
    total - paidAmount, 
    0 
  ); 
 
  const paymentAmount = Number( 
    amount || 0 
  ); 
 
  /* 
   * PAYMENT 
   */ 
  const handlePayment = async () => { 
    setError(""); 
 
    if (paymentAmount <= 0) { 
      setError( 
        "Enter a valid payment amount." 
      ); 
      return; 
    } 
 
    if ( 
      paymentAmount > remainingAmount 
    ) { 
      setError( 
        `Amount cannot exceed the remaining balance of ${remainingAmount.toFixed( 
          2 
        )} ETB.` 
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
 
      const response = await api( 
        `/pos/orders/${fullOrder.id || fullOrder.order_id}/payment`, 
        { 
          method: "POST", 
 
          body: JSON.stringify({ 
            amount: paymentAmount, 
            paymentMethod, 
            reference: 
              reference.trim() || null, 
          }), 
        } 
      ); 
 
      console.log( 
        "Payment successful:", 
        response 
      ); 
 
      /* 
       * Save amount for success message 
       */ 
      setSuccessfulAmount( 
        paymentAmount 
      ); 
 
      /* 
       * Show success popup 
       */ 
      setSuccess(true); 
 
      /* 
       * Wait a little so the cashier 
       * can see the success message. 
       */ 
      setTimeout(() => { 
 
        onPaymentSuccess( 
          response 
        ); 
 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"> 
 
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"> 
 
        {/* Header */} 
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5"> 
 
          <div> 
            <h2 className="text-xl font-bold text-gray-900"> 
              Payment 
            </h2> 
 
            <p className="mt-1 text-sm text-gray-500"> 
              Order #{fullOrder.order_number} 
 
              {fullOrder.table_number && 
                ` • Table ${fullOrder.table_number}`} 
            </p> 
          </div> 
 
          <button 
            onClick={onClose} 
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" 
          > 
            <X size={22} /> 
          </button> 
 
        </div> 
 
        {/* Body */} 
        <div className="space-y-6 p-6"> 
 
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
 
          {/* AMOUNT */} 
          <div> 
 
            <label className="mb-2 block text-sm font-medium text-gray-700"> 
              Payment Amount 
            </label> 
 
            <input 
              type="number" 
              min="0" 
              step="0.01" 
              value={amount} 
              onChange={(e) => 
                setAmount( 
                  e.target.value 
                ) 
              } 
              className="w-full rounded-xl border border-gray-300 px-4 py-4 text-2xl font-semibold outline-none focus:border-blue-500" 
            /> 
 
          </div> 
 
          {/* REFERENCE */} 
          {(paymentMethod === 
            "card" || 
            paymentMethod === 
              "mobile_money") && ( 
            <div> 
 
              <label className="mb-2 block text-sm font-medium text-gray-700"> 
                Transaction Reference 
              </label> 
 
              <input 
                type="text" 
                value={reference} 
                onChange={(e) => 
                  setReference( 
                    e.target.value 
                  ) 
                } 
                placeholder="Enter transaction reference" 
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500" 
              /> 
 
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
              remainingAmount <= 0 
            } 
            className="w-full rounded-xl bg-green-600 px-5 py-4 text-lg font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300" 
          > 
            {loading 
              ? "Processing Payment..." 
              : `Complete Payment ${paymentAmount.toFixed( 
                  2 
                )} ETB`} 
          </button> 
 
        </div> 
      </div> 
    </div> 
  ); 
} 
 
export default PaymentModal;