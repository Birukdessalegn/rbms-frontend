import { useState, useEffect } from "react";
import {
  DollarSign,
  Calendar,
  RefreshCw,
  FileText,
  CheckCircle2,
  Users,
  TrendingDown,
  Lock,
  Search,
  Download
} from "lucide-react";
import api from "../../../services/api";
import PayslipModal from "../components/PayslipModal";

function PayrollPage() {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Payslip modal state
  const [selectedItemForSlip, setSelectedItemForSlip] = useState(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  const fetchPayroll = async (month = selectedMonth) => {
    try {
      setLoading(true);
      setError("");
      const res = await api(`/payroll/summary?month=${month}`);
      setPayrollData(res.data || null);
    } catch (err) {
      console.error("Failed to load payroll summary:", err);
      setError(err.message || "Failed to load payroll summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll(selectedMonth);
  }, [selectedMonth]);

  const handleApprovePayroll = async () => {
    if (!payrollData?.items || payrollData.items.length === 0) return;
    if (!window.confirm(`Are you sure you want to approve and lock the payroll run for ${selectedMonth}?`)) {
      return;
    }

    try {
      setSubmitting(true);
      await api("/payroll/runs", {
        method: "POST",
        body: JSON.stringify({
          periodMonth: selectedMonth,
          items: payrollData.items,
          status: "approved",
          notes: `Monthly payroll processed on ${new Date().toLocaleDateString()}`
        })
      });
      fetchPayroll(selectedMonth);
    } catch (err) {
      console.error("Failed to approve payroll:", err);
      alert(err.message || "Failed to approve payroll");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPayslip = (item) => {
    setSelectedItemForSlip(item);
    setIsSlipModalOpen(true);
  };

  const items = payrollData?.items || [];
  const stats = payrollData?.stats || { totalEmployees: 0, totalGross: 0, totalDeductions: 0, totalNet: 0 };
  const isApproved = payrollData?.status === "approved";

  const filteredItems = items.filter((it) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (it.first_name && it.first_name.toLowerCase().includes(q)) ||
      (it.last_name && it.last_name.toLowerCase().includes(q)) ||
      (it.employee_code && it.employee_code.toLowerCase().includes(q)) ||
      (it.department_name && it.department_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Basic Payroll & Salary Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate monthly payroll summaries, track attendance deductions, and issue payslips.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Month Picker */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-slate-800 focus:outline-hidden bg-transparent"
            />
          </div>

          <button
            onClick={handleApprovePayroll}
            disabled={submitting || isApproved || items.length === 0}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 transition"
          >
            {isApproved ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Payroll Approved
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                {submitting ? "Approving..." : "Approve & Lock Payroll"}
              </>
            )}
          </button>

          <button
            onClick={() => fetchPayroll(selectedMonth)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Total Staff</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.totalEmployees}</p>
          <p className="text-xs text-slate-500 mt-1">Active staff on payroll</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Total Gross Salary</span>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {stats.totalGross.toLocaleString()} ETB
          </p>
          <p className="text-xs text-slate-500 mt-1">Base salaries combined</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Total Deductions</span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600">
            -{stats.totalDeductions.toLocaleString()} ETB
          </p>
          <p className="text-xs text-slate-500 mt-1">Pension (7%) + Income Tax</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-800">Net Salary Payable</span>
            <div className="rounded-xl bg-emerald-600 p-2 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">
            {stats.totalNet.toLocaleString()} ETB
          </p>
          <p className="text-xs text-emerald-700 mt-1">Approved total payout</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 p-3 sm:p-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee by name, code or dept..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold border ${
                isApproved
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              Status: {isApproved ? "Approved & Locked" : "Draft Preview"}
            </span>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-400">
            Calculating payroll sheet...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-400">
            No active staff found for this payroll period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5 text-right">Base Salary</th>
                  <th className="px-4 py-3.5 text-center">Days (Wrk/Abs)</th>
                  <th className="px-4 py-3.5 text-right">Pension (7%)</th>
                  <th className="px-4 py-3.5 text-right">Income Tax</th>
                  <th className="px-4 py-3.5 text-right">Total Deductions</th>
                  <th className="px-4 py-3.5 text-right">Net Payable</th>
                  <th className="px-4 py-3.5 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-xs text-slate-400">{emp.employee_code}</p>
                    </td>

                    <td className="px-4 py-4 text-xs font-semibold text-slate-700">
                      {emp.department_name || "General"}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      {Number(emp.base_salary || 0).toLocaleString()} ETB
                    </td>

                    <td className="px-4 py-4 text-center text-xs">
                      <span className="font-bold text-emerald-700">{emp.days_worked || 0}w</span>
                      {" / "}
                      <span className={Number(emp.days_absent) > 0 ? "font-bold text-rose-600" : "text-slate-400"}>
                        {emp.days_absent || 0}a
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right font-medium text-slate-600">
                      {Number(emp.pension_employee || 0) > 0 ? `-${Number(emp.pension_employee).toLocaleString()}` : "0"} ETB
                    </td>

                    <td className="px-4 py-4 text-right font-medium text-slate-600">
                      {Number(emp.income_tax || 0) > 0 ? `-${Number(emp.income_tax).toLocaleString()}` : "0"} ETB
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-rose-600">
                      -{Number(emp.total_deductions || emp.deductions || 0).toLocaleString()} ETB
                    </td>

                    <td className="px-4 py-4 text-right font-black text-slate-900">
                      {Number(emp.net_salary || 0).toLocaleString()} ETB
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleViewPayslip(emp)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      <PayslipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        item={selectedItemForSlip}
        periodMonth={selectedMonth}
      />
    </div>
  );
}

export default PayrollPage;
