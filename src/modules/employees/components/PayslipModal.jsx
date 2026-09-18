import { X, Printer, Building2, ShieldCheck, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { printPayslip } from "../../../utils/printHelper";

function PayslipModal({ isOpen, onClose, item, periodMonth }) {
  if (!isOpen || !item) return null;

  const handlePrint = () => {
    printPayslip(item, periodMonth);
  };

  const fmt = (num) =>
    Number(num || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const baseSalary = Number(item.base_salary || 0);
  const allowances = Number(item.allowances || 0);
  const overtime = Number(item.overtime || 0);
  const bonuses = Number(item.bonuses || 0);
  const grossSalary = Number(item.gross_salary || baseSalary + allowances + overtime + bonuses);

  const absenceDed = Number(item.absence_deduction || 0);
  const pensionEmployee = Number(item.pension_employee || 0);
  const incomeTax = Number(item.income_tax || 0);
  const otherDed = Number(item.other_deductions || 0);
  const totalDed = Number(item.total_deductions || item.deductions || absenceDed + pensionEmployee + incomeTax + otherDed);
  const netSalary = Number(item.net_salary || grossSalary - totalDed);
  const pensionEmployer = Number(item.pension_employer || 0);

  const refCode = `PS-${(item.employee_code || "EMP").replace(/[^a-zA-Z0-9]/g, "")}-${(periodMonth || "").replace("-", "")}`;
  const issueDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-6 backdrop-blur-xs flex justify-center items-start sm:items-center">
      <div className="relative w-full max-w-2xl my-4 sm:my-auto max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Action Bar (Sticky Top) */}
        <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 border border-amber-200">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Official Salary Payslip</h2>
              <p className="text-[11px] text-slate-500 font-medium">Reference: {refCode}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer active:scale-95"
            >
              <Printer className="h-3.5 w-3.5 text-amber-400" />
              Print Payslip
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Canvas */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-slate-50/50">
          <div
            id="printable-payslip"
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6"
          >
            {/* Header: Hotel Branding & Document Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b-2 border-slate-900 pb-5 gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide leading-tight">
                  THE OAK CLUB
                </h1>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                  Club &amp; Lounge • Human Resources &amp; Payroll
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md w-fit">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Official Certified Document
                </div>
              </div>

              <div className="sm:text-right">
                <span className="inline-block rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800 border border-slate-200">
                  Pay Period: {periodMonth || "Current"}
                </span>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Issue Date: {issueDate}</p>
              </div>
            </div>

            {/* Employee Information Grid */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3.5 gap-x-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee Name</span>
                  <p className="font-extrabold text-slate-900 mt-0.5 text-sm">
                    {item.first_name} {item.last_name}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee ID</span>
                  <p className="font-mono font-bold text-slate-800 mt-0.5 text-sm">{item.employee_code || "N/A"}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{item.department_name || "General Staff"}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Designation</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{item.position_title || "Staff Member"}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Mode</span>
                  <p className="font-semibold text-slate-700 capitalize mt-0.5">
                    {item.payment_method ? item.payment_method.replace("_", " ") : "Bank Transfer"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance &amp; Leave Log</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    <span className="text-emerald-700 font-bold">{item.days_worked || 0} Worked</span>
                    {" / "}
                    <span className={Number(item.days_absent) > 0 ? "text-rose-600 font-bold" : "text-slate-500"}>
                      {item.days_absent || 0} Absent
                    </span>
                    {Number(item.paid_leave_days) > 0 && (
                      <span className="text-blue-600 font-bold block text-[10px]">
                        • {item.paid_leave_days}d Approved Paid Leave (0 ETB ded.)
                      </span>
                    )}
                    {Number(item.unpaid_leave_days) > 0 && (
                      <span className="text-amber-700 font-bold block text-[10px]">
                        • {item.unpaid_leave_days}d Unpaid Leave Deducted
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shift / Work Hours</span>
                  <p className="font-semibold text-slate-700 mt-0.5">
                    {item.shift_start_time && item.shift_end_time
                      ? `${String(item.shift_start_time).slice(0, 5)} - ${String(item.shift_end_time).slice(0, 5)}`
                      : "18:00 - 07:00"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hire Date</span>
                  <p className="font-semibold text-slate-700 mt-0.5">
                    {item.hire_date
                      ? new Date(item.hire_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : "Official Staff"}
                    {item.is_prorated && (
                      <span className="ml-1 text-[10px] font-bold text-blue-700">({item.active_days}d prorated)</span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Status</span>
                  <p className="font-bold text-emerald-700 mt-0.5 capitalize flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {item.payment_status || "Approved"}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Breakdown Table: Earnings & Deductions */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="px-4 py-2.5 w-1/3">Earnings &amp; Allowances</th>
                    <th className="px-4 py-2.5 text-right w-1/6">Amount</th>
                    <th className="px-4 py-2.5 w-1/3 border-l border-slate-700">Deductions &amp; Taxes</th>
                    <th className="px-4 py-2.5 text-right w-1/6">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="px-4 py-2 font-medium">Basic Monthly Salary</td>
                    <td className="px-4 py-2 text-right font-bold text-slate-900">{fmt(baseSalary)}</td>
                    <td className="px-4 py-2 font-medium border-l border-slate-100">
                      Absence &amp; Unpaid Leave Deductions
                      {absenceDed > 0 && (
                        <span className="text-[10px] text-slate-400 block">
                          ({item.days_absent || 0} absent
                          {Number(item.unpaid_leave_days) > 0 ? ` + ${item.unpaid_leave_days} unpaid leave` : ""})
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${absenceDed > 0 ? "text-rose-600" : ""}`}>
                      {fmt(absenceDed)}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2 font-medium">Duty &amp; Position Allowances</td>
                    <td className="px-4 py-2 text-right">{fmt(allowances)}</td>
                    <td className="px-4 py-2 font-medium border-l border-slate-100">
                      Pension Contribution (Employee 7%)
                      <span className="text-[10px] text-slate-400 block">Statutory Pension Proclamation</span>
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${pensionEmployee > 0 ? "text-rose-600" : ""}`}>
                      {fmt(pensionEmployee)}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2 font-medium">Overtime Compensation</td>
                    <td className="px-4 py-2 text-right">{fmt(overtime)}</td>
                    <td className="px-4 py-2 font-medium border-l border-slate-100">
                      Employment Income Tax
                      <span className="text-[10px] text-slate-400 block">Proclamation No. 979/2016</span>
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${incomeTax > 0 ? "text-rose-600" : ""}`}>
                      {fmt(incomeTax)}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2 font-medium">Bonuses &amp; Incentives</td>
                    <td className="px-4 py-2 text-right">{fmt(bonuses)}</td>
                    <td className="px-4 py-2 font-medium border-l border-slate-100">Other Deductions / Advances</td>
                    <td className={`px-4 py-2 text-right font-semibold ${otherDed > 0 ? "text-rose-600" : ""}`}>
                      {fmt(otherDed)}
                    </td>
                  </tr>

                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
                    <td className="px-4 py-2.5 uppercase text-[11px]">Total Gross Salary</td>
                    <td className="px-4 py-2.5 text-right font-black text-slate-900">{fmt(grossSalary)} ETB</td>
                    <td className="px-4 py-2.5 uppercase text-[11px] border-l border-slate-200">Total Deductions</td>
                    <td className="px-4 py-2.5 text-right font-black text-rose-600">-{fmt(totalDed)} ETB</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Net Pay Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-slate-900 p-4 sm:p-5 text-white shadow-md">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Net Take-Home Salary Payable
                </span>
                <p className="text-xs text-slate-400 mt-0.5">Approved net credit to employee account</p>
              </div>
              <div className="mt-2 sm:mt-0 text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                {fmt(netSalary)} <span className="text-sm font-bold text-white">ETB</span>
              </div>
            </div>

            {/* Statutory Employer Contribution Memo */}
            <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
              <span>
                <strong>Statutory Employer Benefit:</strong> Employer Pension Contribution (11% company covered):
              </span>
              <span className="font-bold text-slate-900">{fmt(pensionEmployer)} ETB</span>
            </div>

            {/* Authorization Signatures Block */}
            <div className="pt-6 grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="border-t border-slate-900 pt-2 text-xs font-bold text-slate-900 uppercase">
                  Prepared By
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Payroll Officer / HR</p>
              </div>

              <div>
                <div className="border-t border-slate-900 pt-2 text-xs font-bold text-slate-900 uppercase">
                  Approved By
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">General Manager / Finance</p>
              </div>

              <div>
                <div className="border-t border-slate-900 pt-2 text-xs font-bold text-slate-900 uppercase">
                  Received By
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.first_name} {item.last_name} (Employee)</p>
              </div>
            </div>

            {/* Official Legal Footer */}
            <div className="border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">
              Kasina Hotel Management System (HMS) • Official Automated Salary Slip • Valid with official stamp
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayslipModal;
