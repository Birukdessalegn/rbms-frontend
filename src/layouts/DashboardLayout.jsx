import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Flame,
  Wine,
  Users,
  CalendarDays,
  ShoppingBag,
  UserCheck,
  Receipt,
  BarChart3,
  Menu,
  X,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UtensilsCrossed,
  LogOut,
  Settings,
  User,
  ShieldCheck,
  Plus,
  CheckCircle2,
} from "lucide-react";

const navigationGroups = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operations",
    items: [
      { name: "POS", path: "/pos", icon: ShoppingCart, badge: "Live" },
      { name: "Kitchen", path: "/kitchen", icon: Flame, badge: "4" },
      { name: "Bar", path: "/bar", icon: Wine },
      { name: "Reservations", path: "/reservations", icon: CalendarDays },
    ],
  },
  {
    title: "Management",
    items: [
      { name: "Products", path: "/products", icon: Package },
      { name: "Inventory", path: "/inventory", icon: Boxes },
      { name: "Customers", path: "/customers", icon: Users },
      { name: "Purchasing", path: "/purchasing", icon: ShoppingBag },
    ],
  },
  {
    title: "Administration",
    items: [
      { name: "Employees", path: "/employees", icon: UserCheck },
      { name: "Expenses", path: "/expenses", icon: Receipt },
      { name: "Reports", path: "/reports", icon: BarChart3 },
    ],
  },
];

const mockNotifications = [
  { id: 1, title: "New Order #1042", time: "2 mins ago", unread: true, category: "POS" },
  { id: 2, title: "Kitchen delay alert on Table 4", time: "10 mins ago", unread: true, category: "Kitchen" },
  { id: 3, title: "Low stock: Espresso Beans", time: "1 hour ago", unread: false, category: "Inventory" },
];

function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();

  const notificationsRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Find active item details for breadcrumbs
  const currentPath = location.pathname;
  let activeItemName = "Dashboard";
  let activeGroupTitle = "Overview";

  for (const group of navigationGroups) {
    const item = group.items.find((i) => i.path === currentPath);
    if (item) {
      activeItemName = item.name;
      activeGroupTitle = group.title;
      break;
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-800 antialiased">
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out border-r border-slate-800 ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
        } ${
          isMobileOpen
            ? "translate-x-0 w-64 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg text-white tracking-wide">
                    RBMS
                  </span>
                  <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/30 uppercase">
                    PRO
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 truncate">
                  Restaurant & Bar
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  {group.title}
                </h3>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      } ${isCollapsed ? "justify-center px-0" : ""}`
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-105" />
                    {!isCollapsed && (
                      <span className="flex-1 truncate">{item.name}</span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.badge === "Live"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Desktop Collapse Toggle Footer */}
        <div className="hidden lg:flex shrink-0 items-center justify-between p-3 border-t border-slate-800">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 px-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-medium text-slate-400">Store #1 Online</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors mx-auto"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div
        className={`flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 md:px-6 backdrop-blur-md">
          {/* Left: Mobile trigger & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span className="hidden sm:inline font-semibold text-slate-500">
                {activeGroupTitle}
              </span>
              <span className="hidden sm:inline text-slate-400 font-bold">/</span>
              <span className="font-bold text-blue-950 text-base md:text-lg tracking-tight">
                {activeItemName}
              </span>
            </div>
          </div>

          {/* Right: Search, Notifications & User Dropdown */}
          <div className="flex items-center gap-2.5 md:gap-4">
            {/* Global Search Bar */}
            <div className="relative hidden md:block w-56 lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-12 text-xs md:text-sm text-slate-800 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-xs">
                ⌘K
              </kbd>
            </div>

            {/* Quick Action Button */}
            <NavLink
              to="/pos"
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>New POS Order</span>
            </NavLink>

            {/* Notifications Popover */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        2 New
                      </span>
                    </div>
                    <button className="text-xs text-blue-600 hover:underline">Mark read</button>
                  </div>
                  <div className="mt-2 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {mockNotifications.map((n) => (
                      <div key={n.id} className="py-2.5 flex items-start gap-3 hover:bg-slate-50 rounded-lg p-1.5 transition">
                        <div className="mt-0.5 rounded-full bg-blue-50 p-1.5 text-blue-600 shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-800">{n.title}</p>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* User Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-sm font-semibold text-white shadow-sm">
                    BA
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    Biruk Admin
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    Super Manager
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">Biruk Admin</p>
                    <p className="text-[11px] text-slate-500 truncate">admin@rbms-restaurant.com</p>
                  </div>
                  <div className="py-1 space-y-0.5">
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                      <User className="h-4 w-4 text-slate-400" />
                      <span>My Profile</span>
                    </button>
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                      <Settings className="h-4 w-4 text-slate-400" />
                      <span>Store Settings</span>
                    </button>
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      <span>Audit Logs</span>
                    </button>
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition">
                      <LogOut className="h-4 w-4 text-rose-500" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;