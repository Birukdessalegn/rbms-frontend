import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Smartphone,
  CheckCircle,
} from "lucide-react";

function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================================
  // LOAD ORDER
  // ============================================================

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/orders/${orderId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load order"
          );
        }

        setOrder(data.order);

        // Set remaining amount as default payment amount
        const total = Number(data.order.total || 0);

        const paid = (data.order.payments || [])
          .filter((payment) => payment.status === "paid")
          .reduce(
            (sum, payment) => sum + Number(payment.amount),
            0
          );

        setAmount(Math.max(total - paid, 0).toFixed(2));
      } catch (err) {
        console.error("Load order error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // ============================================================
  // CALCULATE PAYMENT
  // ============================================================

  const total = Number(order?.total || 0);

  const paidAmount = (order?.payments || [])
    .filter((payment) => payment.status === "paid")
    .reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

  const remainingAmount = Math.max(
    total - paidAmount,
    0
  );

  const paymentAmount = Number(amount || 0);

  const change =
    paymentMethod === "cash"
      ? Math.max(paymentAmount - remainingAmount, 0)
      : 0;

  // ============================================================
  // MAKE PAYMENT
  // ============================================================

  const handlePayment = async () => {
    setError("");
    setSuccess("");

    if (paymentAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (paymentAmount > remainingAmount) {
      setError(
        `Payment cannot be greater than the remaining balance of ${remainingAmount.toFixed(
          2
        )}.`
      );
      return;
    }

    try {
      setPaying(true);

      const response = await fetch(
        `/api/orders/${orderId}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: paymentAmount,
            paymentMethod,
            reference: reference || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Payment failed"
        );
      }

      setSuccess("Payment recorded successfully.");

      // Reload the order so payment status is updated
      const orderResponse = await fetch(
        `/api/orders/${orderId}`
      );

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(
          orderData.message || "Failed to refresh order"
        );
      }

      setOrder(orderData.order);

      const newPaidAmount = (orderData.order.payments || [])
        .filter((payment) => payment.status === "paid")
        .reduce(
          (sum, payment) => sum + Number(payment.amount),
          0
        );

      const newRemaining = Math.max(
        Number(orderData.order.total) - newPaidAmount,
        0
      );

      setAmount(newRemaining.toFixed(2));

      // If fully paid, go back to POS
      if (orderData.order.payment_status === "paid") {
        setTimeout(() => {
          navigate("/pos");
        }, 1500);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">
          Loading payment...
        </p>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <p className="mb-4 text-red-500">
          {error || "Order not found"}
        </p>

        <button
          onClick={() => navigate("/pos")}
          className="rounded-lg bg-gray-900 px-5 py-2 text-white"
        >
          Back to POS
        </button>
      </div>
    );
  }

  // ============================================================
  // PAYMENT PAGE
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate("/pos")}
              className="mb-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft size={18} />
              Back to POS
            </button>

            <h1 className="text-3xl font-bold text-gray-900">
              Payment
            </h1>

            <p className="mt-1 text-gray-500">
              Order #{order.order_number}
              {order.table_number &&
                ` • Table ${order.table_number}`}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ==================================================
              ORDER SUMMARY
          ================================================== */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Order Summary
            </h2>

            <div className="space-y-4">
              {(order.items || []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b pb-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.product_name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {item.quantity} ×{" "}
                      {Number(item.unit_price).toFixed(2)}
                    </p>
                  </div>

                  <p className="font-medium">
                    {Number(item.total).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t pt-5">

              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>
                  {Number(order.subtotal).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span>
                  -{Number(order.discount || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>
                  {Number(order.tax || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between border-t pt-4 text-xl font-bold">
                <span>Total</span>
                <span>
                  {total.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-green-600">
                <span>Already Paid</span>
                <span>
                  {paidAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-2xl font-bold text-blue-600">
                <span>Remaining</span>
                <span>
                  {remainingAmount.toFixed(2)}
                </span>
              </div>

            </div>
          </div>

          {/* ==================================================
              PAYMENT
          ================================================== */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Make Payment
            </h2>

            {/* PAYMENT METHODS */}

            <label className="mb-3 block text-sm font-medium text-gray-700">
              Payment Method
            </label>

            <div className="grid grid-cols-3 gap-3">

              <button
                onClick={() => setPaymentMethod("cash")}
                className={`rounded-xl border p-4 transition ${
                  paymentMethod === "cash"
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Banknote
                  className="mx-auto mb-2"
                  size={25}
                />

                <span className="text-sm font-medium">
                  Cash
                </span>
              </button>

              <button
                onClick={() => setPaymentMethod("card")}
                className={`rounded-xl border p-4 transition ${
                  paymentMethod === "card"
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <CreditCard
                  className="mx-auto mb-2"
                  size={25}
                />

                <span className="text-sm font-medium">
                  Card
                </span>
              </button>

              <button
                onClick={() =>
                  setPaymentMethod("mobile_money")
                }
                className={`rounded-xl border p-4 transition ${
                  paymentMethod === "mobile_money"
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Smartphone
                  className="mx-auto mb-2"
                  size={25}
                />

                <span className="text-sm font-medium">
                  Mobile
                </span>
              </button>

            </div>

            {/* AMOUNT */}

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-4 text-2xl font-semibold outline-none focus:border-blue-500"
              />
            </div>

            {/* REFERENCE */}

            {(paymentMethod === "card" ||
              paymentMethod === "mobile_money") && (
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Reference
                </label>

                <input
                  type="text"
                  value={reference}
                  onChange={(e) =>
                    setReference(e.target.value)
                  }
                  placeholder="Transaction reference"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* CHANGE */}

            {paymentMethod === "cash" &&
              paymentAmount > remainingAmount && (
                <div className="mt-5 rounded-xl bg-green-50 p-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-green-700">
                      Change
                    </span>

                    <span className="text-xl font-bold text-green-700">
                      {change.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

            {/* ERROR */}

            {error && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {success && (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle size={20} />
                {success}
              </div>
            )}

            {/* PAY */}

            <button
              onClick={handlePayment}
              disabled={
                paying ||
                remainingAmount <= 0
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-4 text-lg font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {paying
                ? "Processing..."
                : remainingAmount <= 0
                ? "Fully Paid"
                : `Pay ${paymentAmount.toFixed(2)}`}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;