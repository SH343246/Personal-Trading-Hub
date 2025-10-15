// src/components/ui/Tooltip.tsx
import React, { useState } from "react";
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  content: ReactNode;
  position?: "top" | "right" | "bottom" | "left";
  className?: string;
};

export default function Tooltip({ children, content, position = "top", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const pos =
    position === "right"
      ? "left-full top-1/2 -translate-y-1/2 ml-2"
      : position === "left"
      ? "right-full top-1/2 -translate-y-1/2 mr-2"
      : position === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 mt-2"
      : "bottom-full left-1/2 -translate-x-1/2 mb-2";

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span>{children}</span>
      <span
        className={`pointer-events-none absolute ${pos} rounded-lg border border-base-300 bg-base-200 text-sm px-3 py-2 shadow-md transition-opacity duration-150 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}
