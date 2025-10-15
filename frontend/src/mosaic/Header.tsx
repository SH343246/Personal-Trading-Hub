// src/components/shell/Header.tsx
import React from "react";

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  variant?: "default" | "v2" | "v3";
};

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-base-100/90 backdrop-blur h-14 shadow-sm"> 

      <div className="px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <div className="flex items-center justify-between h-14">
          {/* Left: hamburger */}
          <button
            className="text-base-content/70 hover:text-base-content lg:hidden"
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(!sidebarOpen);
            }}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="5" width="16" height="2" />
              <rect x="4" y="11" width="16" height="2" />
              <rect x="4" y="17" width="16" height="2" />
            </svg>
          </button>

          {/* Right: placeholders (search/theme/user later) */}
          <div className="flex items-center gap-2">
            <input
              placeholder="Search…"
              className="hidden md:block input input-sm input-bordered"
              aria-label="Search"
            />
            <button className="btn btn-ghost btn-circle btn-sm" aria-label="Theme toggle">
              <span className="i">🌗</span>
            </button>
            <div className="avatar placeholder">
              <div className="bg-base-300 text-base-content/70 rounded-full w-8">U</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
