import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { usePaper } from "../hooks/usePaper";
import { useBackendStatus } from "../hooks/useBackendStatus";
import type { EquityPoint } from "../types/paper";

type Props = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  children: ReactNode;
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtUSDShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const icons = {
  home: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
    </svg>
  ),
  dashboard: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  wallet: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5z M16 12.5h3" />
    </svg>
  ),
  news: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M3 5h15v14H3z M18 8h3v9a2 2 0 0 1-2 2 M7 9h7M7 13h7M7 17h4" />
    </svg>
  ),
  chart: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M3 17l5-5 4 4 8-9 M14 7h6v6" />
    </svg>
  ),
  portfolio: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M3 7h18v12H3z M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  backtest: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  orders: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3 M9 3h6a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M9 12h6M9 16h4" />
    </svg>
  ),
  settings: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  sun: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  ),
  moon: (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
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
  arrowUpRight: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M7 17 17 7M9 7h8v8" />
    </svg>
  ),
  arrowDownRight: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M7 7l10 10M17 7v10H7" />
    </svg>
  ),
  logo: (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 3v18h18 M7 12v6 M12 8v10 M17 4v14" />
    </svg>
  ),
};

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const w = 120, h = 32;
  if (points.length < 2) return null;
  const min   = Math.min(...points);
  const max   = Math.max(...points);
  const range = max - min || 1;
  const step  = w / (points.length - 1);
  const path  = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - ((p - min) / range) * (h - 6) - 3}`)
    .join(" ");
  const area  = `${path} L ${w} ${h} L 0 ${h} Z`;
  const color = positive ? "#16a34a" : "#dc2626";
  const gradId = `spark-grad-${positive ? "up" : "down"}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} stroke={color} strokeWidth={1.5} fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Portfolio card / chip — wired to real usePaper data ───────────────────────
function PortfolioCardExpanded({
  totalUSD, changePct, equityPoints,
}: { totalUSD: number | null; changePct: number | null; equityPoints: EquityPoint[] }) {
  const positive = (changePct ?? 0) >= 0;

  // Normalize equity values to 0..1 for the sparkline
  const sparkline = (() => {
    if (equityPoints.length < 2) return [];
    const vals = equityPoints.map((p) => p.value);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const rng  = max - min || 1;
    return vals.map((v) => (v - min) / rng);
  })();

  if (totalUSD == null) {
    return (
      <div className="mx-3 mb-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-1">Portfolio value</div>
        <div className="h-7 w-28 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mb-1" />
        <div className="h-8 w-full rounded bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
      </div>
    );
  }

  const [whole, decimals] = fmtUSD(totalUSD).split(".");
  return (
    <div className="mx-3 mb-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
          Paper portfolio
        </div>
        {changePct != null && (
          <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-semibold rounded-full px-1.5 py-0.5 ${
            positive
              ? "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40"
              : "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40"
          }`}>
            {positive ? icons.arrowUpRight : icons.arrowDownRight}
            {positive ? "+" : ""}{changePct.toFixed(2)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight mt-1 text-slate-900 dark:text-white">
        {whole}
        <span className="text-slate-400 dark:text-slate-500 font-medium">.{decimals}</span>
      </div>
      <div className="-mx-0.5 mt-1">
        {sparkline.length >= 2
          ? <Sparkline points={sparkline} positive={positive} />
          : <div className="h-8 flex items-center justify-center text-[10px] text-slate-300 dark:text-slate-600">no trade history yet</div>
        }
      </div>
      <div className="flex justify-between text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
        <span>first trade</span>
        <span>now</span>
      </div>
    </div>
  );
}

function PortfolioChipCollapsed({
  totalUSD, changePct,
}: { totalUSD: number | null; changePct: number | null }) {
  const positive = (changePct ?? 0) >= 0;
  const display  = totalUSD != null ? fmtUSDShort(totalUSD) : "…";
  const pctLabel = changePct != null ? `${positive ? "+" : ""}${changePct.toFixed(1)}%` : "";
  return (
    <div
      title={totalUSD != null ? `Total ${fmtUSD(totalUSD)} · ${pctLabel} return` : "Loading…"}
      className="mx-2 mb-2.5 py-2 rounded-[10px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-0.5"
    >
      <div className="font-mono text-xs font-semibold tracking-tight text-slate-900 dark:text-white">
        {display}
      </div>
      {changePct != null && (
        <div className={`text-[10px] font-semibold inline-flex items-center gap-0.5 ${
          positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        }`}>
          {positive ? icons.arrowUpRight : icons.arrowDownRight}
          {pctLabel}
        </div>
      )}
    </div>
  );
}

// ── Nav components ────────────────────────────────────────────────────────────
type NavItemProps = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  collapsed: boolean;
  badge?: ReactNode;
};

function NavItem({ to, label, icon, end, collapsed, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        collapsed
          ? [
              "relative mx-2.5 h-12 rounded-lg flex items-center justify-center transition-colors duration-150 select-none border-none no-underline",
              isActive
                ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200",
            ].join(" ")
          : [
              "relative flex items-center gap-3 px-[18px] py-5 text-[17px] transition-colors duration-150 select-none border-none no-underline",
              isActive
                ? "text-slate-900 dark:text-white font-semibold bg-gradient-to-r from-blue-500/10 to-transparent dark:from-blue-400/15"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200 font-medium",
            ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden
              className={
                collapsed
                  ? "absolute -left-2.5 top-2 bottom-2 w-[3px] rounded-r bg-blue-600 dark:bg-blue-400"
                  : "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-blue-600 dark:bg-blue-400"
              }
            />
          )}
          <span className={`flex-shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
            {icon}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1">{label}</span>
              {badge}
            </>
          )}
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
        className="relative mx-2.5 h-11 w-auto rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
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
        className="w-full flex items-center gap-3 px-[18px] py-5 text-[17px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200 transition-colors duration-150 select-none"
      >
        <span className="flex-shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className={`transition-transform duration-200 text-slate-400 dark:text-slate-500 ${open ? "rotate-180" : ""}`}>
          {icons.chevronDown}
        </span>
      </button>
      {open && (
        <div className="mt-0.5 mb-1 ml-[42px] mr-3 space-y-0.5">
          {children.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              className={({ isActive }) =>
                `block px-2.5 py-1 rounded-md text-[13px] transition-colors duration-150 border-none no-underline ${
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
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("gostock.sidebar.collapsed") === "1";
  });
  useEffect(() => {
    window.localStorage.setItem("gostock.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const sidebarRef = useRef<HTMLDivElement>(null);

  const { toggleColorScheme } = useMantineColorScheme();
  const computedScheme        = useComputedColorScheme("light");
  const isDark                = computedScheme === "dark";

  // Real portfolio data
  const { portfolio, equity } = usePaper();
  const totalUSD   = portfolio?.total_value ?? null;
  const changePct  = portfolio
    ? ((portfolio.total_value - portfolio.starting_cash) / portfolio.starting_cash * 100)
    : null;

  // Backend health banner
  const backendStatus = useBackendStatus();

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
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 lg:gap-3">

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        style={{ width: collapsed ? 68 : 240 }}
        className={[
          "fixed z-50 left-0 top-0 h-screen flex flex-col",
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800",
          "transition-all duration-200 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:sticky lg:top-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-4 py-4 ${collapsed ? "justify-center" : ""}`}>
          <div className="h-[30px] w-[30px] rounded-lg bg-slate-900 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
            {icons.logo}
          </div>
          {!collapsed && <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">Trading Hub</span>}
        </div>

        {/* Portfolio card — real data */}
        {collapsed
          ? <PortfolioChipCollapsed totalUSD={totalUSD} changePct={changePct} />
          : <PortfolioCardExpanded  totalUSD={totalUSD} changePct={changePct} equityPoints={equity} />
        }

        {/* Nav */}
        <nav className="overflow-y-auto py-2">

          <NavItem to="/dashboard" label="Dashboard" icon={icons.dashboard} collapsed={collapsed} />
          <NavItem to="/news"      label="News"      icon={icons.news}      collapsed={collapsed} />

          {/* Divider */}
          <div className={`h-px bg-slate-200 dark:bg-slate-800 my-2 ${collapsed ? "mx-4" : "mx-[18px]"}`} />

          <NavItem to="/portfolio" label="Portfolio" icon={icons.portfolio} collapsed={collapsed} />
          <NavItem to="/backtest"  label="Backtest"  icon={icons.backtest}  collapsed={collapsed} />

        </nav>

        <div className="pb-2 border-t border-slate-100 dark:border-slate-800 pt-2">
          <NavItem to="/settings" label="Settings" icon={icons.settings} collapsed={collapsed} />
        </div>


        {/* Footer: dark mode + collapse */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-1 pb-2">
          <button
            onClick={() => toggleColorScheme()}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ appearance: "none", border: "none", background: "none", outline: "none" }}
            className={`flex items-center gap-3 w-full px-[18px] py-5 text-[17px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer ${collapsed ? "justify-center" : ""}`}
          >
            {isDark ? icons.sun : icons.moon}
            {!collapsed && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{ appearance: "none", border: "none", background: "none", outline: "none" }}
            className={`hidden lg:flex items-center gap-3 w-full px-[18px] py-5 text-[17px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer ${collapsed ? "justify-center" : ""}`}
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
              <strong>Backend offline</strong> — prices and portfolio data won't update. The server may be starting up, please wait a moment.
            </span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
