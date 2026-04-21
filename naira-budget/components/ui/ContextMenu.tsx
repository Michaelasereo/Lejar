"use client";

import { useEffect, useRef } from "react";

interface ContextMenuItem {
  id: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
}

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ open, x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-44 border border-white/10 bg-[#1a1a1a]"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          className={`block w-full px-4 py-3 text-left text-sm hover:bg-white/5 ${
            item.danger ? "text-red-400" : "text-white/70"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
