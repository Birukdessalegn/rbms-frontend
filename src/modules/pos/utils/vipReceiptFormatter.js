/**
 * VIP Receipt & Statement Formatter
 * Generates formatted text receipts and 1-click share links for WhatsApp and Telegram.
 */

export const cleanPhoneForWhatsApp = (phone = "") => {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");

  // Ethiopian local number format (e.g., 0911234567 or 0711234567 -> 251911234567)
  if (digits.startsWith("0") && digits.length === 10) {
    digits = "251" + digits.substring(1);
  } else if (digits.length === 9 && (digits.startsWith("9") || digits.startsWith("7"))) {
    digits = "251" + digits;
  }

  return digits;
};

export const formatVipReceiptText = ({
  restaurantName = "RESTAURANT & BAR",
  customerName = "VIP Customer",
  customerPhone = "",
  tier = "VIP",
  orderNumber = "",
  tableNumber = "",
  date = new Date(),
  items = [],
  chargedAmount = 0,
  creditLimit = 0,
  currentDebt = 0,
  remainingLimit = 0,
  isUnlimited = false,
}) => {
  const formattedDate = date instanceof Date 
    ? date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : String(date);

  const numCharge = Number(chargedAmount || 0);
  const numLimit = Number(creditLimit || 0);
  const numDebt = Number(currentDebt || 0);
  const numRemaining = Number(remainingLimit || 0);

  const limitDisplay = isUnlimited ? "Unlimited" : `${numLimit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
  const debtDisplay = `${numDebt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
  const remainingDisplay = isUnlimited ? "Unlimited" : `${numRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;

  // Itemized lines
  let itemsListText = "";
  if (Array.isArray(items) && items.length > 0) {
    itemsListText = items
      .map((it) => {
        const qty = Number(it.quantity || it.selectedQuantity || 1);
        const name = it.product_name || it.name || it.productName || "Item";
        const unitPrice = Number(it.unit_price || it.price || 0);
        const lineTotal = Number(it.total || unitPrice * qty);
        const notes = it.notes ? ` (${it.notes})` : "";
        return `• ${qty}x ${name}${notes} — ${lineTotal.toFixed(2)} ETB`;
      })
      .join("\n");
  } else {
    itemsListText = `• Order #${orderNumber} bill settlement — ${numCharge.toFixed(2)} ETB`;
  }

  return [
    `==============================`,
    `🍷 ${restaurantName.toUpperCase()}`,
    `VIP RECEIPT & STATEMENT`,
    `==============================`,
    `👤 Customer: ${customerName} (${tier})`,
    customerPhone ? `📱 Phone: ${customerPhone}` : null,
    `🧾 Order #: ${orderNumber || "N/A"}`,
    tableNumber ? `🪑 Table: ${tableNumber}` : null,
    `📅 Date: ${formattedDate}`,
    `------------------------------`,
    `ITEMS BILLED:`,
    itemsListText,
    `------------------------------`,
    `💰 Charge Amount: ${numCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`,
    ``,
    `💳 VIP CREDIT LIMIT STATEMENT:`,
    `• Credit Limit: ${limitDisplay}`,
    `• Total Used (Debt): ${debtDisplay}`,
    `• REMAINING LIMIT: ${remainingDisplay}`,
    `==============================`,
    `Thank you for your visit!`,
  ]
    .filter((line) => line !== null)
    .join("\n");
};

export const getWhatsAppReceiptUrl = (phone = "", receiptText = "") => {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(receiptText);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
};

export const getTelegramReceiptUrl = (receiptText = "") => {
  const encodedText = encodeURIComponent(receiptText);
  return `https://t.me/share/url?url=&text=${encodedText}`;
};

export const copyReceiptToClipboard = async (receiptText = "") => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(receiptText);
    return true;
  }
  // Fallback
  const textArea = document.createElement("textarea");
  textArea.value = receiptText;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const successful = document.execCommand("copy");
  document.body.removeChild(textArea);
  return successful;
};
