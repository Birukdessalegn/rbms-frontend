import { useState } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

function PaymentProofModal({ order, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!order) return null;

  const proofImage = (() => {
    if (!order) return null;

    const findFirstImage = (obj) => {
      if (!obj || typeof obj !== "object") return null;
      return (
        obj.receipt_image ||
        obj.receiptImage ||
        obj.receipt_url ||
        obj.receiptUrl ||
        obj.proof_image ||
        obj.proofImage ||
        obj.proof_url ||
        obj.proofUrl ||
        obj.image_url ||
        obj.imageUrl ||
        obj.image ||
        obj.payment_proof ||
        null
      );
    };

    let rawImage = findFirstImage(order);

    if (!rawImage && Array.isArray(order.payments)) {
      for (const p of order.payments) {
        const pImg = findFirstImage(p);
        if (pImg) {
          rawImage = pImg;
          break;
        }
      }
    }

    if (!rawImage) return null;
    if (typeof rawImage !== "string") return null;

    // Return data URLs or absolute HTTP URLs directly
    if (
      rawImage.startsWith("data:") ||
      rawImage.startsWith("http://") ||
      rawImage.startsWith("https://")
    ) {
      return rawImage;
    }

    // Prepend backend server origin for relative upload paths (e.g. /uploads/receipt.jpg)
    const backendBase =
      import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
      "http://localhost:5000";

    const cleanPath = rawImage.startsWith("/") ? rawImage : `/${rawImage}`;
    return `${backendBase}${cleanPath}`;
  })();

  const waiterName =
    order.waiter_name ||
    order.waiterName ||
    order.waiter?.name ||
    order.server_name ||
    order.user_name ||
    "Staff / Waiter";

  const paymentMethod = (
    order.payment_method ||
    order.paymentMethod ||
    "Mobile Banking"
  ).toUpperCase();

  let totalAmount = Number(
    order.total ||
    order.total_amount ||
    order.totalAmount ||
    order.paid_amount ||
    order.paidAmount ||
    order.amount ||
    0
  );

  // Fallback 1: Calculate sum from order items array if order.total property is 0
  if (totalAmount === 0 && Array.isArray(order.items) && order.items.length > 0) {
    totalAmount = order.items.reduce((sum, item) => {
      const qty = Number(item.quantity ?? item.qty ?? 1);
      const price = Number(
        item.unit_price ??
        item.unitPrice ??
        item.price ??
        item.product_price ??
        item.productPrice ??
        item.product?.price ??
        0
      );
      return sum + qty * price;
    }, 0);
  }

  // Fallback 2: Calculate sum from order.payments array if available
  if (totalAmount === 0 && Array.isArray(order.payments) && order.payments.length > 0) {
    totalAmount = order.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.75));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-slate-900 shadow-2xl border border-slate-800 text-white">
        {/* HEADER */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Payment Proof Cross-Check
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  Verified Image
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Order #{order.order_number || order.id} {order.table_number ? `• Table ${order.table_number}` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT GRID */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-3">
          {/* LEFT / IMAGE INSPECTION VIEWPORT */}
          <div className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden bg-slate-950 p-6 md:col-span-2">
            {/* Image Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-xl bg-slate-900/90 p-1.5 border border-slate-800 backdrop-blur-md shadow-lg">
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={handleRotate}
                title="Rotate"
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <RotateCw size={18} />
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                Reset
              </button>
            </div>

            {/* Display Image */}
            {proofImage ? (
              <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                <img
                  src={proofImage}
                  alt="Payment Proof Receipt"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease-out",
                  }}
                  className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-slate-500 mb-3 border border-slate-800">
                  <Smartphone className="h-8 w-8" />
                </div>
                <p className="text-sm font-semibold text-slate-300">
                  No Payment Image Attached
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  This transaction was submitted without a receipt photo attachment.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT / AUDIT DETAILS PANEL */}
          <div className="flex flex-col justify-between border-t border-slate-800 bg-slate-900/60 p-6 md:border-t-0 md:border-l">
            <div className="space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transaction Audit Info
              </h3>

              {/* Amount */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs font-medium text-slate-400 block">
                  Total Amount Paid
                </span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {totalAmount.toLocaleString()} ETB
                </span>
              </div>

              {/* Waiter Attribution */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-slate-800/80 p-3.5 border border-slate-750">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Accepted By (Waiter)
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {waiterName}
                    </p>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-center gap-3 rounded-xl bg-slate-800/80 p-3.5 border border-slate-750">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 font-bold border border-purple-500/30">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Payment Method
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {paymentMethod}
                    </p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center gap-3 rounded-xl bg-slate-800/80 p-3.5 border border-slate-750">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Transaction Date
                    </p>
                    <p className="text-xs font-medium text-slate-300 mt-0.5">
                      {order.created_at ? new Date(order.created_at).toLocaleString() : "Today"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION */}
            <div className="pt-6">
              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 active:scale-98 transition shadow-lg"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentProofModal;
