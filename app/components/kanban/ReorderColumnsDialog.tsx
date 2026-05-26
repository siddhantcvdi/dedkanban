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
  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function getDisplayItems() {
    if (dragIdx.current === null || overIdx === null || dragIdx.current === overIdx) return items;
    const next = [...items];
    const [removed] = next.splice(dragIdx.current, 1);
    next.splice(overIdx, 0, removed);
    return next;
  }

  function handleDragStart(i: number) {
    dragIdx.current = i;
    setOverIdx(i);
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIdx.current === null) return;
    setOverIdx(i);
  }

  function handleDragEnd() {
    if (dragIdx.current !== null && overIdx !== null && dragIdx.current !== overIdx) {
      setItems(getDisplayItems());
    }
    dragIdx.current = null;
    setOverIdx(null);
  }

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

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3 space-y-2">
          {getDisplayItems().map((col, i) => {
            const isDragging = overIdx !== null && dragIdx.current !== null && col.id === items[dragIdx.current]?.id;
            return (
            <div
              key={col.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-150 select-none ${
                isDragging
                  ? "opacity-50 bg-[#ECEADA] dark:bg-[#313131] border-[#F76F53] dark:border-[#F76F53] scale-[0.98]"
                  : "bg-[#ECEADA] dark:bg-[#313131] border-[#DDD9C8] dark:border-[#3a3a3a] hover:border-[#F76F53]/40 dark:hover:border-[#F76F53]/30"
              }`}
            >
              <span className="text-[#BCB8A8] dark:text-[#4a4641]">
                <GripIcon size={14} />
              </span>
              <span className="text-sm font-medium text-[#3D3A30] dark:text-[#ccc8c0] flex-1">{col.title}</span>
              <span className="text-xs text-[#9C9888] dark:text-[#5e5a55] tabular-nums">{col.tasks.length} tasks</span>
            </div>
          );
          })}
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
