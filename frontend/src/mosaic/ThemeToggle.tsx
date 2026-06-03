// todo - wire up
import React from "react";

export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme") || "tradinghub";
    const next = current.includes("dark") ? "tradinghub" : "tradinghub-dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }
  return (
    <button className="btn btn-ghost btn-circle btn-sm" onClick={toggle} aria-label="Theme">
      🌗
    </button>
  );
}
