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
  iframe.style.width = "1024px";
  iframe.style.height = "768px";
  iframe.style.border = "0";
  iframe.style.opacity = "0.01";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-9999";
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
            color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            background: #ffffff !important;
            font-size: 10px;
            line-height: 1.4;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Clean Executive Document Header */
          .border-b-2 {
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 10px !important;
            margin-bottom: 12px !important;
          }

          /* Requirement 2: 2x2 Compact Metric KPI Grid layout to save vertical space */
          .kpi-grid-2x2,
          .report-metric-grid,
          .grid.gap-4,
          div[class*="grid-cols-4"],
          div[class*="lg:grid-cols-4"],
          div[class*="grid-cols-2"],
          div[class*="gap-3.5"] {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px 12px !important;
            width: 100% !important;
            margin: 8px 0 12px 0 !important;
          }

          /* Metric Card Container: Compact, clean, exact print colors */
          .metric-card,
          .card,
          .kpi-grid-2x2 > div,
          .grid.gap-4 > div,
          div[class*="grid-cols-4"] > div,
          div[class*="gap-3.5"] > div,
          div[class*="rounded-2xl"][class*="border"] {
            background-color: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            padding: 8px 12px !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Card Headings & Values */
          .card-title,
          span[class*="uppercase tracking-wider"],
          p[class*="uppercase tracking-wider"] {
            font-size: 8.5px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            color: #64748b !important;
            margin: 0 0 2px 0 !important;
          }
          .card-value,
          p[class*="text-2xl"],
          span[class*="text-2xl"],
          p[class*="text-xl"],
          span[class*="text-xl"] {
            font-size: 16px !important;
            font-weight: 900 !important;
            color: #0f172a !important;
            line-height: 1.15 !important;
            margin: 2px 0 !important;
          }

          /* Requirement 1: Fix Table Sourcing & Squishing: width 100% !important, proper padding, no crushing */
          .overflow-hidden.rounded-2xl.border,
          .table-container,
          div[class*="overflow-x-auto"],
          div[class*="rounded-2xl border"] {
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            overflow: visible !important;
            background: #ffffff !important;
            margin-top: 10px !important;
            margin-bottom: 12px !important;
            width: 100% !important;
            page-break-inside: auto !important;
            box-shadow: none !important;
          }

          table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            font-size: 9.5px !important;
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

          /* Table Header: Clean soft background, generous padding, border-bottom */
          th {
            background-color: #f8fafc !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            font-size: 8.5px !important;
            letter-spacing: 0.04em !important;
            color: #475569 !important;
            padding: 8px 12px !important;
            border: none !important;
            border-bottom: 1px solid #cbd5e1 !important;
            text-align: left !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Data Rows: Generous padding, clean horizontal borders, NO harsh vertical lines */
          td {
            border: none !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 8px 12px !important;
            vertical-align: middle !important;
            color: #1e293b !important;
            font-size: 9.5px !important;
            line-height: 1.35 !important;
          }
          tbody tr:nth-child(even) td {
            background-color: #fafbfc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          tbody tr:last-child td {
            border-bottom: none !important;
          }

          /* Table Footer Totals */
          tfoot tr {
            background-color: #f8fafc !important;
            font-weight: 800 !important;
            border-top: 2px solid #94a3b8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          tfoot td {
            font-size: 10px !important;
            font-weight: 900 !important;
            color: #0f172a !important;
            padding: 9px 12px !important;
            border: none !important;
            border-top: 2px solid #94a3b8 !important;
          }

          /* Requirement 3: Rounded Status Pills with exact print colors */
          .badge, span[class*="rounded-full"], span[class*="badge"] {
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            padding: 2px 7px !important;
            border-radius: 9999px !important;
            font-weight: 700 !important;
            font-size: 8.5px !important;
            line-height: 1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

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

          /* Requirement 4: Financial Summary & Clean Spacing for Signatures (No Overlapping) */
          .print-summary-box,
          div[class*="print-summary-box"] {
            border: 1.5px solid #0f172a !important;
            border-radius: 8px !important;
            padding: 10px 14px !important;
            margin-top: 14px !important;
            background-color: #f8fafc !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .sign-off-section,
          div[class*="grid-cols-3"],
          .grid-cols-3 {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            gap: 20px !important;
            width: 100% !important;
            margin-top: 20px !important;
            padding-top: 12px !important;
            border-top: 2px solid #0f172a !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .sign-off-section > div,
          div[class*="grid-cols-3"] > div,
          .grid-cols-3 > div {
            flex: 1 1 0px !important;
            width: 33.333% !important;
          }

          /* Hide UI interactive buttons & pagination on print */
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


