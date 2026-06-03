import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { usePaper } from "../hooks/usePaper";
import { useBackendStatus } from "../hooks/useBackendStatus";

type Props = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  children: ReactNode;
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const icons = {
  home: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  dashboard: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  wallet: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  news: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  chart: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  portfolio: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  orders: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  settings: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  sun: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  ),
  moon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
};

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="mx-3 my-2 border-t border-slate-100 dark:border-slate-700" />;
  return (
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
      {label}
    </p>
  );
}

function Badge({ count, color = "red" }: { count: number; color?: "red" | "blue" }) {
  const bg = color === "blue" ? "bg-blue-500" : "bg-red-500";
  return (
    <span className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full ${bg} text-white text-[10px] font-bold leading-none`}>
      {count}
    </span>
  );
}

type NavItemProps = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  badge?: { count: number; color?: "red" | "blue" };
  collapsed: boolean;
};

function NavItem({ to, label, icon, end, badge, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-lg transition-colors duration-150 select-none",
          collapsed ? "justify-center px-0 py-2.5 mx-auto w-10" : "px-3 py-2",
          isActive
            ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 font-medium",
        ].join(" ")
      }
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-sm">{label}</span>
          {badge && badge.count > 0 && <Badge count={badge.count} color={badge.color} />}
        </>
      )}
    </NavLink>
  );
}

type GroupItemProps = {
  label: string;
  icon: ReactNode;
  children: { label: string; to: string }[];
  collapsed: boolean;
};

function GroupItem({ label, icon, children, collapsed }: GroupItemProps) {
  const [open, setOpen] = useState(false);

  if (collapsed) {
    return (
      <button
        title={label}
        className="flex justify-center items-center w-10 mx-auto py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {icon}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors duration-150 select-none"
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          {icons.chevronDown}
        </span>
      </button>
      {open && (
        <div className="mt-0.5 ml-8 space-y-0.5">
          {children.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded-md text-sm transition-colors duration-150 ${
                  isActive
                    ? "text-slate-900 dark:text-white font-semibold"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                }`
              }
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────
export default function AppShell({ sidebarOpen, setSidebarOpen, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const { toggleColorScheme } = useMantineColorScheme();
  const computedScheme        = useComputedColorScheme("light");
  const isDark                = computedScheme === "dark";

  const { portfolio }   = usePaper();
  const backendStatus   = useBackendStatus();
  const totalValue  = portfolio?.total_value   ?? null;
  const returnPct   = portfolio
    ? ((portfolio.total_value - portfolio.starting_cash) / portfolio.starting_cash * 100)
    : null;
  const isUp = (returnPct ?? 0) >= 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!sidebarOpen) return;
      if (sidebarRef.current?.contains(e.target as Node)) return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setSidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        style={{ width: collapsed ? 68 : 224 }}
        className={[
          "fixed z-50 left-0 top-0 h-screen flex flex-col",
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800",
          "transition-all duration-200 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:sticky lg:top-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-800 ${collapsed ? "justify-center" : ""}`}>
          <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          {!collapsed && <span className="font-semibold text-slate-900 dark:text-white">GoStock</span>}
        </div>

        {/* Investment card */}
        {!collapsed && (
          <div className="mx-3 mt-4">
            <div className="rounded-xl bg-slate-900 dark:bg-slate-800 px-4 py-4 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
              <p className="relative text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-1">Paper Portfolio</p>
              <p className="relative text-xl font-bold text-white mb-1.5">
                {totalValue != null
                  ? `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : "Loading…"}
              </p>
              {returnPct != null && (
                <div className="relative flex items-center gap-1">
                  <svg
                    className={`w-3 h-3 ${isUp ? "text-emerald-400" : "text-red-400"}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d={isUp ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
                  </svg>
                  <span className={`text-xs font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                    {isUp ? "+" : ""}{returnPct.toFixed(2)}%
                  </span>
                  <span className="text-slate-500 text-xs ml-1">return</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <SectionLabel label="Main" collapsed={collapsed} />
          <NavItem to="/home"      label="Home"      icon={icons.home}      end collapsed={collapsed} />
          <NavItem to="/dashboard" label="Dashboard" icon={icons.dashboard}     collapsed={collapsed} />
          <NavItem to="/wallet"    label="Wallet"    icon={icons.wallet}        collapsed={collapsed} />
          <NavItem to="/news"      label="News"      icon={icons.news}          collapsed={collapsed} />

          <SectionLabel label="Markets" collapsed={collapsed} />
          <GroupItem
            label="Stocks & Funds"
            icon={icons.chart}
            collapsed={collapsed}
            children={[
              { label: "Equities", to: "/stock-fund/equities" },
              { label: "Crypto",   to: "/stock-fund/crypto"   },
              { label: "Funds",    to: "/stock-fund/funds"    },
              { label: "Bonds",    to: "/stock-fund/bonds"    },
            ]}
          />
          <NavItem to="/portfolio" label="Portfolio" icon={icons.portfolio} collapsed={collapsed} />
          <NavItem to="/backtest"  label="Backtest"  icon={icons.chart}     collapsed={collapsed} />
          <NavItem to="/orders"    label="Orders"    icon={icons.orders}    collapsed={collapsed} />

          <SectionLabel label="Support" collapsed={collapsed} />
          <NavItem to="/settings"  label="Settings"  icon={icons.settings}  collapsed={collapsed} />
        </nav>

        {/* Bottom: dark mode toggle + collapse */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-3 space-y-1">
          {/* Dark mode toggle */}
          <button
            onClick={() => toggleColorScheme()}
            className={`flex items-center gap-2 w-full rounded-lg px-2 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${collapsed ? "justify-center" : ""}`}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? icons.sun : icons.moon}
            {!collapsed && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex items-center gap-2 w-full rounded-lg px-2 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <span className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}>
              {icons.chevronLeft}
            </span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Backend offline banner */}
        {backendStatus === "offline" && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>
              <strong>Backend offline</strong> — prices and portfolio data won't update. Make sure uvicorn is running on port 8001.
            </span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
