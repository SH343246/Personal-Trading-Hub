import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

type Props = {
  open: boolean;
  onToggle: (v: boolean) => void;
};

type SideItemProps = {
  to: string;
  label: string;
  icon: ReactNode;
  badgeCount?: number;
  end?: boolean;
  expanded: boolean;
};

function SideItem(props: SideItemProps) {
  const base =
  "w-full flex items-center justify-between rounded-2xl border px-5 py-4 " +
  "!shadow-lg hover:!shadow-xl transition-all duration-200 ring-2 ring-transparent " +
  "backdrop-blur-md";

const idle =
  "bg-white !border-slate-200 text-slate-800 hover:bg-white/90";

const active =
  "bg-violet-100 !border-violet-300 text-violet-700 ring-violet-300";

  const labelCls = `text-base font-medium transition-all duration-300 ${props.expanded ? "opacity-100 w-auto" : "lg:opacity-0 lg:w-0 lg:overflow-hidden"}`;

  return (
    <NavLink
      to={props.to}
      end={props.end}
      className={({ isActive }) => (isActive ? base + " " + active : base + " " + idle)}
    >
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 flex items-center justify-center">{props.icon}</div>
        <span className={labelCls}>{props.label}</span>
      </div>
      {typeof props.badgeCount === "number" && props.badgeCount > 0 ? (
        <span className="min-w-6 h-6 px-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold">
          {props.badgeCount}
        </span>
      ) : null}
    </NavLink>
  );
}

function IconHome() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function IconNews() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function IconCog() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

export default function Sidebar({ open, onToggle }: Props) {
  const [expanded, setExpanded] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!open) return;
      if (!sidebarRef.current || !triggerRef.current) return;
      const t = e.target as Node;
      if (sidebarRef.current.contains(t) || triggerRef.current.contains(t)) return;
      onToggle(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open, onToggle]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggle(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onToggle]);

  return (
    <div className="min-w-fit">
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => onToggle(false)}
      />
      <aside
        id="sidebar"
        ref={sidebarRef}
        className={[
          "fixed z-50 left-0 top-0 h-screen lg:relative",
          expanded ? "w-72" : "w-72 lg:w-20",
          "shrink-0 bg-slate-50 border-r border-slate-200",
          "transition-all duration-300 ease-out", 
          open ? "translate-x-0" : "-translate-x-72",
          "lg:translate-x-0 flex flex-col",
        ].join(" ")}
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <NavLink to="/" end className="flex items-center gap-3" aria-label="Home">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span
                className={`font-bold text-2xl text-slate-900 transition-all duration-300 ${
                  expanded ? "opacity-100 w-auto" : "lg:opacity-0 lg:w-0 lg:overflow-hidden"
                }`}
              >
                GoStock teset
              </span>
            </NavLink>
            <button
              ref={triggerRef}
              className="lg:hidden text-slate-400 hover:text-slate-600 p-2"
              onClick={() => onToggle(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {expanded && (
          <div className="px-6 pt-6 lg:block hidden">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full"></div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full"></div>
              <div className="relative">
                <p className="text-slate-400 text-xs font-medium mb-1.5">Total Investment</p>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-white text-3xl font-bold tracking-tight">$5,380.90</h3>
                  <button className="text-slate-400 hover:text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="text-emerald-400 text-sm font-semibold">+18.10%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-5 py-6 space-y-3 overflow-y-auto">
          <SideItem to="/" label="Home" icon={<IconHome />} end expanded={expanded} />
          <SideItem to="/dashboard" label="Dashboard" icon={<IconGrid />} expanded={expanded} />
          <SideItem to="/portfolio" label="Wallet" icon={<IconWallet />} expanded={expanded} />
          <SideItem to="/news" label="News" icon={<IconNews />} expanded={expanded} />
          <SideItem to="/stock-fund" label="Stock & Fund" icon={<IconChart />} expanded={expanded} />
          
        </nav>

        <div className="p-4 space-y-2 border-t border-slate-100">
          <SideItem to="/community" label="Our Community" icon={<IconUsers />} expanded={expanded} />
          <SideItem to="/settings" label="Settings" icon={<IconCog />} badgeCount={6} expanded={expanded} />
          <SideItem to="/contact" label="Contact Us" icon={<IconPhone />} expanded={expanded} />
          <div className="hidden lg:block pt-2">
            <button
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-colors duration-150"
              onClick={() => setExpanded(!expanded)}
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span
                className={`text-sm font-medium transition-all duration-300 ${
                  expanded ? "opacity-100 w-auto" : "lg:opacity-0 lg:w-0 lg:overflow-hidden"
                }`}
              >
                Collapse
              </span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
