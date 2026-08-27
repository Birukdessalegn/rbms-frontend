import { useMemo, useState } from "react";
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
} from "lucide-react";

const initialExpenses = [
  {
    id: 1,
    date: "2026-08-26",
    description: "Electricity Bill",
    category: "Utilities",
    amount: 12500,
    paymentMethod: "Bank",
    status: "Paid",
    reference: "ELEC-0826",
    notes: "Monthly electricity bill",
  },
  {
    id: 2,
    date: "2026-08-25",
    description: "Plumbing Repair",
    category: "Maintenance",
    amount: 4500,
    paymentMethod: "Cash",
    status: "Paid",
    reference: "EXP-0025",
    notes: "Kitchen sink repair",
  },
  {
    id: 3,
    date: "2026-08-24",
    description: "Cleaning Supplies",
    category: "Cleaning & Supplies",
    amount: 3200,
    paymentMethod: "Cash",
    status: "Pending",
    reference: "EXP-0024",
    notes: "Cleaning materials",
  },
  {
    id: 4,
    date: "2026-08-23",
    description: "Internet Bill",
    category: "Utilities",
    amount: 2000,
    paymentMethod: "Bank",
    status: "Paid",
    reference: "NET-0823",
    notes: "Monthly internet",
  },
  {
    id: 5,
    date: "2026-08-22",
    description: "Transportation",
    category: "Transportation",
    amount: 1800,
    paymentMethod: "Cash",
    status: "Paid",
    reference: "EXP-0022",
    notes: "Supplier transportation",
  },
];

const categories = [
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
  return `${amount.toLocaleString()} ETB`;
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ExpensesPage() {

  const [expenses, setExpenses] = useState(initialExpenses);
  const [openMenu, setOpenMenu] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [viewExpense, setViewExpense] = useState(null);

  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    description: "",
    category: "Utilities",
    amount: "",
    paymentMethod: "Cash",
    date: "2026-08-26",
    reference: "",
    notes: "",
  });

  /* =========================
     STATISTICS
  ========================= */

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  const paidExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.status === "Paid")
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  const pendingExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.status === "Pending")
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  const todayExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.date === "2026-08-26")
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  /* =========================
     SEARCH
  ========================= */

  const filteredExpenses = expenses.filter((expense) => {
    const query = search.toLowerCase();

    return (
      expense.description.toLowerCase().includes(query) ||
      expense.category.toLowerCase().includes(query) ||
      expense.reference.toLowerCase().includes(query)
    );
  });

  /* =========================
     ADD EXPENSE
  ========================= */

  const handleAddExpense = (event) => {
    event.preventDefault();

    if (!form.description || !form.amount || !form.date) {
      return;
    }

    const newExpense = {
      id: Date.now(),
      description: form.description,
      category: form.category,
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      date: form.date,
      status: "Pending",
      reference: form.reference || `EXP-${Date.now()}`,
      notes: form.notes,
    };

    setExpenses((previous) => [newExpense, ...previous]);

    setForm({
      description: "",
      category: "Utilities",
      amount: "",
      paymentMethod: "Cash",
      date: "2026-08-26",
      reference: "",
      notes: "",
    });

    setShowModal(false);
  };

  /* =========================
     MARK PAID
  ========================= */

  const markAsPaid = (id) => {
    setExpenses((previous) =>
      previous.map((expense) =>
        expense.id === id
          ? { ...expense, status: "Paid" }
          : expense
      )
    );

    setOpenMenu(null);
  };

  /* =========================
     DELETE
  ========================= */

  const deleteExpense = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) return;

    setExpenses((previous) =>
      previous.filter((expense) => expense.id !== id)
    );

    setOpenMenu(null);
  };

  return (
    <div className="w-full space-y-6">

      {/* =========================
          HEADER
      ========================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Expenses
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Track and manage restaurant and bar expenses.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Expense
        </button>

      </div>

      {/* =========================
          STATISTICS
      ========================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Today's Expenses"
          value={formatCurrency(todayExpenses)}
          description="Expenses recorded today"
          icon={Receipt}
        />

        <StatCard
          title="This Month"
          value={formatCurrency(totalExpenses)}
          description="Total recorded expenses"
          icon={TrendingUp}
        />

        <StatCard
          title="Pending"
          value={formatCurrency(pendingExpenses)}
          description="Awaiting payment"
          icon={Clock}
        />

        <StatCard
          title="Paid Expenses"
          value={formatCurrency(paidExpenses)}
          description="Successfully paid"
          icon={Wallet}
        />

      </div>

      {/* =========================
          EXPENSE TABLE
      ========================= */}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Expense Records
            </h2>

            <p className="text-sm text-gray-500">
              View and manage business expenses.
            </p>
          </div>

          <div className="relative w-full lg:w-72">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10"
            />

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1000px] text-left">

            <thead className="bg-gray-50">

              <tr>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Date
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Description
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Category
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Amount
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Payment
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Status
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-100">

              {filteredExpenses.map((expense) => (

                <tr
                  key={expense.id}
                  className="transition hover:bg-gray-50"
                >

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {formatDate(expense.date)}
                  </td>

                  <td className="px-5 py-4">

                    <p className="font-medium text-gray-900">
                      {expense.description}
                    </p>

                    <p className="text-xs text-gray-400">
                      {expense.reference}
                    </p>

                  </td>

                  <td className="px-5 py-4 text-sm text-gray-700">
                    {expense.category}
                  </td>

                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                    {formatCurrency(expense.amount)}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {expense.paymentMethod}
                  </td>

                  <td className="px-5 py-4">

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        statusStyles[expense.status]
                      }`}
                    >
                      {expense.status}
                    </span>

                  </td>

                  {/* ACTION */}

                  <td className="relative px-5 py-4">

                    <button
                      onClick={() =>
                        setOpenMenu(
                          openMenu === expense.id
                            ? null
                            : expense.id
                        )
                      }
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

                        <button
                          onClick={() => {
                            console.log("Edit expense:", expense);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil size={16} />
                          Edit Expense
                        </button>

                        {expense.status === "Pending" && (
                          <button
                            onClick={() => markAsPaid(expense.id)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <CheckCircle
                              size={16}
                              className="text-green-600"
                            />
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

              ))}

              {filteredExpenses.length === 0 && (

                <tr>

                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    No expenses found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =========================
          EXPENSE SUMMARY
      ========================= */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

        <h2 className="text-lg font-semibold text-gray-900">
          Expense Overview
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Current expense breakdown.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-lg bg-gray-50 p-4">

            <p className="text-sm text-gray-500">
              Total Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatCurrency(totalExpenses)}
            </p>

          </div>

          <div className="rounded-lg bg-gray-50 p-4">

            <p className="text-sm text-gray-500">
              Paid
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatCurrency(paidExpenses)}
            </p>

          </div>

          <div className="rounded-lg bg-gray-50 p-4">

            <p className="text-sm text-gray-500">
              Pending
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatCurrency(pendingExpenses)}
            </p>

          </div>

        </div>

      </div>

      {/* =========================
          ADD EXPENSE MODAL
      ========================= */}

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

                <h2 className="text-lg font-semibold text-gray-900">
                  Add Expense
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Record a new business expense.
                </p>

              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>

            </div>

            <form
              onSubmit={handleAddExpense}
              className="max-h-[70vh] space-y-4 overflow-y-auto p-6"
            >

              {/* Description */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>

                <input
                  type="text"
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  placeholder="e.g. Electricity Bill"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />

              </div>

              {/* Category */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Category
                </label>

                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >

                  {categories.map((category) => (
                    <option key={category}>
                      {category}
                    </option>
                  ))}

                </select>

              </div>

              {/* Amount + Payment */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        amount: event.target.value,
                      })
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />

                </div>

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Payment Method
                  </label>

                  <select
                    value={form.paymentMethod}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        paymentMethod: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >

                    <option>Cash</option>
                    <option>Bank</option>
                    <option>Mobile Money</option>
                    <option>Card</option>

                  </select>

                </div>

              </div>

              {/* Date */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Date
                </label>

                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      date: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />

              </div>

              {/* Reference */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Reference / Receipt No.
                </label>

                <input
                  type="text"
                  value={form.reference}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      reference: event.target.value,
                    })
                  }
                  placeholder="Optional"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />

              </div>

              {/* Notes */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes
                </label>

                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      notes: event.target.value,
                    })
                  }
                  placeholder="Additional information..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />

              </div>

              {/* Buttons */}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Save Expense
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =========================
          VIEW EXPENSE MODAL
      ========================= */}

      {viewExpense && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">

              <div>

                <h2 className="text-lg font-semibold text-gray-900">
                  Expense Details
                </h2>

                <p className="text-xs text-gray-500">
                  {viewExpense.reference}
                </p>

              </div>

              <button
                onClick={() => setViewExpense(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>

            </div>

            <div className="space-y-4 p-6">

              <DetailRow
                label="Description"
                value={viewExpense.description}
              />

              <DetailRow
                label="Category"
                value={viewExpense.category}
              />

              <DetailRow
                label="Amount"
                value={formatCurrency(viewExpense.amount)}
              />

              <DetailRow
                label="Payment Method"
                value={viewExpense.paymentMethod}
              />

              <DetailRow
                label="Date"
                value={formatDate(viewExpense.date)}
              />

              <DetailRow
                label="Status"
                value={viewExpense.status}
              />

              <DetailRow
                label="Notes"
                value={viewExpense.notes || "-"}
              />

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

/* =========================
   STAT CARD
========================= */

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {value}
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            {description}
          </p>

        </div>

        <div className="rounded-lg bg-gray-100 p-3">
          <Icon size={22} className="text-gray-700" />
        </div>

      </div>

    </div>
  );
}

/* =========================
   DETAIL ROW
========================= */

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">

      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-sm font-medium text-gray-900">
        {value}
      </span>

    </div>
  );
}

export default ExpensesPage;