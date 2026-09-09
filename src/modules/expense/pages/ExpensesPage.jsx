import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Receipt,
  TrendingUp,
  Clock,
  Wallet,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  X,
  CalendarDays,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Bell,
  RefreshCw,
  Play,
  Pause,
  Zap,
} from "lucide-react";
import api from "../../../services/api";

const defaultCategories = [
  "Utilities",
  "Salaries & Wages",
  "Cleaning & Supplies",
  "Maintenance",
  "Transportation",
  "Marketing",
  "Rent",
  "Taxes & Fees",
  "Kitchen",
  "Bar",
  "Other",
];

const statusStyles = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
};

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `${num.toLocaleString()} ETB`;
}

function formatDate(date) {
  if (!date) return "-";
  try {
    const dStr = typeof date === "string" && date.includes("T") ? date.split("T")[0] : String(date);
    return new Date(`${dStr}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(date);
  }
}

const getTodayString = () => new Date().toISOString().split("T")[0];

function ExpensesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetExpenseId = searchParams.get("expenseId");
  const targetExpenseNumber = searchParams.get("expenseNumber");
  const targetRecurringId = searchParams.get("recurringId");
  const initialTab = searchParams.get("tab") === "recurring" || targetRecurringId ? "recurring" : "expenses";

  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with URL if changed from outside
  useEffect(() => {
    if (searchParams.get("tab") === "recurring" || targetRecurringId) {
      setActiveTab("recurring");
    }
  }, [searchParams, targetRecurringId]);

  // General state
  const [expenses, setExpenses] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [categoriesList, setCategoriesList] = useState(defaultCategories);
  const [dbCategories, setDbCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [openMenu, setOpenMenu] = useState(null);
  const [openRecurringMenu, setOpenRecurringMenu] = useState(null);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [viewExpense, setViewExpense] = useState(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [payingRecurring, setPayingRecurring] = useState(null);

  const [search, setSearch] = useState("");
  const [recurringSearch, setRecurringSearch] = useState("");

  // Forms
  const [form, setForm] = useState({
    description: "",
    category: "Utilities",
    amount: "",
    paymentMethod: "Cash",
    date: getTodayString(),
    reference: "",
    notes: "",
  });

  const [recurringForm, setRecurringForm] = useState({
    title: "",
    categoryId: "",
    category: "Utilities",
    amount: "",
    frequency: "monthly",
    dueDay: 1,
    paymentMethod: "Bank Transfer",
    notifyBeforeDays: 3,
    notes: "",
  });

  const [payForm, setPayForm] = useState({
    amount: "",
    paymentMethod: "Bank Transfer",
    date: getTodayString(),
    notes: "",
    reference: "",
  });

  /* =========================
     FETCH DATA
  ========================= */

  const fetchCategories = async () => {
    try {
      const res = await api("/expenses/categories");
      const cats = res?.categories || res?.data || (Array.isArray(res) ? res : []);
      if (cats.length > 0) {
        setDbCategories(cats);
        setCategoriesList(cats.map((c) => c.name));
      }
    } catch {
      // Keep default categories
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api("/expenses");
      const rawList =
        response?.expenses ||
        response?.data ||
        (Array.isArray(response) ? response : []);

      const normalized = rawList.map((item) => ({
        id: item._id || item.id || Date.now(),
        description: item.description || "Expense",
        category: item.category || item.category_name || "Other",
        amount: Number(item.amount || 0),
        paymentMethod: item.paymentMethod || item.payment_method || "Cash",
        status: item.status || "Paid",
        date: item.date || item.expense_date
          ? typeof (item.date || item.expense_date) === "string" && (item.date || item.expense_date).includes("T")
            ? (item.date || item.expense_date).split("T")[0]
            : (item.date || item.expense_date)
          : getTodayString(),
        reference: item.reference || item.expense_number || `EXP-${item._id || item.id || Date.now()}`,
        notes: item.notes || "",
        raw: item,
      }));

      setExpenses(normalized);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
      setError(err.message || "Failed to load expenses from server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecurringExpenses = async () => {
    try {
      setLoadingRecurring(true);
      const res = await api("/expenses/recurring");
      const list = res?.recurringExpenses || res?.data || (Array.isArray(res) ? res : []);
      setRecurringExpenses(list);
    } catch (err) {
      console.error("Failed to fetch recurring expenses:", err);
    } finally {
      setLoadingRecurring(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
    fetchRecurringExpenses();
  }, []);

  /* =========================
     SPOTLIGHTS & HIGHLIGHTS
  ========================= */

  const spotlightExpense = useMemo(() => {
    if (!targetExpenseId && !targetExpenseNumber) return null;
    return expenses.find(
      (e) =>
        (targetExpenseId && String(e.id) === String(targetExpenseId)) ||
        (targetExpenseNumber &&
          String(e.reference || "").toLowerCase() ===
            String(targetExpenseNumber || "").toLowerCase())
    );
  }, [expenses, targetExpenseId, targetExpenseNumber]);

  const spotlightRecurring = useMemo(() => {
    if (!targetRecurringId) return null;
    return recurringExpenses.find(
      (r) => String(r.id) === String(targetRecurringId)
    );
  }, [recurringExpenses, targetRecurringId]);

  // Smooth scroll to spotlighted expense row
  useEffect(() => {
    if (spotlightExpense) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`expense-row-${spotlightExpense.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [spotlightExpense]);

  // Smooth scroll to spotlighted recurring row
  useEffect(() => {
    if (spotlightRecurring) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`recurring-row-${spotlightRecurring.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [spotlightRecurring]);

  const clearSpotlight = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("expenseId");
    newParams.delete("expenseNumber");
    newParams.delete("recurringId");
    newParams.delete("tab");
    setSearchParams(newParams, { replace: true });
  };

  /* =========================
     UPCOMING DUE BILLS
  ========================= */

  const upcomingDueBills = useMemo(() => {
    return recurringExpenses.filter(
      (r) => r.status === "active" && (r.is_due_today || r.is_due_soon)
    );
  }, [recurringExpenses]);

  /* =========================
     STATISTICS
  ========================= */

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    [expenses]
  );

  const paidExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.status === "Paid")
        .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    [expenses]
  );

  const pendingExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.status === "Pending")
        .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    [expenses]
  );

  const todayStr = useMemo(() => getTodayString(), []);

  const todayExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.date === todayStr)
        .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    [expenses, todayStr]
  );

  const totalMonthlyRecurring = useMemo(() => {
    return recurringExpenses
      .filter((r) => r.status === "active")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [recurringExpenses]);

  /* =========================
     FILTERED LISTS
  ========================= */

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const q = search.toLowerCase();
      return (
        expense.description.toLowerCase().includes(q) ||
        expense.category.toLowerCase().includes(q) ||
        expense.reference.toLowerCase().includes(q) ||
        expense.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [expenses, search]);

  const filteredRecurring = useMemo(() => {
    return recurringExpenses.filter((item) => {
      const q = recurringSearch.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.category_name || "").toLowerCase().includes(q) ||
        (item.notes || "").toLowerCase().includes(q)
      );
    });
  }, [recurringExpenses, recurringSearch]);

  /* =========================
     ACTIONS - REGULAR EXPENSE
  ========================= */

  const handleAddExpense = async (event) => {
    event.preventDefault();

    if (!form.description || !form.amount) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        description: form.description,
        category: form.category,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        expenseDate: form.date,
        reference: form.reference || `EXP-${Date.now()}`,
        notes: form.notes,
        status: "Paid",
      };

      await api("/expenses", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess("Expense recorded successfully!");
      setTimeout(() => setSuccess(""), 3000);

      setShowModal(false);
      setForm({
        description: "",
        category: "Utilities",
        amount: "",
        paymentMethod: "Cash",
        date: getTodayString(),
        reference: "",
        notes: "",
      });

      await fetchExpenses();
    } catch (err) {
      console.error("Failed to add expense:", err);
      setError(err.message || "Failed to add expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const markAsPaid = async (id) => {
    try {
      setError("");
      await api(`/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "Paid" }),
      });

      setExpenses((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "Paid" } : item))
      );

      setSuccess("Expense marked as Paid!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to mark as paid:", err);
      setError(err.message || "Failed to update expense status.");
    } finally {
      setOpenMenu(null);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;

    try {
      setError("");
      await api(`/expenses/${id}`, { method: "DELETE" });

      setExpenses((prev) => prev.filter((item) => item.id !== id));
      setSuccess("Expense deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to delete expense:", err);
      setError(err.message || "Failed to delete expense.");
    } finally {
      setOpenMenu(null);
    }
  };

  /* =========================
     ACTIONS - RECURRING BILLS
  ========================= */

  const handleOpenRecurringModal = (schedule = null) => {
    if (schedule) {
      setEditingRecurring(schedule);
      setRecurringForm({
        title: schedule.title || "",
        categoryId: schedule.category_id || "",
        category: schedule.category_name || "Utilities",
        amount: schedule.amount || "",
        frequency: schedule.frequency || "monthly",
        dueDay: schedule.due_day || 1,
        paymentMethod: schedule.payment_method || "Bank Transfer",
        notifyBeforeDays: schedule.notify_before_days || 3,
        notes: schedule.notes || "",
      });
    } else {
      setEditingRecurring(null);
      setRecurringForm({
        title: "",
        categoryId: "",
        category: "Utilities",
        amount: "",
        frequency: "monthly",
        dueDay: 1,
        paymentMethod: "Bank Transfer",
        notifyBeforeDays: 3,
        notes: "",
      });
    }
    setShowRecurringModal(true);
  };

  const handleSaveRecurring = async (e) => {
    e.preventDefault();
    if (!recurringForm.title || !recurringForm.amount) {
      setError("Please provide a title and amount for this recurring schedule.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const foundCat = dbCategories.find(
        (c) => c.name.toLowerCase() === recurringForm.category.toLowerCase()
      );
      const catId = foundCat ? foundCat.id : recurringForm.categoryId || null;

      const payload = {
        title: recurringForm.title,
        categoryId: catId,
        amount: Number(recurringForm.amount),
        frequency: recurringForm.frequency,
        dueDay: Number(recurringForm.dueDay) || 1,
        paymentMethod: recurringForm.paymentMethod,
        notifyBeforeDays: Number(recurringForm.notifyBeforeDays) || 3,
        notes: recurringForm.notes,
      };

      if (editingRecurring) {
        await api(`/expenses/recurring/${editingRecurring.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess("Recurring schedule updated successfully!");
      } else {
        await api("/expenses/recurring", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Recurring schedule created successfully!");
      }

      setTimeout(() => setSuccess(""), 3000);
      setShowRecurringModal(false);
      await fetchRecurringExpenses();
    } catch (err) {
      console.error("Failed to save recurring expense:", err);
      setError(err.message || "Failed to save recurring expense schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRecurringStatus = async (item) => {
    try {
      const newStatus = item.status === "active" ? "paused" : "active";
      await api(`/expenses/recurring/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });

      setRecurringExpenses((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: newStatus } : r))
      );

      setSuccess(`Recurring schedule set to ${newStatus}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to toggle status:", err);
      setError(err.message || "Failed to update schedule status.");
    } finally {
      setOpenRecurringMenu(null);
    }
  };

  const handleDeleteRecurring = async (id) => {
    if (!window.confirm("Are you sure you want to delete this recurring schedule?")) return;

    try {
      await api(`/expenses/recurring/${id}`, { method: "DELETE" });
      setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
      setSuccess("Recurring schedule deleted.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to delete recurring schedule:", err);
      setError(err.message || "Failed to delete schedule.");
    } finally {
      setOpenRecurringMenu(null);
    }
  };

  const handleOpenPayModal = (item) => {
    setPayingRecurring(item);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    setPayForm({
      amount: item.amount || "",
      paymentMethod: item.payment_method || "Bank Transfer",
      date: getTodayString(),
      reference: `REC-${item.id}-${year}${month}`,
      notes: `Recurring payment for ${item.title} (${now.toLocaleString("default", { month: "short" })} ${year})`,
    });
  };

  const handleConfirmPayRecurring = async (e) => {
    e.preventDefault();
    if (!payingRecurring) return;

    try {
      setSubmitting(true);
      setError("");

      await api(`/expenses/recurring/${payingRecurring.id}/pay`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payForm.amount) || payingRecurring.amount,
          paymentMethod: payForm.paymentMethod,
          expenseDate: payForm.date,
          reference: payForm.reference,
          notes: payForm.notes,
        }),
      });

      setSuccess(`Payment for "${payingRecurring.title}" successfully recorded!`);
      setTimeout(() => setSuccess(""), 4000);

      setPayingRecurring(null);
      await fetchExpenses();
      await fetchRecurringExpenses();
    } catch (err) {
      console.error("Failed to record recurring payment:", err);
      setError(err.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">

      {/* =========================
          HEADER & ACTIONS
      ========================= */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Expenses & Billing</h1>
            {upcomingDueBills.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-700 animate-pulse">
                <Bell size={14} />
                {upcomingDueBills.length} Bill{upcomingDueBills.length > 1 ? "s" : ""} Due Soon
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Track daily restaurant operations and manage recurring monthly schedules (Rent, Utilities, Wi-Fi).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === "recurring" ? (
            <button
              onClick={() => handleOpenRecurringModal()}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <Plus size={18} />
              Add Recurring Bill
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <Plus size={18} />
              Add Expense
            </button>
          )}
        </div>
      </div>

      {/* =========================
          NOTIFICATIONS / BANNERS
      ========================= */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-green-500 hover:text-green-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================
          UPCOMING DUE BILLS BANNER (AUTOMATED REMINDER HIGHLIGHT)
      ======================================================== */}
      {upcomingDueBills.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/15 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
                <Bell className="h-6 w-6 animate-bounce" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white">
                    Payment Due Reminder
                  </span>
                  <span className="text-xs font-semibold text-amber-800">
                    {upcomingDueBills.length} recurring bill{upcomingDueBills.length > 1 ? "s" : ""} due this cycle
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  {upcomingDueBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-white/90 border border-amber-200 px-3 py-1.5 text-xs shadow-xs"
                    >
                      <span className="font-bold text-gray-900">{bill.title}</span>
                      <span className="font-black text-amber-700">{formatCurrency(bill.amount)}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          bill.is_due_today
                            ? "bg-red-100 text-red-700 animate-pulse"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {bill.is_due_today ? "Due Today" : `Due in ${bill.days_until_due}d`}
                      </span>
                      <button
                        onClick={() => handleOpenPayModal(bill)}
                        className="ml-1 inline-flex items-center gap-1 rounded bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-amber-700"
                      >
                        <Zap size={12} /> Pay Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("recurring")}
              className="self-start lg:self-center shrink-0 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 shadow-xs"
            >
              Manage Schedules &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          EXPENSE SPOTLIGHT BANNER (FOR DIRECT NOTIFICATION TOUCH)
      ======================================================== */}
      {spotlightExpense && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-blue-400 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-purple-500/15 p-5 shadow-lg backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-blue-300 bg-white shadow-md">
                <Receipt className="h-7 w-7 text-blue-600" />
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
                    <Receipt className="h-3 w-3" />
                    Expense Record Spotlight
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {spotlightExpense.category} • {formatDate(spotlightExpense.date)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      statusStyles[spotlightExpense.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {spotlightExpense.status}
                  </span>
                </div>

                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {spotlightExpense.description}
                </h2>

                <p className="text-xs font-bold text-slate-600 flex flex-wrap items-center gap-2 mt-0.5">
                  <span>
                    Amount:{" "}
                    <strong className="text-base font-black text-blue-700">
                      {formatCurrency(spotlightExpense.amount)}
                    </strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>Payment: {spotlightExpense.paymentMethod}</span>
                  <span className="text-slate-400">•</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Ref: {spotlightExpense.reference}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              <button
                onClick={() => setViewExpense(spotlightExpense)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3.5 py-2 text-xs font-bold text-blue-800 shadow-sm transition hover:bg-blue-50"
              >
                <Eye size={14} />
                View Details
              </button>

              {spotlightExpense.status === "Pending" && (
                <button
                  onClick={() => markAsPaid(spotlightExpense.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-700"
                >
                  <CheckCircle size={14} />
                  Mark as Paid
                </button>
              )}

              <button
                onClick={clearSpotlight}
                className="rounded-xl border border-slate-300 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
                title="Dismiss Spotlight"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          RECURRING SPOTLIGHT BANNER (DIRECT TOUCH TO RECURRING)
      ======================================================== */}
      {spotlightRecurring && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-5 shadow-lg backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-300 bg-white shadow-md text-amber-600">
                <CalendarDays className="h-7 w-7" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
                    Recurring Schedule Spotlight
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    Day {spotlightRecurring.due_day} of month • {spotlightRecurring.frequency}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      spotlightRecurring.is_due_today
                        ? "bg-red-100 text-red-700"
                        : spotlightRecurring.is_due_soon
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {spotlightRecurring.is_due_today
                      ? "Due Today"
                      : `Due in ${spotlightRecurring.days_until_due} days`}
                  </span>
                </div>

                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {spotlightRecurring.title}
                </h2>

                <p className="text-xs font-bold text-slate-600 flex flex-wrap items-center gap-2 mt-0.5">
                  <span>
                    Commitment:{" "}
                    <strong className="text-base font-black text-amber-700">
                      {formatCurrency(spotlightRecurring.amount)}
                    </strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>Category: {spotlightRecurring.category_name || "General"}</span>
                  <span className="text-slate-400">•</span>
                  <span>Next Due: {formatDate(spotlightRecurring.next_due_date)}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              <button
                onClick={() => handleOpenPayModal(spotlightRecurring)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
              >
                <Zap size={14} />
                Pay & Record Now
              </button>

              <button
                onClick={clearSpotlight}
                className="rounded-xl border border-slate-300 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
                title="Dismiss Spotlight"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          TAB SELECTOR
      ========================= */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "expenses"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Receipt size={18} />
          All Expenses ({expenses.length})
        </button>

        <button
          onClick={() => setActiveTab("recurring")}
          className={`relative flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "recurring"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <CalendarDays size={18} />
          Recurring & Monthly Schedules
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {recurringExpenses.length}
          </span>
          {upcomingDueBills.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-black text-white">
              {upcomingDueBills.length} Due
            </span>
          )}
        </button>
      </div>

      {/* ========================================================
          TAB CONTENT: 1. REGULAR EXPENSES
      ======================================================== */}
      {activeTab === "expenses" && (
        <div className="space-y-6 animate-fade-in">
          {/* STATS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Expenses"
              value={formatCurrency(totalExpenses)}
              description="Overall expenditure recorded"
              icon={Wallet}
            />
            <StatCard
              title="Paid Expenses"
              value={formatCurrency(paidExpenses)}
              description="Completed & verified payouts"
              icon={TrendingUp}
            />
            <StatCard
              title="Pending Approval"
              value={formatCurrency(pendingExpenses)}
              description="Unpaid vouchers"
              icon={Clock}
            />
            <StatCard
              title="Today's Outflow"
              value={formatCurrency(todayExpenses)}
              description="Spent today"
              icon={Receipt}
            />
          </div>

          {/* TABLE CONTAINER */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* SEARCH BAR */}
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-72">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search expenses by ref, desc, category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchExpenses}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  title="Refresh List"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {/* EXPENSES TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Expense</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Payment</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-gray-400">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                        Loading expenses...
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-gray-400">
                        No expenses found.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => {
                      const isHighlighted =
                        (targetExpenseId && String(expense.id) === String(targetExpenseId)) ||
                        (targetExpenseNumber &&
                          String(expense.reference || "").toLowerCase() ===
                            String(targetExpenseNumber || "").toLowerCase());

                      return (
                        <tr
                          key={expense.id}
                          id={`expense-row-${expense.id}`}
                          className={`transition ${
                            isHighlighted
                              ? "bg-blue-50/80 font-medium ring-2 ring-blue-400 ring-inset"
                              : "hover:bg-gray-50/80"
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900">{expense.description}</div>
                            <div className="text-xs text-gray-400">{expense.reference}</div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                              {expense.category}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-bold text-gray-900">
                            {formatCurrency(expense.amount)}
                          </td>

                          <td className="px-5 py-4 text-xs font-medium text-gray-600">
                            {expense.paymentMethod}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                statusStyles[expense.status] || "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {expense.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-gray-500">
                            {formatDate(expense.date)}
                          </td>

                          <td className="relative px-5 py-4 text-right">
                            <button
                              onClick={() => setOpenMenu(openMenu === expense.id ? null : expense.id)}
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {openMenu === expense.id && (
                              <div className="absolute right-5 top-12 z-50 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                                <button
                                  onClick={() => {
                                    setViewExpense(expense);
                                    setOpenMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Eye size={16} />
                                  View Details
                                </button>

                                {expense.status === "Pending" && (
                                  <button
                                    onClick={() => markAsPaid(expense.id)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <CheckCircle size={16} className="text-green-600" />
                                    Mark as Paid
                                  </button>
                                )}

                                <button
                                  onClick={() => deleteExpense(expense.id)}
                                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB CONTENT: 2. RECURRING & MONTHLY SCHEDULES
      ======================================================== */}
      {activeTab === "recurring" && (
        <div className="space-y-6 animate-fade-in">
          {/* RECURRING STATS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Monthly Commitment"
              value={formatCurrency(totalMonthlyRecurring)}
              description="Active contracts & bills per month"
              icon={Wallet}
            />
            <StatCard
              title="Active Recurring Contracts"
              value={`${recurringExpenses.filter((r) => r.status === "active").length} Schedules`}
              description="Rent, utilities, retainer contracts"
              icon={CalendarDays}
            />
            <StatCard
              title="Bills Due This Period"
              value={`${upcomingDueBills.length} Bill${upcomingDueBills.length > 1 ? "s" : ""}`}
              description="Due today or in the next 3 days"
              icon={Bell}
            />
          </div>

          {/* RECURRING TABLE CONTAINER */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* SEARCH & FILTERS */}
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-72">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search recurring schedules..."
                  value={recurringSearch}
                  onChange={(e) => setRecurringSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchRecurringExpenses}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  title="Refresh Schedules"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Bill / Contract Title</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Frequency & Due Day</th>
                    <th className="px-5 py-3">Next Due Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Quick Pay & Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loadingRecurring ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-gray-400">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                        Loading recurring schedules...
                      </td>
                    </tr>
                  ) : filteredRecurring.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-gray-400">
                        No recurring bills registered yet. Click "Add Recurring Bill" above to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredRecurring.map((item) => {
                      const isHighlighted =
                        targetRecurringId && String(item.id) === String(targetRecurringId);

                      return (
                        <tr
                          key={item.id}
                          id={`recurring-row-${item.id}`}
                          className={`transition ${
                            isHighlighted
                              ? "bg-amber-50/80 font-medium ring-2 ring-amber-400 ring-inset"
                              : "hover:bg-gray-50/80"
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900">{item.title}</div>
                            {item.notes && <div className="text-xs text-gray-400">{item.notes}</div>}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                              {item.category_name || "General"}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-bold text-gray-900">
                            {formatCurrency(item.amount)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium capitalize text-gray-800">
                              {item.frequency}
                            </div>
                            <div className="text-xs text-gray-400">
                              Every month on Day {item.due_day}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900">
                              {formatDate(item.next_due_date)}
                            </div>
                            <div>
                              {item.is_due_today ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-black text-red-700 animate-pulse">
                                  Due Today!
                                </span>
                              ) : item.is_due_soon ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                  Due in {item.days_until_due} days
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  In {item.days_until_due} days
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                item.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {item.status === "active" ? "Active" : "Paused"}
                            </span>
                          </td>

                          <td className="relative px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenPayModal(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                              >
                                <Zap size={14} />
                                Pay & Record
                              </button>

                              <button
                                onClick={() =>
                                  setOpenRecurringMenu(
                                    openRecurringMenu === item.id ? null : item.id
                                  )
                                }
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                              >
                                <MoreVertical size={18} />
                              </button>
                            </div>

                            {openRecurringMenu === item.id && (
                              <div className="absolute right-5 top-12 z-50 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl text-left">
                                <button
                                  onClick={() => {
                                    handleOpenRecurringModal(item);
                                    setOpenRecurringMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  <Pencil size={14} />
                                  Edit Schedule
                                </button>

                                <button
                                  onClick={() => handleToggleRecurringStatus(item)}
                                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  {item.status === "active" ? (
                                    <>
                                      <Pause size={14} /> Pause Schedule
                                    </>
                                  ) : (
                                    <>
                                      <Play size={14} /> Resume Schedule
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleDeleteRecurring(item.id)}
                                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                  Delete Schedule
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD / EDIT REGULAR EXPENSE MODAL
      ======================================================== */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="mx-auto my-6 w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add Expense</h2>
                <p className="mt-1 text-xs text-gray-500">Record a new business expense.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description *</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Generator Fuel / Vegetables Purchase"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Amount (ETB) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Telebirr">Telebirr</option>
                  <option value="CBE Birr">CBE Birr</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Reference / Voucher No.</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="e.g. REC-10294"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional information..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{submitting ? "Saving..." : "Save Expense"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD / EDIT RECURRING BILL SCHEDULE MODAL
      ======================================================== */}
      {showRecurringModal && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/40 p-4"
          onClick={() => setShowRecurringModal(false)}
        >
          <div
            className="mx-auto my-6 w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingRecurring ? "Edit Recurring Bill" : "Add Recurring Bill Schedule"}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Automatic due date alerts will be sent to Admin & Finance.
                </p>
              </div>
              <button
                onClick={() => setShowRecurringModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRecurring} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Bill / Contract Title *
                </label>
                <input
                  type="text"
                  required
                  value={recurringForm.title}
                  onChange={(e) => setRecurringForm({ ...recurringForm, title: e.target.value })}
                  placeholder="e.g. Monthly Store Rent, Ethio Telecom Wi-Fi, Generator Fuel Retainer"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={recurringForm.category}
                    onChange={(e) => setRecurringForm({ ...recurringForm, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Amount (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={recurringForm.amount}
                    onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Recurrence Frequency
                  </label>
                  <select
                    value={recurringForm.frequency}
                    onChange={(e) => setRecurringForm({ ...recurringForm, frequency: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Due Day of Month (1 - 31) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={recurringForm.dueDay}
                    onChange={(e) => setRecurringForm({ ...recurringForm, dueDay: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Default Payment Method
                  </label>
                  <select
                    value={recurringForm.paymentMethod}
                    onChange={(e) => setRecurringForm({ ...recurringForm, paymentMethod: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Telebirr">Telebirr</option>
                    <option value="CBE Birr">CBE Birr</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Alert Days In Advance
                  </label>
                  <select
                    value={recurringForm.notifyBeforeDays}
                    onChange={(e) => setRecurringForm({ ...recurringForm, notifyBeforeDays: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="1">1 Day Before</option>
                    <option value="2">2 Days Before</option>
                    <option value="3">3 Days Before</option>
                    <option value="5">5 Days Before</option>
                    <option value="7">7 Days Before</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={2}
                  value={recurringForm.notes}
                  onChange={(e) => setRecurringForm({ ...recurringForm, notes: e.target.value })}
                  placeholder="Contract details, landlord or vendor contact info..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowRecurringModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{submitting ? "Saving..." : editingRecurring ? "Update Schedule" : "Save Schedule"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          1-CLICK PAY RECURRING BILL MODAL
      ======================================================== */}
      {payingRecurring && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPayingRecurring(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-200">
                    Record Payment
                  </span>
                  <h2 className="text-lg font-bold">{payingRecurring.title}</h2>
                </div>
                <button onClick={() => setPayingRecurring(null)} className="rounded-lg p-1 text-white/80 hover:text-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleConfirmPayRecurring} className="space-y-4 p-6">
              <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-3.5 text-xs text-blue-900">
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500">Category:</span>
                  <span className="font-bold">{payingRecurring.category_name || "General"}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500">Next Scheduled Due:</span>
                  <span className="font-bold">{formatDate(payingRecurring.next_due_date)}</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Amount (ETB)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-blue-700 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Payment Method</label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Telebirr">Telebirr</option>
                    <option value="CBE Birr">CBE Birr</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Payment Date</label>
                  <input
                    type="date"
                    value={payForm.date}
                    onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Reference / Check / Tx ID</label>
                <input
                  type="text"
                  value={payForm.reference}
                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                  placeholder="e.g. CBE-TX-992384"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Payment Notes</label>
                <textarea
                  rows={2}
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setPayingRecurring(null)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{submitting ? "Recording..." : "Confirm & Mark as Paid"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW EXPENSE DETAILS MODAL
      ======================================================== */}
      {viewExpense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Expense Details</h2>
                <p className="text-xs text-gray-500">{viewExpense.reference}</p>
              </div>
              <button
                onClick={() => setViewExpense(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <DetailRow label="Description" value={viewExpense.description} />
              <DetailRow label="Category" value={viewExpense.category} />
              <DetailRow label="Amount" value={formatCurrency(viewExpense.amount)} />
              <DetailRow label="Payment Method" value={viewExpense.paymentMethod} />
              <DetailRow label="Date" value={formatDate(viewExpense.date)} />
              <DetailRow label="Status" value={viewExpense.status} />
              <DetailRow label="Notes" value={viewExpense.notes || "-"} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">{value}</h2>
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>
        <div className="rounded-lg bg-gray-100 p-3">
          <Icon size={22} className="text-gray-700" />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default ExpensesPage;