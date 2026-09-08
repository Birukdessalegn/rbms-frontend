import { parseItemPortion } from "./drinkServingHelper";

/**
 * 100% Reliable Cross-Browser Print Helper
 * Uses an isolated printing iframe to guarantee the document never closes prematurely,
 * eliminates blank pages, avoids popup blockers, and styles all tables and executive summary cards.
 */
export const printReportArea = (elementId, title = "Official Sales & Shift Report") => {
  const element =
    document.getElementById(elementId) ||
    document.getElementById("printable-report") ||
    document.getElementById("bar-reports-printable-area") ||
    document.getElementById("kitchen-reports-printable-area");

  if (!element) {
    window.print();
    return;
  }

  // Remove any previously created print iframe
  const oldIframe = document.getElementById("rbms-print-frame");
  if (oldIframe) {
    oldIframe.remove();
  }

  // Create isolated invisible iframe
  const iframe = document.createElement("iframe");
  iframe.id = "rbms-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 10mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            background: #ffffff;
            font-size: 9.5px;
            line-height: 1.35;
          }
          /* Executive Financial Summary Grid */
          .grid {
            display: grid !important;
          }
          .grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .grid-cols-4, .sm\\:grid-cols-4, .md\\:grid-cols-4 {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
            margin: 8px 0 !important;
          }
          .bg-slate-50, .bg-slate-50\\/50 {
            background-color: #f8fafc !important;
          }
          .rounded-xl, .rounded-lg, .rounded-2xl {
            border-radius: 4px !important;
          }
          .border {
            border: 1px solid #94a3b8 !important;
          }
          .border-2 {
            border: 1.5px solid #0f172a !important;
          }
          .border-slate-200, .border-slate-200\\/60, .border-slate-300 {
            border-color: #94a3b8 !important;
          }
          .border-b {
            border-bottom: 1px solid #94a3b8 !important;
          }
          .border-t {
            border-top: 1px solid #94a3b8 !important;
          }
          .border-t-2 {
            border-top: 2px solid #0f172a !important;
          }
          .border-b-2 {
            border-bottom: 2px solid #0f172a !important;
          }
          .p-2 { padding: 4px 6px !important; }
          .p-2\\.5 { padding: 6px 8px !important; }
          .p-3 { padding: 6px 8px !important; }
          .p-4 { padding: 8px 10px !important; }
          .p-5, .p-6 { padding: 10px !important; }
          .pb-2 { padding-bottom: 4px !important; }
          .pb-3 { padding-bottom: 6px !important; }
          .pb-4 { padding-bottom: 8px !important; }
          .pb-5 { padding-bottom: 10px !important; }
          .pt-1 { padding-top: 2px !important; }
          .pt-2 { padding-top: 4px !important; }
          .pt-3 { padding-top: 6px !important; }
          .pt-4 { padding-top: 8px !important; }
          .mt-1 { margin-top: 2px !important; }
          .mt-2 { margin-top: 4px !important; }
          .mt-3 { margin-top: 6px !important; }
          .mt-4 { margin-top: 8px !important; }
          .mt-6 { margin-top: 12px !important; }
          .mt-8 { margin-top: 16px !important; }
          .mt-10 { margin-top: 18px !important; }
          .mb-2 { margin-bottom: 4px !important; }
          .mb-3 { margin-bottom: 6px !important; }
          .mb-4 { margin-bottom: 8px !important; }
          .mb-6 { margin-bottom: 12px !important; }
          .flex {
            display: flex !important;
          }
          .flex-wrap {
            flex-wrap: wrap !important;
          }
          .flex-col {
            flex-direction: column !important;
          }
          .flex-row {
            flex-direction: row !important;
          }
          .side-metrics-bar {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            padding: 6px 0 !important;
            margin: 6px 0 10px 0 !important;
            border-top: 1.5px solid #0f172a !important;
            border-bottom: 1.5px solid #0f172a !important;
            border-left: none !important;
            border-right: none !important;
            background: transparent !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .side-metrics-bar > div, .side-metrics-bar .flex {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
          }
          .border-y {
            border-top: 1px solid #94a3b8 !important;
            border-bottom: 1px solid #94a3b8 !important;
          }
          .gap-1 { gap: 4px !important; }
          .gap-1\\.5 { gap: 6px !important; }
          .gap-2 { gap: 8px !important; }
          .gap-3 { gap: 12px !important; }
          .gap-4 { gap: 16px !important; }
          .gap-x-2 { column-gap: 8px !important; }
          .gap-x-3 { column-gap: 12px !important; }
          .gap-x-4 { column-gap: 16px !important; }
          .gap-y-1 { row-gap: 4px !important; }
          .gap-y-1\\.5 { row-gap: 6px !important; }
          .gap-y-2 { row-gap: 8px !important; }
          .w-full { width: 100% !important; }
          .items-start {
            align-items: flex-start !important;
          }
          .items-center {
            align-items: center !important;
          }
          .justify-between {
            justify-content: space-between !important;
          }
          .text-right {
            text-align: right !important;
          }
          .text-center {
            text-align: center !important;
          }
          .whitespace-nowrap {
            white-space: nowrap !important;
          }
          .uppercase {
            text-transform: uppercase !important;
          }
          .tracking-tight {
            letter-spacing: -0.025em !important;
          }
          .tracking-wider {
            letter-spacing: 0.04em !important;
          }
          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          }
          .font-black {
            font-weight: 900 !important;
          }
          .font-bold, .font-extrabold {
            font-weight: 800 !important;
          }
          .font-semibold {
            font-weight: 600 !important;
          }
          .text-2xl {
            font-size: 16px !important;
          }
          .text-xl {
            font-size: 14px !important;
          }
          .text-lg {
            font-size: 13px !important;
          }
          .text-base {
            font-size: 11px !important;
          }
          .text-sm {
            font-size: 10px !important;
          }
          .text-xs {
            font-size: 9px !important;
          }
          .text-\\[11px\\] {
            font-size: 9px !important;
          }
          .text-\\[10px\\] {
            font-size: 8.5px !important;
          }
          .text-\\[9\\.5px\\] {
            font-size: 8px !important;
          }
          .text-slate-900, .text-slate-950 {
            color: #0f172a !important;
          }
          .text-slate-700, .text-slate-800 {
            color: #1e293b !important;
          }
          .text-slate-600, .text-slate-500, .text-slate-400 {
            color: #475569 !important;
          }
          .text-emerald-700, .text-emerald-800, .text-emerald-900 {
            color: #065f46 !important;
          }
          .text-blue-700, .text-blue-800 {
            color: #1d4ed8 !important;
          }
          .text-purple-700, .text-purple-800 {
            color: #6b21a8 !important;
          }
          .text-rose-700, .text-red-700 {
            color: #9f1239 !important;
          }
          .text-amber-700, .text-amber-800 {
            color: #92400e !important;
          }
          .bg-emerald-50, .bg-emerald-100 {
            background-color: #ecfdf5 !important;
          }
          .bg-blue-50, .bg-indigo-50 {
            background-color: #eff6ff !important;
          }
          .bg-purple-50 {
            background-color: #faf5ff !important;
          }
          .bg-amber-50 {
            background-color: #fffbeb !important;
          }
          .bg-slate-100 {
            background-color: #f1f5f9 !important;
          }
          .bg-white {
            background-color: #ffffff !important;
          }
          /* Strict A4 Tables without right-edge overflow */
          table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 6px !important;
            font-size: 8.5px !important;
            table-layout: auto !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          th, td {
            border: 1px solid #64748b !important;
            padding: 3.5px 5px !important;
            vertical-align: top !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            font-size: 8px !important;
            color: #0f172a !important;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafc !important;
          }
          tfoot tr {
            background-color: #f1f5f9 !important;
            font-weight: 900 !important;
            border-top: 2px solid #0f172a !important;
          }
          tfoot td {
            font-size: 9.5px !important;
            font-weight: 900 !important;
            color: #0f172a !important;
          }
          /* Badges */
          .badge, span[class*="rounded-full"], span[class*="rounded-md"], span[class*="rounded-lg"] {
            display: inline-block !important;
            padding: 1px 4px !important;
            border-radius: 3px !important;
            font-weight: 700 !important;
            font-size: 8px !important;
          }
          /* Prevent summary & footer from cutting mid-page */
          .print-summary-box, .print-footer-box, .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Hide interactive UI */
          button, input, select, .print-hidden, .print-hide {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Print safely after DOM renders without calling close() prematurely
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 350);
};

/**
 * 100% Reliable Thermal-Style Customer & Split Share Receipt Printer (80mm standard POS)
 */
export const printThermalReceipt = ({
  restaurantName = "RESTAURANT & BAR",
  title = "CUSTOMER RECEIPT",
  orderNumber,
  tableNumber,
  serverName,
  customerName,
  paymentMethod,
  items = [],
  totalPaid,
  remainingBalance,
  reference,
  date = new Date(),
}) => {
  const oldIframe = document.getElementById("rbms-thermal-print-frame");
  if (oldIframe) oldIframe.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "rbms-thermal-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - #${orderNumber || "POS"}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace, system-ui;
            width: 76mm;
            margin: 0 auto;
            padding: 8px 4px;
            color: #000;
            font-size: 11px;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div style="font-size: 15px; font-weight: 900; text-transform: uppercase;">${restaurantName}</div>
          <div style="font-size: 10px; font-weight: bold; margin-top: 2px;">*** ${title} ***</div>
          <div style="font-size: 10px; margin-top: 3px;">Order #${orderNumber} ${tableNumber ? '• Table ' + tableNumber : ''}</div>
          <div style="font-size: 9px; color: #444;">${new Date(date).toLocaleString()}</div>
          ${customerName ? `<div style="font-size: 10px; font-weight: bold; margin-top: 2px;">Customer: ${customerName}</div>` : ''}
          ${serverName ? `<div style="font-size: 9px; color: #444;">Server: ${serverName}</div>` : ''}
        </div>

        <div class="divider"></div>

        ${items && items.length > 0 ? `
          <div style="font-size: 9px; font-weight: bold; margin-bottom: 4px;" class="flex-between">
            <span>QTY  ITEM</span>
            <span>TOTAL</span>
          </div>
          ${items.map(it => {
            const portion = parseItemPortion(it);
            const lineTotal = Number(it.selectedTotal || it.total || ((it.selectedQuantity || it.quantity || 1) * (it.unit_price || it.price || 0))).toFixed(2);
            return `
              <div class="item-row">
                <span style="max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <b>${portion.displayServing}</b> ${it.name || it.product_name || 'Item'}
                </span>
                <span>${lineTotal}</span>
              </div>
            `;
          }).join('')}
          <div class="divider"></div>
        ` : ''}

        <div class="flex-between font-bold" style="font-size: 13px; margin: 5px 0;">
          <span>PAID AMOUNT:</span>
          <span>${Number(totalPaid || 0).toFixed(2)} ETB</span>
        </div>
        <div class="flex-between" style="font-size: 10px;">
          <span>Payment Method:</span>
          <span style="text-transform: uppercase; font-weight: bold;">${paymentMethod || 'CASH'}</span>
        </div>
        ${reference ? `
          <div class="flex-between" style="font-size: 9px; color: #444;">
            <span>Reference:</span>
            <span>${reference}</span>
          </div>
        ` : ''}

        ${remainingBalance !== undefined && remainingBalance !== null ? `
          <div class="divider"></div>
          <div class="flex-between font-bold" style="font-size: 11px;">
            <span>REMAINING TABLE TAB:</span>
            <span>${Number(remainingBalance).toFixed(2)} ETB</span>
          </div>
        ` : ''}

        <div class="double-divider"></div>
        <div class="text-center" style="font-size: 9px; margin-top: 6px;">
          Thank you! Please come again.
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 300);
};

/**
 * 100% Reliable Official Order Receipt & Guest Check Printer (80mm POS & Standard)
 */
export const printOrderReceipt = (order, options = {}) => {
  if (!order) return;

  const oldIframe = document.getElementById("rbms-order-print-frame");
  if (oldIframe) oldIframe.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "rbms-order-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const restaurantName = options.restaurantName || "THE OAK CLUB";
  const restaurantSub = options.restaurantSub || "RESTAURANT & BAR";
  const orderNum = order.order_number || `#${order.id || "POS"}`;
  const tableNum = String(order.table_number || order.table_id || "1").replace(/^T/i, "T");
  const waiterName = [
    order.waiter_first_name,
    order.waiter_last_name
  ].filter(Boolean).join(" ") || order.waiter_name || order.waiterName || options.waiterName || "Staff Waiter";

  const customerName = order.customer_name || order.customerName || order.vip_name || order.vip_customer_name || "";
  const items = Array.isArray(order.items) ? order.items : [];

  const netSubtotal = items.reduce((sum, i) => {
    const q = Number(i.quantity ?? i.qty ?? 1);
    const p = Number(i.unit_price ?? i.price ?? i.product_price ?? 0);
    return sum + q * p;
  }, 0);

  const recordedTotal = Number(
    order.total_amount ??
    order.total ??
    order.grand_total ??
    order.grandTotal ??
    0
  );

  const tax = Number(order.tax ?? order.tax_amount ?? 0);
  const service = Number(order.service_charge ?? order.service_charge_amount ?? 0);
  const discount = Number(order.discount ?? order.discount_amount ?? 0);

  let vatAmount = tax;
  let serviceCharge = service;
  let grossTotal = recordedTotal;

  if (grossTotal <= 0) {
    vatAmount = tax > 0 ? tax : Number((netSubtotal * 0.15).toFixed(2));
    grossTotal = Math.max(netSubtotal - discount + vatAmount + serviceCharge, 0);
  } else if (vatAmount <= 0) {
    vatAmount = Number((netSubtotal * 0.15).toFixed(2));
  }

  const pStatus = String(order.payment_status || "unpaid").toUpperCase();
  const pMethod = String(order.payment_method || order.paymentMethod || "CASH").toUpperCase();
  const dateStr = order.created_at ? new Date(order.created_at).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) : new Date().toLocaleString();

  const title = options.title || (
    pStatus === "PAID"
      ? "OFFICIAL SALES RECEIPT"
      : pStatus.includes("CREDIT")
      ? "VIP CREDIT TICKET"
      : "GUEST CHECK / BILL"
  );

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${orderNum}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace, system-ui, sans-serif;
            width: 76mm;
            margin: 0 auto;
            padding: 8px 4px;
            color: #000;
            font-size: 11px;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .flex-between { display: flex; justify-content: space-between; align-items: baseline; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; }
          .item-name { max-width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div style="font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${restaurantName}</div>
          <div style="font-size: 9px; color: #333; text-transform: uppercase; margin-top: 1px;">${restaurantSub}</div>
          <div style="font-size: 10px; font-weight: 900; margin: 4px 0 2px 0;">*** ${title} ***</div>
          <div style="font-size: 11px; font-weight: bold;">Order: ${orderNum} • Table #${tableNum}</div>
          <div style="font-size: 9px; color: #444; margin-top: 1px;">${dateStr}</div>
          ${waiterName ? `<div style="font-size: 9px; margin-top: 1px;">Server: <b>${waiterName}</b></div>` : ""}
          ${customerName ? `<div style="font-size: 9px; font-weight: bold; margin-top: 1px;">Customer: ${customerName}</div>` : ""}
        </div>

        <div class="divider"></div>

        <div style="font-size: 9px; font-weight: bold; margin-bottom: 4px;" class="flex-between">
          <span>QTY  ITEM</span>
          <span>AMOUNT</span>
        </div>

        ${items.length > 0 ? items.map(it => {
          const q = Number(it.quantity ?? it.qty ?? 1);
          const p = Number(it.unit_price ?? it.price ?? 0);
          const lineTotal = Number(it.total ?? (q * p));
          const name = it.name || it.product_name || "Item";
          const portion = parseItemPortion(it);
          return `
            <div class="item-row">
              <div class="item-name">
                <span><b>${portion.displayServing}</b> ${name}</span>
                ${p > 0 ? `<span style="font-size: 8px; color: #555;"> (@${p.toFixed(2)})</span>` : ""}
              </div>
              <span class="font-bold">${lineTotal.toFixed(2)}</span>
            </div>
          `;
        }).join("") : `
          <div style="font-size: 10px; text-align: center; color: #555; padding: 4px 0;">
            1x Order Items
          </div>
        `}

        <div class="divider"></div>

        <div class="flex-between" style="font-size: 10px; margin-bottom: 2px;">
          <span>Subtotal (Excl. VAT):</span>
          <span>${netSubtotal.toFixed(2)} ETB</span>
        </div>
        <div class="flex-between font-bold" style="font-size: 10px; margin-bottom: 2px;">
          <span>VAT (15%):</span>
          <span>+${vatAmount.toFixed(2)} ETB</span>
        </div>
        ${serviceCharge > 0 ? `
          <div class="flex-between" style="font-size: 10px; margin-bottom: 2px;">
            <span>Service Charge:</span>
            <span>+${serviceCharge.toFixed(2)} ETB</span>
          </div>
        ` : ""}
        ${discount > 0 ? `
          <div class="flex-between" style="font-size: 10px; margin-bottom: 2px; color: #666;">
            <span>Discount:</span>
            <span>-${discount.toFixed(2)} ETB</span>
          </div>
        ` : ""}

        <div class="double-divider"></div>

        <div class="flex-between font-bold" style="font-size: 14px; margin: 4px 0;">
          <span>TOTAL (INCL. VAT):</span>
          <span>${grossTotal.toFixed(2)} ETB</span>
        </div>

        <div class="double-divider"></div>

        <div class="flex-between" style="font-size: 10px; margin-bottom: 2px;">
          <span>Payment Status:</span>
          <span style="font-weight: 900;">${pStatus}</span>
        </div>
        <div class="flex-between" style="font-size: 10px; margin-bottom: 2px;">
          <span>Payment Method:</span>
          <span style="font-weight: bold;">${pMethod}</span>
        </div>
        ${order.reference ? `
          <div class="flex-between" style="font-size: 9px; color: #444; margin-bottom: 2px;">
            <span>Reference:</span>
            <span>${order.reference}</span>
          </div>
        ` : ""}

        <div class="divider"></div>

        <div class="text-center" style="font-size: 9px; margin-top: 6px; color: #222;">
          <div>Thank you for dining with us!</div>
          <div style="font-size: 8px; color: #666; margin-top: 2px;">Please retain this receipt.</div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 300);
};

