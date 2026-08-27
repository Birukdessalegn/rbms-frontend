import { useState } from "react";
import { CreditCard, Banknote, Smartphone, CheckCircle } from "lucide-react";

function PaymentPanel({ order, onPaymentSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amount, setAmount] = useState(order?.total || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <p>Select an order to make a payment.</p>
      </div>
    );
  }

  const total = Number(order.total || 0);
  const paidAmount = Number(
    order.payments?.reduce(
      (sum, payment) =>
        payment.status === "paid"
          ? sum + Number(payment.amount)
          : sum,
      0
    ) || 0
  );

  const remainingAmount = Math.max(total - paidAmount, 0);

  const handlePayment = async () => {
    setError("");

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (paymentAmount > remainingAmount) {
      setError(
        `Payment cannot be greater than the remaining amount of ${remainingAmount.toFixed(
          2
        )}.`
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/orders/${order.id}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: paymentAmount,
            paymentMethod,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to process payment"
        );
      }

      if (onPaymentSuccess) {
        onPaymentSuccess(data);
      }

      setAmount(remainingAmount - paymentAmount);
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Payment
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Order #{order.order_number}
        </p>
      </div>

      {/* Amount Summary */}
      <div className="mb-6 rounded-xl bg-gray-50 p-5">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Order Total</span>
          <span>{total.toFixed(2)}</span>
        </div>

        <div className="mt-2 flex justify-between text-sm text-gray-500">
          <span>Already Paid</span>
          <span>{paidAmount.toFixed(2)}</span>
        </div>

        <div className="mt-4 flex justify-between border-t pt-4">
          <span className="font-semibold text-gray-900">
            Remaining
          </span>

          <span className="text-xl font-bold text-gray-900">
            {remainingAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment Amount */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Payment Amount
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Payment Methods */}
      <div className="mb-6">
        <label className="mb-3 block text-sm font-medium text-gray-700">
          Payment Method
        </label>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("cash")}
            className={`rounded-xl border p-4 transition ${
              paymentMethod === "cash"
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Banknote className="mx-auto mb-2" size={24} />
            <span className="text-sm font-medium">
              Cash
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("card")}
            className={`rounded-xl border p-4 transition ${
              paymentMethod === "card"
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <CreditCard className="mx-auto mb-2" size={24} />
            <span className="text-sm font-medium">
              Card
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("mobile_money")}
            className={`rounded-xl border p-4 transition ${
              paymentMethod === "mobile_money"
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Smartphone className="mx-auto mb-2" size={24} />
            <span className="text-sm font-medium">
              Mobile
            </span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Pay Button */}
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading || remainingAmount <= 0}
        className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-4 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {loading ? (
          "Processing..."
        ) : remainingAmount <= 0 ? (
          <>
            <CheckCircle size={20} />
            Fully Paid
          </>
        ) : (
          `Pay ${Number(amount || 0).toFixed(2)}`
        )}
      </button>
    </div>
  );
}

export default PaymentPanel;