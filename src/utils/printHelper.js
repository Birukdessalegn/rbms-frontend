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
            margin: 10mm 12mm 12mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 8px;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.4;
          }
          /* Executive Financial Summary Grid */
          .grid {
            display: grid !important;
          }
          .grid-cols-2, .grid-cols-4, .sm\\:grid-cols-4 {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 10px !important;
            margin: 14px 0 !important;
          }
          .bg-slate-50 {
            background-color: #f8fafc !important;
          }
          .rounded-xl, .rounded-lg, .rounded-2xl {
            border-radius: 8px !important;
          }
          .border {
            border: 1px solid #cbd5e1 !important;
          }
          .border-slate-200, .border-slate-200\\/60 {
            border-color: #cbd5e1 !important;
          }
          .border-b {
            border-bottom: 1px solid #cbd5e1 !important;
          }
          .border-t-2 {
            border-top: 2px solid #0f172a !important;
          }
          .border-b-2 {
            border-bottom: 2px solid #0f172a !important;
          }
          .p-3 { padding: 8px 10px !important; }
          .p-4 { padding: 10px 12px !important; }
          .p-6 { padding: 14px !important; }
          .pb-5 { padding-bottom: 12px !important; }
          .pt-4 { padding-top: 12px !important; }
          .mt-10 { margin-top: 20px !important; }
          .mb-3 { margin-bottom: 8px !important; }
          .flex {
            display: flex !important;
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
          .uppercase {
            text-transform: uppercase !important;
          }
          .tracking-tight {
            letter-spacing: -0.025em !important;
          }
          .tracking-wider {
            letter-spacing: 0.05em !important;
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
          .text-xl {
            font-size: 15px !important;
          }
          .text-2xl {
            font-size: 18px !important;
          }
          .text-sm {
            font-size: 11px !important;
          }
          .text-xs {
            font-size: 10px !important;
          }
          .text-\\[10px\\] {
            font-size: 9px !important;
          }
          .text-slate-900, .text-slate-950 {
            color: #0f172a !important;
          }
          .text-slate-700, .text-slate-800 {
            color: #334155 !important;
          }
          .text-slate-500, .text-slate-400 {
            color: #64748b !important;
          }
          .text-emerald-600, .text-emerald-700, .text-emerald-800 {
            color: #047857 !important;
          }
          .text-purple-600, .text-purple-700, .text-purple-800 {
            color: #7e22ce !important;
          }
          .text-indigo-600, .text-indigo-700, .text-indigo-800 {
            color: #4338ca !important;
          }
          .text-red-600, .text-red-700 {
            color: #b91c1c !important;
          }
          .bg-emerald-50, .bg-emerald-100 {
            background-color: #dcfce7 !important;
          }
          .bg-purple-50, .bg-purple-100 {
            background-color: #f3e8ff !important;
          }
          .bg-amber-50, .bg-amber-100 {
            background-color: #fef3c7 !important;
          }
          .bg-red-50, .bg-red-100 {
            background-color: #fee2e2 !important;
          }
          .bg-white {
            background-color: #ffffff !important;
          }
          /* Tables & Financial Total Footers */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 10px !important;
            font-size: 10px !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
            text-align: left;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            font-size: 9px !important;
            color: #334155 !important;
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
            font-size: 11px !important;
            font-weight: 900 !important;
            color: #0f172a !important;
          }
          /* Badges */
          .badge, span[class*="rounded-full"] {
            display: inline-block !important;
            padding: 2px 6px !important;
            border-radius: 9999px !important;
            font-weight: 800 !important;
            font-size: 9px !important;
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
