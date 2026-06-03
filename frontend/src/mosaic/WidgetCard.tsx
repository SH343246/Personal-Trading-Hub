// src/components/ui/WidgetCard.tsx
import React from "react";
import type { ReactNode } from 'react';

export default function WidgetCard({ title, action, children }: { title?: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-base-200 shadow-md p-4">
      {(title || action) && (
        <div className="flex items-center justify-between mb-2">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
