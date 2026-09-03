import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../config/permissions";
import { useRestaurant } from "../context/RestaurantContext";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";
import audioService from "../services/audioService";

import {
  LayoutDashboard,
  Armchair,
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
  CheckCircle2,
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
  ClipboardList,
  Clock,
  ArrowLeftRight,
  AlertTriangle,
  Wallet,
  CreditCard,
  Volume2,
  VolumeX,
  Palette,
} from "lucide-react";

/* =========================================================
   MAIN NAVIGATION
========================================================= */

const navigationGroups = [
  {
    title: "Overview",

    items: [
      {
        name: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard.view",
      },
    ],
  },

  {
    title: "Operations",

    items: [
      {
        name: "POS & Sales",
        icon: ShoppingCart,
        permission: "pos.view",

        children: [
          {
            name: "POS Terminal",
            path: "/pos",
            icon: ShoppingCart,
          },
          {
            name: "My Served Orders",
            path: "/pos/served-orders",
            icon: CheckCircle2,
          },
          {
            name: "Attendance Terminal",
            path: "/employees/attendance",
            icon: UserCheck,
          },
          {
            name: "Daily Sales Audit",
            path: "/pos/sales-audit",
            icon: Receipt,
          },
          {
            name: "Cashier Reconciliation",
            path: "/finance/cashier-reconciliation",
            icon: CreditCard,
          },
          {
            name: "POS Reports",
            path: "/pos/reports",
            icon: BarChart3,
          },
        ],
      },

      {
        name: "Kitchen",
        icon: Flame,
        permission: "kitchen.view",

        children: [
          {
            name: "Kitchen Display (KDS)",
            path: "/kitchen",
            icon: Flame,
          },
          {
            name: "Live Kitchen Assets",
            path: "/kitchen/assets",
            icon: Package,
          },
          {
            name: "Kitchen Reports",
            path: "/kitchen/reports",
            icon: BarChart3,
          },
        ],
      },

      {
        name: "Bar",
        icon: Wine,
        permission: "bar.view",

        children: [
          {
            name: "Bar Display",
            path: "/bar",
            icon: Wine,
          },
          {
            name: "Bar Reports",
            path: "/bar/reports",
            icon: BarChart3,
          },
        ],
      },

      {
        name: "Tables & Seating",
        path: "/tables",
        icon: Armchair,
        permission: "tables.view",
      },
    ],
  },

  {
    title: "Management",

    items: [
      {
        name: "Finance",
        icon: Wallet,
        permission: "finance.view",

        children: [
          {
            name: "Cashier Reconciliation",
            path: "/finance/cashier-reconciliation",
            icon: CreditCard,
          },
          {
            name: "Purchases Audit",
            path: "/finance/purchases",
            icon: ShoppingBag,
          },
          {
            name: "Expenses",
            path: "/finance/expenses",
            icon: Receipt,
          },
          {
            name: "Reports",
            path: "/finance/reports",
            icon: BarChart3,
          },
        ],
      },

      {
        name: "Inventory",
        icon: Boxes,
        permission: "inventory.view",

        children: [
          {
            name: "Inventory Dashboard",
            path: "/inventory",
            icon: Boxes,
          },
          {
            name: "Stock Levels",
            path: "/inventory/stock",
            icon: Package,
          },
          {
            name: "Low Stock Alerts",
            path: "/inventory/low-stock",
            icon: AlertTriangle,
          },
          {
            name: "Stock Movements",
            path: "/inventory/transactions",
            icon: ArrowLeftRight,
          },
          {
            name: "Inventory Reports",
            path: "/inventory/reports",
            icon: BarChart3,
          },
        ],
      },

      {
        name: "Purchasing",
        icon: ShoppingBag,
        permission: "purchasing.view",

        children: [
          {
            name: "Purchase Orders",
            path: "/purchasing",
            icon: ShoppingBag,
          },
        ],
      },

      {
        name: "Products & Catalog",
        path: "/products",
        icon: Package,
        permission: "products.view",
      },

      {
        name: "VIP & Customers",
        path: "/customers",
        icon: Users,
        permission: "customers.view",
      },
    ],
  },

  {
    title: "Administration",

    items: [
      {
        name: "Human Resources",
        icon: UserCheck,
        permission: "employees.view",

        children: [
          {
            name: "Employee Directory",
            path: "/employees",
            icon: UserCheck,
          },
          {
            name: "Attendance Log",
            path: "/employees/attendance",
            icon: Clock,
          },
        ],
      },

      {
        name: "Company Expenses",
        path: "/expenses",
        icon: Receipt,
        permission: "expenses.view",
      },

      {
        name: "Executive Reports",
        path: "/reports",
        icon: BarChart3,
        permission: "reports.view",
      },
    ],
  },
];

/* =========================================================
   COMPONENT
========================================================= */

function DashboardLayout() {
  const {
    notifications = [],
    markNotificationAsRead,
    clearNotifications,
  } = useRestaurant();

  const { user, logout } = useAuth();

  const location = useLocation();

  /* =========================================================
     USER INFORMATION
  ========================================================= */

  /*
    Backend returns:

    {
      username: "testuser",
      email: "test@rbms.com",
      role: "waiter"
    }

    Frontend uses uppercase roles:

    WAITER
    ADMIN
    MANAGER
    etc.
  */

  const normalizedRole = user?.role?.toUpperCase() || "USER";

  const displayName =
    user?.name ||
    user?.username ||
    "User";

  const userInitials = displayName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  /* =========================================================
     STATE
  ========================================================= */

  const { currentTheme, setCurrentTheme, activePreset, THEME_PRESETS } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [showUserMenu, setShowUserMenu] =
    useState(false);

  const [showThemeMenu, setShowThemeMenu] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [soundMuted, setSoundMuted] =
    useState(!audioService.isAudioEnabled());

  const [openMenus, setOpenMenus] =
    useState({});

  const notificationsRef = useRef(null);

  const userMenuRef = useRef(null);

  const themeMenuRef = useRef(null);

  /* =========================================================
     AUTOMATICALLY OPEN MENU BASED ON CURRENT URL
  ========================================================= */

  useEffect(() => {
    const path = location.pathname;

    const menusToOpen = {};

    navigationGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (!item.children) return;

        const isInside = item.children.some(
          (child) =>
            path === child.path ||
            path.startsWith(child.path + "/")
        );

        if (isInside) {
          menusToOpen[item.name] = true;
        }
      });
    });

    if (Object.keys(menusToOpen).length === 0) {
      return;
    }

    setOpenMenus((previous) => {
      const hasChanges = Object.entries(menusToOpen).some(
        ([key, value]) => previous[key] !== value
      );

      if (!hasChanges) {
        return previous;
      }

      return {
        ...previous,
        ...menusToOpen,
      };
    });
  }, [location.pathname]);

  /* =========================================================
     TOGGLE SIDEBAR MENU
  ========================================================= */

  const toggleMenu = (name) => {
    setOpenMenus((previous) => ({
      ...previous,
      [name]: !previous[name],
    }));
  };

  /* =========================================================
     CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
  ========================================================= */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }

      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(event.target)
      ) {
        setShowThemeMenu(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* =========================================================
     CLOSE MOBILE SIDEBAR WHEN ROUTE CHANGES
  ========================================================= */

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  /* =========================================================
     CURRENT PAGE
  ========================================================= */

  const currentPath = location.pathname;

  let activeItemName = "Dashboard";

  let activeGroupTitle = "Overview";

  for (const group of navigationGroups) {
    for (const item of group.items) {
      if (item.path === currentPath) {
        activeItemName = item.name;

        activeGroupTitle = group.title;
      }

      if (item.children) {
        const child = item.children.find(
          (childItem) =>
            childItem.path === currentPath
        );

        if (child) {
          activeItemName = child.name;

          activeGroupTitle = item.name;
        }
      }
    }
  }

  /* =========================================================
     VISIBLE NAVIGATION
  ========================================================= */

  const visibleNavigationGroups =
    navigationGroups
      .map((group) => {
        const visibleItems = group.items
          .filter((item) => {
            /*
              ADMIN should see everything.
            */
            if (normalizedRole === "ADMIN") {
              return true;
            }

            /*
              WAITER restricted items (Allow POS & Served Orders)
            */
            if (normalizedRole === "WAITER") {
              if (
                item.path === "/tables" ||
                item.permission === "tables.view"
              ) {
                return false;
              }
            }

            /*
              CASHIER restricted items (Hide Finance sidebar)
            */
            if (normalizedRole === "CASHIER") {
              if (
                item.name === "Finance" ||
                item.permission === "finance.view" ||
                item.path === "/finance" ||
                item.path?.startsWith("/finance") ||
                item.path === "/tables" ||
                item.permission === "tables.view"
              ) {
                return false;
              }
            }

            /*
              Dashboard is strictly for ADMIN and MANAGER only.
            */

            if (item.path === "/dashboard") {
              return (
                normalizedRole === "ADMIN" ||
                normalizedRole === "MANAGER"
              );
            }

            /*
              Normal permission checking.
            */

            if (!item.permission) {
              return false;
            }

            return hasPermission(
              normalizedRole,
              item.permission
            );
          })
          .map((item) => {
            if (item.children) {
              const visibleChildren = item.children.filter((child) => {
                if (normalizedRole === "WAITER") {
                  const hiddenWaiterPaths = [
                    "/employees/attendance",
                    "/pos/sales-audit",
                    "/pos/tables",
                    "/finance/cashier-reconciliation",
                    "/pos/reports",
                    "/tables",
                  ];
                  if (hiddenWaiterPaths.includes(child.path)) {
                    return false;
                  }
                }
                if (normalizedRole === "CASHIER") {
                  if (
                    child.path?.startsWith("/finance") ||
                    child.path === "/pos/tables" ||
                    child.path === "/tables"
                  ) {
                    return false;
                  }
                }
                return true;
              });
              return { ...item, children: visibleChildren };
            }
            if (item.path === "/dashboard") {
              return {
                ...item,
                name: normalizedRole === "ADMIN" ? "Executive Live Command" : "Manager Dashboard",
              };
            }
            return item;
          })
          .filter((item) => !item.children || item.children.length > 0);

        return {
          ...group,
          items: visibleItems,
        };
      })
      .filter(
        (group) => group.items.length > 0
      );

  /* =========================================================
     UNREAD NOTIFICATIONS
  ========================================================= */

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-800 antialiased">

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() =>
            setIsMobileOpen(false)
          }
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`
          fixed
          top-0
          bottom-0
          left-0
          z-50
          flex
          flex-col
          ${activePreset.sidebarBg}
          text-slate-300
          transition-all
          duration-300

          ${
            isCollapsed
              ? "lg:w-16"
              : "lg:w-56"
          }

          ${
            isMobileOpen
              ? "translate-x-0 w-56 max-w-[80vw] shadow-2xl"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >

        {/* ===================================================
            BRAND
        =================================================== */}

        <div className="flex h-20 shrink-0 items-center justify-between px-4 border-b border-white/10">

          <div className="flex items-center gap-3 overflow-hidden">

            <img
              src="/oak-club-logo.png"
              alt="The Oak Club"
              className="h-10 w-auto shrink-0 object-contain drop-shadow-md"
            />

            {!isCollapsed && (
              <div>

                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg text-white tracking-wide">
                    THE OAK CLUB
                  </span>
                </div>

                <span className={`text-[11px] font-semibold ${activePreset.accentText}`}>
                  Club & Lounge
                </span>

              </div>
            )}

          </div>

          <button
            onClick={() =>
              setIsMobileOpen(false)
            }
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* ===================================================
            NAVIGATION
        =================================================== */}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">

          {visibleNavigationGroups.map(
            (group) => (

              <div
                key={group.title}
                className="space-y-1"
              >

                {!isCollapsed && (
                  <h3 className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                    {group.title}
                  </h3>
                )}

                {group.items.map(
                  (item) => {

                    const Icon = item.icon;

                    /* =========================================
                       ITEM WITH CHILDREN
                    ========================================= */

                    if (item.children) {

                      const isOpen =
                        openMenus[item.name];

                      const isChildActive =
                        item.children.some(
                          (child) =>
                            location.pathname ===
                              child.path ||
                            location.pathname.startsWith(
                              child.path + "/"
                            )
                        );

                      return (
                        <div
                          key={item.name}
                        >

                          {/* Parent */}

                          <button
                            onClick={() =>
                              toggleMenu(
                                item.name
                              )
                            }
                            title={
                              isCollapsed
                                ? item.name
                                : undefined
                            }
                            className={`
                              w-full
                              group
                              flex
                              items-center
                              gap-3
                              rounded-xl
                              px-3
                              py-2.5
                              text-sm
                              font-medium
                              transition-all

                              ${
                                isChildActive
                                  ? activePreset.activeSubLink
                                  : "text-slate-300 hover:bg-white/10 hover:text-white"
                              }

                              ${
                                isCollapsed
                                  ? "justify-center px-0"
                                  : ""
                              }
                            `}
                          >

                            <Icon className="h-5 w-5 shrink-0" />

                            {!isCollapsed && (
                              <>
                                <span className="flex-1 text-left">
                                  {item.name}
                                </span>

                                <ChevronDown
                                  className={`
                                    h-4
                                    w-4
                                    transition-transform

                                    ${
                                      isOpen
                                        ? "rotate-180"
                                        : ""
                                    }
                                  `}
                                />
                              </>
                            )}

                          </button>

                          {/* Children */}

                          {!isCollapsed &&
                            isOpen && (
                              <div className="ml-5 mt-1 space-y-1 border-l border-white/10 pl-3">

                                {item.children.map(
                                  (child) => {

                                    const ChildIcon =
                                      child.icon;

                                    return (
                                      <NavLink
                                        key={
                                          child.path
                                        }
                                        to={
                                          child.path
                                        }
                                        end
                                        className={({
                                          isActive,
                                        }) =>
                                          `
                                          flex
                                          items-center
                                          gap-3
                                          rounded-lg
                                          px-3
                                          py-2
                                          text-xs
                                          font-medium
                                          transition

                                          ${
                                            isActive
                                              ? activePreset.activeLink
                                              : "text-slate-400 hover:bg-white/10 hover:text-white"
                                          }
                                          `
                                        }
                                      >

                                        <ChildIcon className="h-4 w-4" />

                                        <span>
                                          {
                                            child.name
                                          }
                                        </span>

                                      </NavLink>
                                    );
                                  }
                                )}

                              </div>
                            )}

                        </div>
                      );
                    }

                    /* =========================================
                       NORMAL ITEM
                    ========================================= */

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end
                        title={
                          isCollapsed
                            ? item.name
                            : undefined
                        }
                        className={({
                          isActive,
                        }) =>
                          `
                          group
                          flex
                          items-center
                          gap-3
                          rounded-xl
                          px-3
                          py-2.5
                          text-sm
                          font-medium
                          transition-all

                          ${
                            isActive
                              ? activePreset.activeLink
                              : "text-slate-300 hover:bg-white/10 hover:text-white"
                          }

                          ${
                            isCollapsed
                              ? "justify-center px-0"
                              : ""
                          }
                          `
                        }
                      >

                        <Icon className="h-5 w-5 shrink-0" />

                        {!isCollapsed && (
                          <span className="flex-1 truncate">
                            {item.name}
                          </span>
                        )}

                      </NavLink>
                    );
                  }
                )}

              </div>
            )
          )}

        </nav>

        {/* ===================================================
            SIDEBAR FOOTER
        =================================================== */}

        <div className="hidden lg:flex shrink-0 items-center justify-between p-3 border-t border-slate-800">

          {!isCollapsed && (
            <div className="flex items-center gap-2.5 px-2">

              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />

              <span className="text-xs font-medium text-slate-400">
                Store #1 Online
              </span>

            </div>
          )}

          <button
            onClick={() =>
              setIsCollapsed(
                !isCollapsed
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors mx-auto"
          >

            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}

          </button>

        </div>

      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div
        className={`
          flex
          min-h-screen
          min-w-0
          flex-1
          flex-col
          transition-all
          duration-300

          ${
            isCollapsed
              ? "lg:ml-16"
              : "lg:ml-56"
          }
        `}
      >

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 md:px-6 backdrop-blur-md">

          {/* LEFT */}

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                setIsMobileOpen(true)
              }
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm">

              <span className="hidden sm:inline font-semibold text-slate-500">
                {activeGroupTitle}
              </span>

              <span className="hidden sm:inline text-slate-400 font-bold">
                /
              </span>

              <span className="font-bold text-blue-950 text-base md:text-lg">
                {activeItemName}
              </span>

            </div>

          </div>

          {/* RIGHT */}

          <div className="flex items-center gap-2.5 md:gap-4">

            {/* SEARCH */}

            <div className="relative hidden md:block w-56 lg:w-72">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search orders, items..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-12 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

            </div>

            {/* =================================================
                SOUND CHIME TOGGLE
            ================================================= */}

            <button
              onClick={() => {
                const enabled = audioService.toggleAudio();
                if (enabled) audioService.playNewOrderSound();
                setSoundMuted(!enabled);
              }}
              title={soundMuted ? "Unmute Order Sounds" : "Mute Order Sounds"}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 transition"
            >
              {soundMuted ? (
                <VolumeX className="h-5 w-5 text-rose-500" />
              ) : (
                <Volume2 className="h-5 w-5 text-emerald-600" />
              )}
            </button>

            {/* =================================================
                THEME COLOR PALETTE SELECTOR
            ================================================= */}

            <div className="relative" ref={themeMenuRef}>
              <button
                onClick={() => setShowThemeMenu((prev) => !prev)}
                title={`Theme Color: ${activePreset.name}`}
                className="flex items-center gap-1.5 rounded-xl p-2 text-slate-600 hover:bg-slate-100 transition border border-slate-200/60 bg-slate-50/50"
              >
                <Palette className="h-5 w-5 text-blue-600" />
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm"
                  style={{ backgroundColor: activePreset.colorHex }}
                />
              </button>

              {showThemeMenu && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Palette className="h-4 w-4 text-blue-600" />
                      Theme Color Palette
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400">Live Switch</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {THEME_PRESETS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setCurrentTheme(t.id);
                          setShowThemeMenu(false);
                        }}
                        className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-semibold transition ${
                          currentTheme === t.id
                            ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm font-bold"
                            : "border-slate-100 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0 shadow-sm ring-1 ring-black/10"
                          style={{ backgroundColor: t.colorHex }}
                        />
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <div
              className="relative"
              ref={notificationsRef}
            >

              <button
                onClick={() =>
                  setShowNotifications(
                    (prev) => !prev
                  )
                }
                className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100"
              >

                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}

              </button>

              {showNotifications && (
                <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

                  {/* Header */}

                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">

                    <div>

                      <h3 className="text-sm font-semibold text-slate-900">
                        Notifications
                      </h3>

                      <p className="text-[10px] text-slate-400">
                        {unreadCount} unread
                      </p>

                    </div>

                    {notifications.length >
                      0 && (
                      <button
                        onClick={
                          clearNotifications
                        }
                        className="text-[10px] font-medium text-blue-600 hover:text-blue-700"
                      >
                        Clear all
                      </button>
                    )}

                  </div>

                  {/* Notification List */}

                  <div className="max-h-96 overflow-y-auto">

                    {notifications.length ===
                    0 ? (
                      <div className="flex flex-col items-center justify-center px-4 py-10">

                        <Bell className="mb-2 h-8 w-8 text-slate-300" />

                        <p className="text-xs font-medium text-slate-500">
                          No notifications
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          New kitchen activity
                          will appear here.
                        </p>

                      </div>
                    ) : (
                      notifications.map(
                        (notification) => (

                          <button
                            key={
                              notification.id
                            }
                            onClick={() =>
                              markNotificationAsRead(
                                notification.id
                              )
                            }
                            className={`
                              flex
                              w-full
                              gap-3
                              border-b
                              border-slate-100
                              px-4
                              py-3
                              text-left
                              transition
                              hover:bg-slate-50

                              ${
                                notification.read
                                  ? "bg-white"
                                  : "bg-blue-50/50"
                              }
                            `}
                          >

                            {/* Icon */}

                            <div
                              className={`
                                mt-0.5
                                flex
                                h-8
                                w-8
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg

                                ${
                                  notification.type ===
                                  "ready"
                                    ? "bg-green-100 text-green-600"
                                    : "bg-blue-100 text-blue-600"
                                }
                              `}
                            >

                              {notification.type ===
                              "ready" ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <ClipboardList className="h-4 w-4" />
                              )}

                            </div>

                            {/* Content */}

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-2">

                                <p
                                  className={`
                                    text-xs

                                    ${
                                      notification.read
                                        ? "font-medium text-slate-700"
                                        : "font-bold text-slate-900"
                                    }
                                  `}
                                >
                                  {
                                    notification.title
                                  }
                                </p>

                                {!notification.read && (
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                                )}

                              </div>

                              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                {
                                  notification.message
                                }
                              </p>

                              <p className="mt-1 text-[10px] text-slate-400">

                                {notification.createdAt
                                  ? new Date(
                                      notification.createdAt
                                    ).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )
                                  : "Just now"}

                              </p>

                            </div>

                          </button>

                        )
                      )
                    )}

                  </div>

                </div>
              )}

            </div>

            {/* DIVIDER */}

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* =================================================
                USER MENU
            ================================================= */}

            <div
              className="relative"
              ref={userMenuRef}
            >

              <button
                onClick={() =>
                  setShowUserMenu(
                    (prev) => !prev
                  )
                }
                className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-slate-100"
              >

                {/* Avatar */}

                <div className="relative">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-sm font-semibold text-white">

                    {userInitials}

                  </div>

                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />

                </div>

                {/* User information */}

                <div className="hidden md:flex flex-col">

                  <span className="text-xs font-bold text-slate-900">
                    {displayName}
                  </span>

                  <span className="text-[11px] text-slate-500">
                    {normalizedRole}
                  </span>

                </div>

                <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />

              </button>

              {/* USER DROPDOWN */}

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">

                  {/* User info */}

                  <div className="px-3 py-2 border-b border-slate-100">

                    <p className="text-xs font-bold text-slate-900">
                      {displayName}
                    </p>

                    <p className="text-[11px] text-slate-500 truncate">
                      {user?.email ||
                        "No email"}
                    </p>

                    <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                      {normalizedRole}
                    </span>

                  </div>

                  {/* Menu */}

                  <div className="py-1">

                    <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">

                      <User className="h-4 w-4 text-slate-400" />

                      My Profile

                    </button>

                    <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">

                      <Settings className="h-4 w-4 text-slate-400" />

                      Store Settings

                    </button>

                    <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">

                      <ShieldCheck className="h-4 w-4 text-slate-400" />

                      Audit Logs

                    </button>

                  </div>

                  {/* Logout */}

                  <div className="pt-1 border-t border-slate-100">

                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >

                      <LogOut className="h-4 w-4" />

                      Log Out

                    </button>

                  </div>

                </div>
              )}

            </div>

          </div>

        </header>

        {/* ===================================================
            BODY
        =================================================== */}

        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">

          <Outlet />

        </main>

      </div>

    </div>
  );
}

export default DashboardLayout;