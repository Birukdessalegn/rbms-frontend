/**
 * 100% Reliable Cross-Browser Print Helper
 * Opens a clean isolated print document to bypass single-page layout wrappers.
 */
export const printReportArea = (elementId, title = "Official Sales & Shift Report") => {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Inter, system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 24px;
            color: #0f172a;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header-title { text-transform: uppercase; font-size: 20px; font-weight: 900; margin: 0; }
          .header-subtitle { text-transform: uppercase; font-size: 11px; font-weight: 700; color: #475569; margin-top: 4px; }
          .meta-text { font-size: 12px; font-weight: 600; color: #334155; }
          .border-b-2 { border-bottom: 2px solid #0f172a; }
          .border-t-2 { border-top: 2px solid #0f172a; }
          .mb-6 { margin-bottom: 24px; }
          .mt-6 { margin-top: 24px; }
          .pb-4 { padding-bottom: 16px; }
          .pt-4 { padding-top: 16px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .text-right { text-align: right; }
          .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
          .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; background: #ffffff; }
          .card-title { font-size: 12px; font-weight: 600; color: #64748b; margin: 0; }
          .card-value { font-size: 22px; font-weight: 900; color: #0f172a; margin: 8px 0 0 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: 800; text-transform: uppercase; font-size: 11px; color: #334155; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; }
          .badge-paid { background: #dcfce7; color: #166534; }
          .badge-pending { background: #fef3c7; color: #92400e; }
          button, input, select, .print-hide { display: none !important; }
        </style>
      </head>
      <body>
        <div className="print-content">
          ${element.innerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 250);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
