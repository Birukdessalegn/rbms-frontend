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
            margin: 10mm 10mm 12mm 10mm;
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
            font-size: 10px;
            line-height: 1.4;
          }

          /* Clean Document Header */
          .border-b-2 {
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 12px !important;
            margin-bottom: 16px !important;
          }

          /* 4-Card Clean Metric Grid (Exact Match to User Reference) */
          .grid, .grid-cols-4, .sm\:grid-cols-4, .md\:grid-cols-4, .grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
            margin: 12px 0 16px 0 !important;
          }
          @media (max-width: 650px) {
            .grid, .grid-cols-4, .sm\:grid-cols-4, .md\:grid-cols-4 {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }

          /* Metric Card Container */
          .metric-card, .card, .rounded-2xl.border, .rounded-xl.border {
            background-color: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            padding: 14px 16px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03) !important;
            page-break-inside: avoid !important;
          }

          /* Metric Card Typography */
          .card-title, p[class*="tracking-wider"] {
            font-size: 9.5px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            color: #64748b !important;
            margin: 0 0 6px 0 !important;
          }
          .card-value, span[class*="text-2xl"], p[class*="text-2xl"] {
            font-size: 20px !important;
            font-weight: 900 !important;
            color: #0f172a !important;
            line-height: 1.15 !important;
          }

          /* Side Metrics Bar fallback styled as modern 4-card grid */
          .side-metrics-bar {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 12px 0 16px 0 !important;
            border: none !important;
            background: transparent !important;
          }
          .side-metrics-bar > div, .side-metrics-bar .flex {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            padding: 12px 14px !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
          }
          .side-metrics-bar span:not([class*="text-"]):not([class*="font-"]) {
            display: none !important;
          }
          .side-metrics-bar span[class*="uppercase"] {
            font-size: 9px !important;
            font-weight: 700 !important;
            color: #64748b !important;
            margin-bottom: 4px !important;
            letter-spacing: 0.04em !important;
          }
          .side-metrics-bar strong {
            font-size: 16px !important;
            font-weight: 900 !important;
            color: #0f172a !important;
            line-height: 1.2 !important;
          }

          /* Clean Well-Spaced Data Table (Exact Match to User Reference) */
          .overflow-hidden.rounded-2xl.border, .table-container {
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            background: #ffffff !important;
            margin-top: 14px !important;
            margin-bottom: 16px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03) !important;
          }

          table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
            table-layout: auto !important;
            background: #ffffff !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }

          /* Table Header - Clean light background, generous padding, subtle bottom divider */
          th {
            background-color: #f8fafc !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            font-size: 9px !important;
            letter-spacing: 0.04em !important;
            color: #475569 !important;
            padding: 10px 14px !important;
            border: none !important;
            border-bottom: 1px solid #e2e8f0 !important;
            text-align: left !important;
            vertical-align: middle !important;
          }

          /* Data Rows - NO vertical grid lines, generous vertical padding, clean horizontal lines */
          td {
            border: none !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 10px 14px !important;
            vertical-align: middle !important;
            color: #1e293b !important;
            font-size: 10px !important;
            line-height: 1.4 !important;
          }
          tbody tr:nth-child(even) td {
            background-color: #fafbfc !important;
          }
          tbody tr:last-child td {
            border-bottom: none !important;
          }

          /* Table Footer Totals */
          tfoot tr {
            background-color: #f8fafc !important;
            font-weight: 800 !important;
            border-top: 2px solid #e2e8f0 !important;
          }
          tfoot td {
            font-size: 10.5px !important;
            font-weight: 900 !important;
            color: #0f172a !important;
            padding: 10px 14px !important;
            border: none !important;
            border-top: 2px solid #e2e8f0 !important;
          }

          /* Rounded Status Pills with circular dot (Matching Right Image) */
          .badge, span[class*="rounded-full"] {
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            padding: 3px 10px !important;
            border-radius: 9999px !important;
            font-weight: 700 !important;
            font-size: 9.5px !important;
            line-height: 1 !important;
          }

          /* Subtle Pill Badge Colors */
          .bg-emerald-50, .bg-emerald-100 {
            background-color: #ecfdf5 !important;
            color: #059669 !important;
          }
          .bg-blue-50, .bg-indigo-50, .bg-sky-50 {
            background-color: #eff6ff !important;
            color: #2563eb !important;
          }
          .bg-rose-50, .bg-red-50, .bg-red-100 {
            background-color: #fff1f2 !important;
            color: #e11d48 !important;
          }
          .bg-amber-50, .bg-yellow-50 {
            background-color: #fffbeb !important;
            color: #d97706 !important;
          }
          .bg-purple-50 {
            background-color: #faf5ff !important;
            color: #9333ea !important;
          }
          .bg-slate-50, .bg-slate-100 {
            background-color: #f1f5f9 !important;
            color: #475569 !important;
          }

          /* Hide interactive buttons on print */
          button, input, select, .print-hidden, .print-hide {
            display: none !important;
          }

          /* Utility spacing */
          .flex { display: flex !important; }
          .flex-wrap { flex-wrap: wrap !important; }
          .flex-col { flex-direction: column !important; }
          .items-center { align-items: center !important; }
          .justify-between { justify-content: space-between !important; }
          .text-right { text-align: right !important; }
          .text-center { text-align: center !important; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
          .font-bold { font-weight: 700 !important; }
          .font-black, .font-extrabold { font-weight: 800 !important; }
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

  const restaurantName = options.restaurantName || "BOOST ADDIS";
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

  let grossTotal = recordedTotal > 0 ? recordedTotal : Math.max(netSubtotal - discount, 0);
  let vatAmount = Number((grossTotal - (grossTotal / 1.15)).toFixed(2));
  let baseNet = Number((grossTotal / 1.15).toFixed(2));
  let serviceCharge = service;

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
          <span>Items Total (Menu Price):</span>
          <span>${(grossTotal + discount).toFixed(2)} ETB</span>
        </div>
        ${discount > 0 ? `
          <div class="flex-between" style="font-size: 10px; margin-bottom: 2px; color: #666;">
            <span>Discount:</span>
            <span>-${discount.toFixed(2)} ETB</span>
          </div>
        ` : ""}
        <div class="flex-between" style="font-size: 10px; margin-bottom: 2px; color: #555;">
          <span>Net Base (Excl. VAT):</span>
          <span>${baseNet.toFixed(2)} ETB</span>
        </div>
        <div class="flex-between font-bold" style="font-size: 10px; margin-bottom: 2px;">
          <span>15% VAT (Included in Price):</span>
          <span>${vatAmount.toFixed(2)} ETB</span>
        </div>
        ${serviceCharge > 0 ? `
          <div class="flex-between" style="font-size: 10px; margin-bottom: 2px;">
            <span>Service Charge:</span>
            <span>+${serviceCharge.toFixed(2)} ETB</span>
          </div>
        ` : ""}

        <div class="double-divider"></div>

        <div class="flex-between font-bold" style="font-size: 14px; margin: 4px 0;">
          <span>TOTAL (INCL. 15% VAT):</span>
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

/**
 * Official Payslip Printer
 */
export const printPayslip = (item, periodMonth) => {
  const title = `Official Payslip - ${item?.employee_code || "Staff"} (${periodMonth || ""})`;
  printReportArea("printable-payslip", title);
};


