import React from "react";

type Props = {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function Card({ title, subtitle, right, children, className }: Props) {
  return (
    <div className={`card bg-base-200 shadow-xl rounded-2xl ${className || ""}`}>
      {(title || subtitle || right) && (
        <div className="card-body py-4 border-b border-base-300">
          <div className="flex items-center justify-between">
            <div>
              {title && <h2 className="card-title text-base">{title}</h2>}
              {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
            </div>
            {right}
          </div>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
