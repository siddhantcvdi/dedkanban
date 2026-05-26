"use client";

import { useState, useEffect, useRef } from "react";
import { Column } from "./types";
import { GripIcon } from "./icons";

export function ReorderColumnsDialog({
  columns,
  onSave,
  onClose,
}: {
  columns: Column[];
  onSave: (reordered: Column[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Column[]>(columns);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ id: string; fromIdx: number; offsetY: number } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function getTargetId(clientY: number): string | null {
    if (!listRef.current) return null;
    const children = Array.from(listRef.current.querySelectorAll<HTMLElement>("[data-col-id]"));
    for (const el of children) {
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return el.dataset.colId ?? null;
    }
    // past the last item
    if (children.length > 0) {
      const last = children[children.length - 1].getBoundingClientRect();
      if (clientY > last.bottom) return children[children.length - 1].dataset.colId ?? null;
      const first = children[0].getBoundingClientRect();
      if (clientY < first.top) return children[0].dataset.colId ?? null;
    }
    return null;
  }

  function startDrag(e: React.MouseEvent | React.TouchEvent, col: Column, idx: number) {
    e.preventDefault();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    const ghost = el.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: "fixed",
      top: rect.top + "px",
      left: rect.left + "px",
      width: rect.width + "px",
      opacity: "0.85",
      zIndex: "9999",
      pointerEvents: "none",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      borderRadius: "12px",
      transition: "none",
      transform: "scale(1.02)",
    });
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
    dragRef.current = { id: col.id, fromIdx: idx, offsetY: clientY - rect.top };
    setDraggingId(col.id);
    setOverId(col.id);
  }

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!dragRef.current || !ghostRef.current) return;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const ghost = ghostRef.current;
      ghost.style.top = (clientY - dragRef.current.offsetY) + "px";
      const targetId = getTargetId(clientY);
      if (targetId) setOverId(targetId);
    }

    function onUp(e: MouseEvent | TouchEvent) {
      if (!dragRef.current) return;
      const clientY = "touches" in e ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
      const targetId = getTargetId(clientY) ?? dragRef.current.id;
      if (targetId !== dragRef.current.id) {
        const fromIdx = dragRef.current.fromIdx;
        const toIdx = items.findIndex((c) => c.id === targetId);
        if (toIdx !== -1) setItems((prev) => {
          const next = [...prev];
          const [removed] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, removed);
          return next;
        });
      }
      if (ghostRef.current) { document.body.removeChild(ghostRef.current); ghostRef.current = null; }
      dragRef.current = null;
      setDraggingId(null);
      setOverId(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [items]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 dark:bg-black/20 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#F2F0E3] dark:bg-[#282828] shadow-2xl border border-[#DDD9C8] dark:border-[#3a3a3a] flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E8E5D5] dark:border-[#313131]">
          <span className="text-sm font-semibold text-[#3D3A30] dark:text-[#ccc8c0]">Reorder Columns</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9C9888] hover:text-[#5C5849] dark:hover:text-[#ccc8c0] hover:bg-[#E6E4D7] dark:hover:bg-[#313131] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar px-5 py-3 space-y-2">
          {items.map((col, i) => (
            <div
              key={col.id}
              data-col-id={col.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 select-none cursor-grab active:cursor-grabbing touch-none ${
                col.id === draggingId
                  ? "opacity-30 bg-[#ECEADA] dark:bg-[#313131] border-[#F76F53] dark:border-[#F76F53]"
                  : col.id === overId && draggingId
                  ? "bg-[#ECEADA] dark:bg-[#313131] border-[#F76F53]/60 dark:border-[#F76F53]/50 scale-[1.01]"
                  : "bg-[#ECEADA] dark:bg-[#313131] border-[#DDD9C8] dark:border-[#3a3a3a]"
              }`}
              onMouseDown={(e) => startDrag(e, col, i)}
              onTouchStart={(e) => startDrag(e, col, i)}
            >
              <span className="text-[#BCB8A8] dark:text-[#4a4641]">
                <GripIcon size={14} />
              </span>
              <span className="text-sm font-medium text-[#3D3A30] dark:text-[#ccc8c0] flex-1">{col.title}</span>
              <span className="text-xs text-[#9C9888] dark:text-[#5e5a55] tabular-nums">{col.tasks.length} tasks</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-[#E8E5D5] dark:border-[#313131]">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium bg-[#F2F0E3] dark:bg-[#313131] hover:bg-[#E0DDD0] dark:hover:bg-[#38383f] text-[#5C5849] dark:text-[#a09890] rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onSave(items); onClose(); }}
            className="flex-1 py-2.5 text-sm font-semibold bg-[#F76F53] hover:bg-[#e55c40] text-white rounded-xl transition-colors shadow-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
