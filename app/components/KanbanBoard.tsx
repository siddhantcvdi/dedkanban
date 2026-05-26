"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// ---- Types ----
type TaskLink = { id: string; url: string; label: string };
type Task = { id: string; content: string; links: TaskLink[]; sourceBoardName?: string };
type Column = { id: string; title: string; tasks: Task[] };
type Board = { id: string; name: string; columns: Column[] };
type ThemeMode = "light" | "dark";

// ---- Storage keys (theme + active board remain local) ----
const ACTIVE_BOARD_KEY = "kanban-active-board";
const THEME_KEY = "kanban-theme";
const TODAY_BOARD_ID = "board-today";
const TODAY_COL_TODO_ID = "today-col-todo";

const TODAY_COLUMNS: Column[] = [
  { id: TODAY_COL_TODO_ID, title: "To Do", tasks: [] },
  { id: "today-col-progress", title: "In Progress", tasks: [] },
  { id: "today-col-done", title: "Done", tasks: [] },
];

// ---- Defaults ----
const DEFAULT_BOARDS: Board[] = [
  {
    id: TODAY_BOARD_ID,
    name: "Today",
    columns: TODAY_COLUMNS,
  },
  {
    id: "board-default",
    name: "My Board",
    columns: [
      {
        id: "col-todo",
        title: "To Do",
        tasks: [
          { id: "task-1", content: "Design wireframes", links: [] },
          { id: "task-2", content: "Set up project repo", links: [] },
        ],
      },
      {
        id: "col-progress",
        title: "In Progress",
        tasks: [{ id: "task-3", content: "Build kanban board", links: [] }],
      },
      { id: "col-done", title: "Done", tasks: [] },
    ],
  },
];

function genId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);
}

// ---- Click-outside hook ----
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [ref, handler]);
}

// ---- Icons ----
function SunIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}


function ChevronDownIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}


function LinkIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ExternalLinkIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CalendarIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function GripIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ---- Reorder Columns Dialog ----
function ReorderColumnsDialog({
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
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleDragStart(i: number) {
    dragIdx.current = i;
    setDraggingIdx(i);
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...items];
    const [removed] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, removed);
    dragIdx.current = i;
    setDraggingIdx(i);
    setItems(next);
  }

  function handleDragEnd() {
    dragIdx.current = null;
    setDraggingIdx(null);
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
          {items.map((col, i) => (
            <div
              key={col.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-150 select-none ${
                draggingIdx === i
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

// ---- Task Edit Modal ----
function TaskModal({
  task,
  isDone,
  onSave,
  onClose,
  columns,
  currentColId,
  onMove,
}: {
  task: Task;
  isDone: boolean;
  onSave: (updated: Task) => void;
  onClose: () => void;
  columns: Column[];
  currentColId: string;
  onMove: (targetColId: string) => void;
}) {
  const [content, setContent] = useState(task.content);
  const [links, setLinks] = useState<TaskLink[]>(task.links ?? []);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSave({ ...task, content: trimmed, links });
    onClose();
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    setLinks((prev) => [...prev, { id: genId(), url, label: linkLabel.trim() || url }]);
    setLinkUrl("");
    setLinkLabel("");
  }

  function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function normalizeUrl(url: string) {
    return /^https?:\/\//i.test(url) ? url : "https://" + url;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 dark:bg-black/20 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#F2F0E3] dark:bg-[#282828] shadow-2xl border border-[#DDD9C8] dark:border-[#3a3a3a] flex flex-col max-h-[90vh]">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E8E5D5] dark:border-[#313131]">
          <span className="text-sm font-semibold text-[#3D3A30] dark:text-[#ccc8c0]">Edit Task</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9C9888] hover:text-[#5C5849] dark:hover:text-[#ccc8c0] hover:bg-[#F2F0E3] dark:hover:bg-[#313131] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-5">
          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#7C7868] dark:text-[#7d7870] uppercase tracking-wide">Content</label>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); }}
              rows={4}
              className="w-full text-sm p-3 rounded-xl bg-[#ECEADA] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] outline-none focus:border-[#F76F53] dark:focus:border-[#F76F53] focus:ring-2 focus:ring-[#ffddd6] dark:focus:ring-[#F76F53]/20 resize-none transition"
              placeholder="Task description..."
            />
          </div>

          {/* Links */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#7C7868] dark:text-[#7d7870] uppercase tracking-wide">Links</label>
            {links.length > 0 && (
              <div className="space-y-1.5">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#ECEADA] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a]">
                    <ExternalLinkIcon size={12} />
                    <a
                      href={normalizeUrl(link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-xs text-[#F76F53] dark:text-[#f99080] hover:underline truncate"
                      title={link.url}
                    >
                      {link.label}
                    </a>
                    <button
                      onClick={() => removeLink(link.id)}
                      className="text-[#BCB8A8] dark:text-[#4a4641] hover:text-red-400 dark:hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Add link inputs */}
            <div className="flex flex-col gap-1.5">
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                placeholder="https://..."
                className="w-full text-xs p-2 rounded-lg bg-[#ECEADA] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] outline-none focus:border-[#F76F53] dark:focus:border-[#F76F53] transition"
              />
              <div className="flex gap-1.5">
                <input
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                  placeholder="Label (optional)"
                  className="flex-1 text-xs p-2 rounded-lg bg-[#ECEADA] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] outline-none focus:border-[#F76F53] dark:focus:border-[#F76F53] transition"
                />
                <button
                  onClick={addLink}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#F2F0E3] dark:bg-[#3a3a3a] hover:bg-[#ffddd6] dark:hover:bg-[#F76F53]/12 text-[#5C5849] dark:text-[#a09890] hover:text-[#F76F53] dark:hover:text-[#f99080] rounded-lg transition-colors flex items-center gap-1"
                >
                  <LinkIcon size={11} />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Move to column */}
        {columns.filter((c) => c.id !== currentColId).length > 0 && (
          <div className="px-5 pb-3 space-y-1.5">
            <label className="text-xs font-semibold text-[#7C7868] dark:text-[#7d7870] uppercase tracking-wide">Move to</label>
            <div className="flex flex-wrap gap-1.5">
              {columns.filter((c) => c.id !== currentColId).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onMove(c.id); onClose(); }}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-[#ECEADA] dark:bg-[#313131] text-[#5C5849] dark:text-[#a09890] hover:bg-[#F76F53] hover:text-white dark:hover:bg-[#F76F53] dark:hover:text-white transition-colors"
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-[#E8E5D5] dark:border-[#313131]">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium bg-[#F2F0E3] dark:bg-[#313131] hover:bg-[#E0DDD0] dark:hover:bg-[#38383f] text-[#5C5849] dark:text-[#a09890] rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={save} className="flex-1 py-2.5 text-sm font-semibold bg-[#F76F53] hover:bg-[#e55c40] text-white rounded-xl transition-colors shadow-sm">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- TaskCard ----
function TaskCard({
  task,
  isDone,
  onUpdate,
  onDragStart,
  onDragEnd,
  isDragging,
  isHolding,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  columns,
  currentColId,
  onMove,
  onContextMenu,
}: {
  task: Task;
  isDone: boolean;
  onUpdate: (updated: Task) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isHolding: boolean;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  columns: Column[];
  currentColId: string;
  onMove: (targetColId: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const links = task.links ?? [];
  const sourceBoardName = task.sourceBoardName;

  function normalizeUrl(url: string) {
    return /^https?:\/\//i.test(url) ? url : "https://" + url;
  }

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => setModalOpen(true)}
        onContextMenu={onContextMenu}
        style={{ touchAction: "none" }}
        className={`group p-3 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
          isDragging
            ? "opacity-40 scale-95 bg-[#F2F0E3] dark:bg-[#313131] border-[#DDD9C8] dark:border-[#3a3a3a]"
            : isHolding
            ? "bg-[#F2F0E3] dark:bg-[#313131] border-[#F76F53] dark:border-[#F76F53] scale-[1.02] shadow-lg shadow-[#F76F53]/20 ring-2 ring-[#F76F53]/30"
            : "bg-[#F2F0E3] dark:bg-[#313131] border-[#DDD9C8] dark:border-[#3a3a3a] hover:border-[#f59a87] dark:hover:border-[#F76F53]/50 hover:shadow-md hover:shadow-[#D8D5C4]/50 dark:hover:shadow-[#1f1f1f]/50"
        }`}
      >
        {sourceBoardName && (
          <span className="inline-flex items-center mb-1.5 px-1.5 py-0.5 rounded-md bg-[#F76F53]/10 dark:bg-[#F76F53]/15 border border-[#F76F53]/25 dark:border-[#F76F53]/30 text-[#F76F53] dark:text-[#f99080] text-[10px] font-semibold tracking-wide">
            {sourceBoardName}
          </span>
        )}
        <p className={`text-sm leading-relaxed ${
          isDone ? "line-through text-[#9C9888] dark:text-[#5e5a55]" : "text-[#3D3A30] dark:text-[#ccc8c0]"
        }`}>
          {task.content}
        </p>
        {links.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {links.map((link) => (
              <a
                key={link.id}
                href={normalizeUrl(link.url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full bg-[#fff1ee] dark:bg-[#F76F53]/10 border border-[#f9b9ac] dark:border-[#F76F53]/30 text-[#F76F53] dark:text-[#f99080] text-xs font-medium hover:bg-[#ffddd6] dark:hover:bg-[#F76F53]/10 transition-colors max-w-[160px]"
                title={link.url}
              >
                <ExternalLinkIcon size={9} />
                <span className="truncate">{link.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <TaskModal
          task={task}
          isDone={isDone}
          onSave={onUpdate}
          onClose={() => setModalOpen(false)}
          columns={columns}
          currentColId={currentColId}
          onMove={onMove}
        />
      )}
    </>
  );
}

// ---- Theme icon helper ----
function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return mode === "dark" ? <MoonIcon size={16} /> : <SunIcon size={16} />;
}

// ---- Main Board ----
export default function KanbanBoard() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [boardsLoaded, setBoardsLoaded] = useState(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state
  const [dragging, setDragging] = useState<{ taskId: string; colId: string } | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);

  // Touch DnD
  const [holdingCardId, setHoldingCardId] = useState<string | null>(null);
  const touchRef = useRef<{ taskId: string; colId: string; ghost: HTMLElement | null; startX: number; startY: number; active: boolean; holdReady: boolean; holdTimer: ReturnType<typeof setTimeout> | null } | null>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);

  // Column edit/add state
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [addingTaskColId, setAddingTaskColId] = useState<string | null>(null);
  const [newTaskContent, setNewTaskContent] = useState("");
  const [newTaskLinks, setNewTaskLinks] = useState<TaskLink[]>([]);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const linkPopoverRef = useRef<HTMLDivElement>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  // Dropdown open state
  const [addingBoardName, setAddingBoardName] = useState("");
  const [addingBoard, setAddingBoard] = useState(false);

  // Board context menu
  const [boardCtxMenu, setBoardCtxMenu] = useState<{ boardId: string; x: number; y: number } | null>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renamingBoardName, setRenamingBoardName] = useState("");
  const boardCtxRef = useRef<HTMLDivElement>(null);

  // Card context menu
  const [cardCtxMenu, setCardCtxMenu] = useState<{ taskId: string; colId: string; x: number; y: number } | null>(null);
  const cardCtxRef = useRef<HTMLDivElement>(null);

  // Reorder columns dialog
  const [reorderOpen, setReorderOpen] = useState(false);

  const newBoardInputRef = useRef<HTMLDivElement>(null);

  useClickOutside(newBoardInputRef, useCallback(() => {
    setAddingBoard(false);
    setAddingBoardName("");
  }, []));

  useClickOutside(boardCtxRef, useCallback(() => setBoardCtxMenu(null), []));
  useClickOutside(cardCtxRef, useCallback(() => setCardCtxMenu(null), []));
  useClickOutside(linkPopoverRef, useCallback(() => { setLinkPopoverOpen(false); setNewLinkUrl(""); setNewLinkLabel(""); }, []));

  // Auth + load boards from Firestore
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    setThemeMode((savedTheme === "light" || savedTheme === "dark") ? savedTheme : "light");

    console.log("[kanban] useEffect running, setting up onAuthStateChanged");

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[kanban] onAuthStateChanged fired", { uid: firebaseUser?.uid ?? null });

      if (!firebaseUser) {
        console.log("[kanban] no user → setMounted(true)");
        setUser(null);
        setUid(null);
        setBoardsLoaded(true);
        setMounted(true);
        return;
      }

      setUser(firebaseUser);
      setUid(firebaseUser.uid);
      console.log("[kanban] user found, setMounted(true), starting Firestore load");
      setMounted(true);

      try {
        console.log("[kanban] getDoc start");
        const userDoc = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userDoc);
        console.log("[kanban] getDoc done", { exists: snap.exists() });
        const savedActive = localStorage.getItem(ACTIVE_BOARD_KEY);

        if (snap.exists()) {
          const loadedBoards: Board[] = snap.data().boards ?? DEFAULT_BOARDS;
          const hasToday = loadedBoards.some((b) => b.id === TODAY_BOARD_ID);
          const finalBoards = (hasToday ? loadedBoards : [{ id: TODAY_BOARD_ID, name: "Today", columns: TODAY_COLUMNS }, ...loadedBoards])
            .map((b) => b.id === TODAY_BOARD_ID && !b.columns.some((c) => c.id === TODAY_COL_TODO_ID)
              ? { ...b, columns: TODAY_COLUMNS }
              : b
            );
          const activeId = savedActive && finalBoards.find((b) => b.id === savedActive)
            ? savedActive : finalBoards[0].id;
          console.log("[kanban] loaded boards", finalBoards.length, "activeId:", activeId);
          setBoards(finalBoards);
          setActiveBoardId(activeId);
        } else {
          console.log("[kanban] no doc, using defaults");
          setBoards(DEFAULT_BOARDS);
          setActiveBoardId(DEFAULT_BOARDS[0].id);
          await setDoc(userDoc, { boards: DEFAULT_BOARDS });
          console.log("[kanban] default doc written");
        }
      } catch (err) {
        console.error("[kanban] Firestore error", err);
        setBoards(DEFAULT_BOARDS);
        setActiveBoardId(DEFAULT_BOARDS[0].id);
      }
      console.log("[kanban] setBoardsLoaded(true)");
      setBoardsLoaded(true);
    });

    return () => unsubAuth();
  }, []);

  // Debounced Firestore write whenever boards change
  useEffect(() => {
    if (!mounted || !uid || !boardsLoaded) return;
    localStorage.setItem(ACTIVE_BOARD_KEY, activeBoardId);
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(async () => {
      setSyncing(true);
      await setDoc(doc(db, "users", uid), { boards });
      setSyncing(false);
    }, 800);
  }, [boards, activeBoardId, mounted, uid, boardsLoaded]);

  // Apply dark class and update theme-color meta based on theme mode
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(THEME_KEY, themeMode);
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    const color = themeMode === "dark" ? "#282828" : "#E6E4D7";
    document.querySelectorAll("meta[name='theme-color']").forEach((el) => {
      (el as HTMLMetaElement).content = color;
    });
  }, [themeMode, mounted]);

  // ---- Helpers ----
  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const columns = activeBoard?.columns ?? [];

  function updateColumns(updater: (cols: Column[]) => Column[]) {
    setBoards((prev) =>
      prev.map((b) => (b.id === activeBoardId ? { ...b, columns: updater(b.columns) } : b))
    );
  }

  // ---- Drag & Drop ----
  function onTaskDragStart(taskId: string, colId: string) {
    setDragging({ taskId, colId });
  }

  function onTaskDragEnd() {
    setDragging(null);
    setDragOverColId(null);
    setDragOverTrash(false);
  }

  function onColumnDrop(targetColId: string) {
    if (!dragging || dragging.colId === targetColId) {
      setDragging(null);
      setDragOverColId(null);
      return;
    }
    updateColumns((cols) => {
      const task = cols.find((c) => c.id === dragging.colId)?.tasks.find((t) => t.id === dragging.taskId);
      if (!task) return cols;
      return cols.map((col) => {
        if (col.id === dragging.colId) return { ...col, tasks: col.tasks.filter((t) => t.id !== dragging.taskId) };
        if (col.id === targetColId) return { ...col, tasks: [...col.tasks, task] };
        return col;
      });
    });
    setDragging(null);
    setDragOverColId(null);
  }

  function onTrashDrop() {
    if (!dragging) return;
    updateColumns((cols) =>
      cols.map((col) =>
        col.id === dragging.colId
          ? { ...col, tasks: col.tasks.filter((t) => t.id !== dragging.taskId) }
          : col
      )
    );
    setDragging(null);
    setDragOverTrash(false);
  }

  // ---- Touch DnD ----
  function onCardTouchStart(e: React.TouchEvent, taskId: string, colId: string) {
    const t = e.touches[0];
    const holdTimer = setTimeout(() => {
      if (touchRef.current && !touchRef.current.active) {
        touchRef.current.holdReady = true;
        setHoldingCardId(taskId);
        navigator.vibrate?.(15);
      }
    }, 350);
    touchRef.current = { taskId, colId, ghost: null, startX: t.clientX, startY: t.clientY, active: false, holdReady: false, holdTimer };
  }

  function onCardTouchMove(e: React.TouchEvent) {
    const s = touchRef.current;
    if (!s) return;
    const t = e.touches[0];

    if (!s.holdReady) {
      // Cancel hold if finger moved before the timer fired
      if (Math.hypot(t.clientX - s.startX, t.clientY - s.startY) > 8) {
        if (s.holdTimer) clearTimeout(s.holdTimer);
        touchRef.current = null;
        setHoldingCardId(null);
      }
      return;
    }

    if (!s.active) {
      if (Math.hypot(t.clientX - s.startX, t.clientY - s.startY) < 4) return;
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const ghost = el.cloneNode(true) as HTMLElement;
      Object.assign(ghost.style, { position: "fixed", top: rect.top + "px", left: rect.left + "px", width: rect.width + "px", opacity: "0.85", zIndex: "9999", pointerEvents: "none", transform: "scale(1.03)", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", transition: "none" });
      document.body.appendChild(ghost);
      s.ghost = ghost;
      s.active = true;
      setHoldingCardId(null);
      setDragging({ taskId: s.taskId, colId: s.colId });
    }
    if (s.active && s.ghost) {
      e.preventDefault();
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      s.ghost.style.top = (t.clientY - rect.height / 2) + "px";
      s.ghost.style.left = (t.clientX - rect.width / 2) + "px";

      // Auto-scroll board when near left/right edges
      const board = boardScrollRef.current;
      if (board) {
        if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
        const edge = 72;
        const speed = 10;
        const bRect = board.getBoundingClientRect();
        const distLeft = t.clientX - bRect.left;
        const distRight = bRect.right - t.clientX;
        if (distLeft < edge || distRight < edge) {
          const scroll = () => {
            if (!touchRef.current?.active) return;
            if (distLeft < edge) board.scrollLeft -= speed * (1 - distLeft / edge);
            if (distRight < edge) board.scrollLeft += speed * (1 - distRight / edge);
            scrollAnimRef.current = requestAnimationFrame(scroll);
          };
          scrollAnimRef.current = requestAnimationFrame(scroll);
        }
      }

      s.ghost.style.display = "none";
      const under = document.elementFromPoint(t.clientX, t.clientY);
      s.ghost.style.display = "";
      setDragOverColId(under?.closest("[data-colid]")?.getAttribute("data-colid") ?? null);
      setDragOverTrash(!!under?.closest("[data-trash]"));
    }
  }

  function onCardTouchEnd(e: React.TouchEvent) {
    if (scrollAnimRef.current) { cancelAnimationFrame(scrollAnimRef.current); scrollAnimRef.current = null; }
    const s = touchRef.current;
    if (!s) return;
    if (s.holdTimer) clearTimeout(s.holdTimer);
    setHoldingCardId(null);
    if (s.active) {
      const t = e.changedTouches[0];
      if (s.ghost) s.ghost.style.display = "none";
      const under = document.elementFromPoint(t.clientX, t.clientY);
      if (s.ghost) document.body.removeChild(s.ghost);
      if (under?.closest("[data-trash]")) { onTrashDrop(); }
      else {
        const targetId = under?.closest("[data-colid]")?.getAttribute("data-colid");
        if (targetId) onColumnDrop(targetId);
        else onTaskDragEnd();
      }
    }
    // Always reset drag state in case any path above missed it
    setDragging(null);
    setDragOverColId(null);
    setDragOverTrash(false);
    touchRef.current = null;
  }

  // ---- Column actions ----
  function deleteColumn(colId: string) {
    updateColumns((cols) => cols.filter((c) => c.id !== colId));
  }

  function commitRenameColumn(colId: string, value: string) {
    updateColumns((cols) =>
      cols.map((c) => (c.id === colId ? { ...c, title: value.trim() || "Untitled" } : c))
    );
    setEditingColId(null);
  }

  function addColumn() {
    const title = newColTitle.trim();
    if (!title) return;
    updateColumns((cols) => [...cols, { id: genId(), title, tasks: [] }]);
    setNewColTitle("");
    setAddingCol(false);
  }

  function reorderColumns(reordered: Column[]) {
    updateColumns(() => reordered);
  }

  // ---- Task actions ----
  function addTask(colId: string) {
    const content = newTaskContent.trim();
    if (!content) return;
    updateColumns((cols) =>
      cols.map((col) =>
        col.id === colId ? { ...col, tasks: [...col.tasks, { id: genId(), content, links: newTaskLinks }] } : col
      )
    );
    setNewTaskContent("");
    setNewTaskLinks([]);
    setLinkPopoverOpen(false);
    setNewLinkUrl("");
    setNewLinkLabel("");
    setAddingTaskColId(null);
  }

  function moveTask(taskId: string, fromColId: string, toColId: string) {
    updateColumns((cols) => {
      const task = cols.find((c) => c.id === fromColId)?.tasks.find((t) => t.id === taskId);
      if (!task) return cols;
      return cols.map((col) => {
        if (col.id === fromColId) return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
        if (col.id === toColId) return { ...col, tasks: [...col.tasks, task] };
        return col;
      });
    });
  }

  function updateTask(colId: string, updated: Task) {
    updateColumns((cols) =>
      cols.map((col) =>
        col.id === colId
          ? { ...col, tasks: col.tasks.map((t) => (t.id === updated.id ? updated : t)) }
          : col
      )
    );
  }

  // ---- Board actions ----
  function addBoard() {
    const name = addingBoardName.trim();
    if (!name) return;
    const newBoard: Board = { id: genId(), name, columns: [] };
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    setAddingBoardName("");
    setAddingBoard(false);
  }

  function deleteBoard(boardId: string) {
    if (boardId === TODAY_BOARD_ID) return;
    if (boards.length === 1) return;
    const remaining = boards.filter((b) => b.id !== boardId);
    setBoards(remaining);
    if (activeBoardId === boardId) setActiveBoardId(remaining[0].id);
  }

  function moveTaskToToday(taskId: string, fromColId: string) {
    const sourceBoard = boards.find((b) => b.id === activeBoardId);
    if (!sourceBoard) return;
    const task = sourceBoard.columns.find((c) => c.id === fromColId)?.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const taskCopy: Task = { ...task, id: genId(), sourceBoardName: sourceBoard.name };
    setBoards((prev) =>
      prev.map((board) =>
        board.id === TODAY_BOARD_ID
          ? {
              ...board,
              columns: board.columns.map((col) =>
                col.id === TODAY_COL_TODO_ID ? { ...col, tasks: [...col.tasks, taskCopy] } : col
              ),
            }
          : board
      )
    );
  }

  function commitRenameBoard(boardId: string, name: string) {
    const trimmed = name.trim();
    if (trimmed) setBoards((prev) => prev.map((b) => b.id === boardId ? { ...b, name: trimmed } : b));
    setRenamingBoardId(null);
    setRenamingBoardName("");
  }

  async function handleGoogleSignIn() {
    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  if (!mounted) {
    return <div className="min-h-screen bg-[#F2F0E3] dark:bg-[#1f1f1f]" />;
  }

  if (mounted && user && !boardsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F0E3] dark:bg-[#1f1f1f]">
        <svg className="animate-spin text-[#F76F53]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F0E3] dark:bg-[#1f1f1f] px-4">
        <div className="w-full max-w-sm rounded-2xl bg-[#E6E4D7] dark:bg-[#282828] border border-[#DDD9C8] dark:border-[#313131] shadow-xl p-8 flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F76F53] to-[#c94523] flex items-center justify-center shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="11" rx="1" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[#2C2A22] dark:text-[#e5e2db] tracking-tight">DedKanban</span>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-[#3D3A30] dark:text-[#ccc8c0]">Welcome back</p>
            <p className="text-xs text-[#9C9888] dark:text-[#5e5a55]">Sign in to access your boards</p>
          </div>
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-sm font-semibold text-[#3D3A30] dark:text-[#ccc8c0] hover:bg-[#fafaf8] dark:hover:bg-[#3a3a3a] hover:border-[#F76F53] dark:hover:border-[#F76F53]/60 transition-all shadow-sm disabled:opacity-50"
          >
            {signingIn ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {signingIn ? "Redirecting…" : "Continue with Google"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F0E3] dark:bg-[#1f1f1f] transition-colors duration-300">
      {/* Floating header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-0 pointer-events-none">
      <header className="pointer-events-auto flex items-center bg-[#E6E4D7]/90 dark:bg-[#282828]/90 backdrop-blur-md border border-[#DDD9C8] dark:border-[#313131] shadow-sm shadow-[#D8D5C4]/60 dark:shadow-[#1f1f1f]/60 rounded-2xl h-14 overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 flex-shrink-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#F76F53] to-[#c94523] flex items-center justify-center shadow-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="11" rx="1" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-[#9C9888] dark:text-[#5e5a55] tracking-tight hidden sm:block select-none">
            DedKanban
          </span>
        </div>

        <div className="w-px h-5 bg-[#DDD9C8] dark:bg-[#3a3a3a] flex-shrink-0" />

        {/* Board tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1 px-2 h-full">
          {boards.map((b) => (
            <div
              key={b.id}
              className={`group flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer select-none transition-all duration-150 ${
                b.id === activeBoardId
                  ? b.id === TODAY_BOARD_ID
                    ? "bg-[#F76F53]/15 dark:bg-[#F76F53]/20 text-[#F76F53] dark:text-[#f99080] shadow-sm"
                    : "bg-[#F2F0E3] dark:bg-[#313131] text-[#1E1C16] dark:text-white shadow-sm"
                  : b.id === TODAY_BOARD_ID
                  ? "text-[#F76F53]/70 dark:text-[#F76F53]/50 hover:bg-[#fff1ee] dark:hover:bg-[#F76F53]/8 hover:text-[#F76F53] dark:hover:text-[#f99080]"
                  : "text-[#7C7868] dark:text-[#7d7870] hover:bg-[#ECEADA] dark:hover:bg-[#313131]/60 hover:text-[#3D3A30] dark:hover:text-[#ccc8c0]"
              }`}
              onClick={() => setActiveBoardId(b.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setBoardCtxMenu({ boardId: b.id, x: e.clientX, y: e.clientY });
              }}
            >
              {b.id === TODAY_BOARD_ID ? (
                <CalendarIcon size={12} />
              ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-60">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="11" rx="1" />
              </svg>
              )}
              {renamingBoardId === b.id ? (
                <input
                  autoFocus
                  value={renamingBoardName}
                  onChange={(e) => setRenamingBoardName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRenameBoard(b.id, renamingBoardName);
                    if (e.key === "Escape") { setRenamingBoardId(null); setRenamingBoardName(""); }
                  }}
                  onBlur={() => commitRenameBoard(b.id, renamingBoardName)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-24 text-sm bg-transparent border-b border-[#F76F53] dark:border-[#F76F53] outline-none text-[#1E1C16] dark:text-white"
                />
              ) : (
                <span className="max-w-[120px] truncate">{b.name}</span>
              )}
            </div>
          ))}

          {/* New board tab */}
          {addingBoard ? (
            <div ref={newBoardInputRef} className="flex items-center gap-1 px-2 h-9 flex-shrink-0">
              <input
                autoFocus
                value={addingBoardName}
                onChange={(e) => setAddingBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addBoard();
                  if (e.key === "Escape") { setAddingBoard(false); setAddingBoardName(""); }
                }}
                placeholder="Board name…"
                className="text-xs px-2 py-1 rounded-lg bg-[#F2F0E3] dark:bg-[#313131] border border-[#F76F53] dark:border-[#F76F53] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] outline-none w-32 transition"
              />
              <button onClick={addBoard} className="text-xs px-2 py-1 bg-[#F76F53] hover:bg-[#e55c40] text-white rounded-lg transition-colors font-semibold">
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingBoard(true)}
              className="flex items-center gap-1 px-2 h-9 rounded-lg text-[#9C9888] dark:text-[#5e5a55] hover:text-[#5C5849] dark:hover:text-[#a09890] hover:bg-[#ECEADA] dark:hover:bg-[#313131]/60 transition-colors flex-shrink-0"
              title="New board"
            >
              <PlusIcon size={13} />
            </button>
          )}
        </div>

        {/* Sync indicator + auth + theme toggle */}
        <div className="flex items-center gap-1 flex-shrink-0 pr-3">
          {syncing && (
            <svg className="animate-spin text-[#9C9888] dark:text-[#5e5a55]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}

          {/* Auth */}
          {user && (
            <div className="flex items-center gap-1.5">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName ?? ""} className="w-6 h-6 rounded-full border border-[#DDD9C8] dark:border-[#3a3a3a]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#F76F53] flex items-center justify-center text-white text-[10px] font-bold">
                  {user.displayName?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <span className="hidden sm:inline text-xs text-[#7C7868] dark:text-[#7d7870] max-w-[80px] truncate">{user.displayName}</span>
              <button
                onClick={handleSignOut}
                className="px-2 py-1 rounded-lg text-xs text-[#9C9888] dark:text-[#5e5a55] hover:text-red-400 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Sign out"
              >
                Out
              </button>
            </div>
          )}

          <button
            onClick={() => setThemeMode((m) => m === "light" ? "dark" : "light")}
            className="flex items-center px-2 py-1.5 rounded-lg text-[#9C9888] dark:text-[#5e5a55] hover:bg-[#F2F0E3] dark:hover:bg-[#313131] hover:text-[#5C5849] dark:hover:text-[#a09890] transition-colors"
            title={`Theme: ${themeMode} — click to cycle`}
          >
            <ThemeIcon mode={themeMode} />
          </button>
        </div>
      </header>
      </div>

      {/* Board */}
      <div ref={boardScrollRef} className="flex-1 overflow-x-auto no-scrollbar">
        <div className="flex gap-3 px-2 pt-3 pb-6 sm:gap-4 sm:px-4 sm:pt-4 items-start min-w-max">
          {columns.map((col) => {
            const isDone = col.title.trim().toLowerCase() === "done";
            return (
              <div
                key={col.id}
                data-colid={col.id}
                className={`flex flex-col w-[82vw] max-w-[320px] sm:w-72 rounded-2xl transition-all duration-200 ${
                  dragOverColId === col.id
                    ? "bg-[#fff1ee] dark:bg-[#F76F53]/10 ring-2 ring-[#F76F53] dark:ring-[#F76F53] shadow-lg"
                    : "bg-[#E6E4D7] dark:bg-[#282828] shadow-sm shadow-[#D8D5C4]/60 dark:shadow-[#1f1f1f]/60"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOverColId(col.id); setDragOverTrash(false); }}
                onDragLeave={() => setDragOverColId(null)}
                onDrop={() => onColumnDrop(col.id)}
              >
                {/* Column header */}
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    {editingColId === col.id ? (
                      <input
                        autoFocus
                        defaultValue={col.title}
                        className="w-full text-sm font-semibold bg-transparent border-b-2 border-[#F76F53] dark:border-[#F76F53] text-[#2C2A22] dark:text-[#e5e2db] outline-none pb-0.5 pr-1"
                        onBlur={(e) => commitRenameColumn(col.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRenameColumn(col.id, e.currentTarget.value);
                          if (e.key === "Escape") setEditingColId(null);
                        }}
                      />
                    ) : (
                      <button
                        className="group flex items-center gap-2 text-left"
                        onClick={() => setEditingColId(col.id)}
                        title="Click to rename"
                      >
                        <span className="text-sm font-semibold text-[#3D3A30] dark:text-[#ccc8c0] group-hover:text-[#1E1C16] dark:group-hover:text-white transition-colors truncate">
                          {col.title}
                        </span>
                        <span className="text-xs font-medium text-[#9C9888] dark:text-[#5e5a55] bg-[#D8D5C4] dark:bg-[#313131] rounded-full px-1.5 py-0.5 tabular-nums">
                          {col.tasks.length}
                        </span>
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => deleteColumn(col.id)}
                    className="p-1 rounded-md text-[#BCB8A8] dark:text-[#4a4641] hover:text-red-400 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex-shrink-0"
                    title="Delete column"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="mx-4 mb-2 h-px bg-[#D8D5C4] dark:bg-[#313131]" />

                {/* Tasks */}
                <div className="flex flex-col gap-2 px-3 min-h-[2px]">
                  {col.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isDone={isDone}
                      onUpdate={(updated) => updateTask(col.id, updated)}
                      onDragStart={() => onTaskDragStart(task.id, col.id)}
                      onDragEnd={onTaskDragEnd}
                      isDragging={dragging?.taskId === task.id}
                      isHolding={holdingCardId === task.id}
                      onTouchStart={(e) => onCardTouchStart(e, task.id, col.id)}
                      onTouchMove={onCardTouchMove}
                      onTouchEnd={onCardTouchEnd}
                      columns={columns}
                      currentColId={col.id}
                      onMove={(targetColId) => moveTask(task.id, col.id, targetColId)}
                      onContextMenu={activeBoardId !== TODAY_BOARD_ID ? (e) => {
                        e.preventDefault();
                        setCardCtxMenu({ taskId: task.id, colId: col.id, x: e.clientX, y: e.clientY });
                      } : undefined}
                    />
                  ))}
                </div>

                {/* Add task */}
                <div className="p-3">
                  {addingTaskColId === col.id ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={newTaskContent}
                        onChange={(e) => setNewTaskContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addTask(col.id); }
                          if (e.key === "Escape") { setNewTaskContent(""); setNewTaskLinks([]); setLinkPopoverOpen(false); setAddingTaskColId(null); }
                        }}
                        placeholder="Task description..."
                        rows={2}
                        className="w-full text-sm p-2.5 rounded-xl bg-[#ECEADA] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] dark:placeholder-[#5e5a55] outline-none focus:border-[#F76F53] dark:focus:border-[#F76F53] focus:ring-2 focus:ring-[#ffddd6] dark:focus:ring-[#F76F53]/20 resize-none transition"
                      />

                      {/* Pending links */}
                      {newTaskLinks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {newTaskLinks.map((link) => (
                            <span key={link.id} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[#fff1ee] dark:bg-[#F76F53]/10 border border-[#f9b9ac] dark:border-[#F76F53]/30 text-[#F76F53] text-xs font-medium max-w-[160px]">
                              <ExternalLinkIcon size={9} />
                              <span className="truncate">{link.label}</span>
                              <button
                                onClick={() => setNewTaskLinks((prev) => prev.filter((l) => l.id !== link.id))}
                                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bottom row: link button + actions */}
                      <div className="flex items-center gap-2">
                        {/* Link popover trigger */}
                        <div className="relative" ref={linkPopoverRef}>
                          <button
                            onClick={() => setLinkPopoverOpen((o) => !o)}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              linkPopoverOpen
                                ? "bg-[#fff1ee] dark:bg-[#F76F53]/10 text-[#F76F53]"
                                : "text-[#9C9888] dark:text-[#5e5a55] hover:text-[#F76F53] hover:bg-[#fff1ee] dark:hover:bg-[#F76F53]/8"
                            }`}
                          >
                            <LinkIcon size={12} />
                            Link
                          </button>

                          {linkPopoverOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-60 rounded-xl bg-white dark:bg-[#282828] border border-[#DDD9C8] dark:border-[#3a3a3a] shadow-xl shadow-[#D8D5C4]/50 dark:shadow-[#1f1f1f]/80 p-3 space-y-2 z-20">
                              <input
                                autoFocus
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const url = newLinkUrl.trim();
                                    if (!url) return;
                                    setNewTaskLinks((prev) => [...prev, { id: genId(), url, label: newLinkLabel.trim() || url }]);
                                    setNewLinkUrl(""); setNewLinkLabel(""); setLinkPopoverOpen(false);
                                  }
                                  if (e.key === "Escape") setLinkPopoverOpen(false);
                                }}
                                placeholder="https://..."
                                className="w-full text-xs px-2.5 py-2 rounded-lg bg-[#F2F0E3] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] outline-none focus:border-[#F76F53] dark:focus:border-[#F76F53] transition"
                              />
                              <input
                                value={newLinkLabel}
                                onChange={(e) => setNewLinkLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const url = newLinkUrl.trim();
                                    if (!url) return;
                                    setNewTaskLinks((prev) => [...prev, { id: genId(), url, label: newLinkLabel.trim() || url }]);
                                    setNewLinkUrl(""); setNewLinkLabel(""); setLinkPopoverOpen(false);
                                  }
                                  if (e.key === "Escape") setLinkPopoverOpen(false);
                                }}
                                placeholder="Label (optional)"
                                className="w-full text-xs px-2.5 py-2 rounded-lg bg-[#F2F0E3] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] outline-none focus:border-[#F76F53] dark:focus:border-[#F76F53] transition"
                              />
                              <button
                                onClick={() => {
                                  const url = newLinkUrl.trim();
                                  if (!url) return;
                                  setNewTaskLinks((prev) => [...prev, { id: genId(), url, label: newLinkLabel.trim() || url }]);
                                  setNewLinkUrl(""); setNewLinkLabel(""); setLinkPopoverOpen(false);
                                }}
                                className="w-full py-1.5 text-xs font-semibold bg-[#F76F53] hover:bg-[#e55c40] text-white rounded-lg transition-colors"
                              >
                                Add Link
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex gap-2">
                          <button
                            onClick={() => addTask(col.id)}
                            className="flex-1 py-1.5 text-xs font-semibold bg-[#F76F53] hover:bg-[#e55c40] text-white rounded-lg transition-colors shadow-sm"
                          >
                            Add Task
                          </button>
                          <button
                            onClick={() => { setNewTaskContent(""); setNewTaskLinks([]); setLinkPopoverOpen(false); setAddingTaskColId(null); }}
                            className="flex-1 py-1.5 text-xs font-semibold bg-[#F2F0E3] dark:bg-[#313131] hover:bg-[#E0DDD0] dark:hover:bg-[#38383f] text-[#5C5849] dark:text-[#a09890] rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTaskColId(col.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-[#9C9888] dark:text-[#5e5a55] hover:text-[#F76F53] dark:hover:text-[#f99080] hover:bg-[#fff1ee] dark:hover:bg-[#F76F53]/8 rounded-xl transition-colors"
                    >
                      <PlusIcon />
                      Add task
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Reorder columns button */}
          {columns.length > 1 && (
            <div className="flex-shrink-0 flex items-start pt-1">
              <button
                onClick={() => setReorderOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[#C8C4B2] dark:border-[#3a3a3a] text-[#9C9888] dark:text-[#5e5a55] hover:border-[#F76F53] dark:hover:border-[#F76F53]/60 hover:text-[#F76F53] dark:hover:text-[#f99080] hover:bg-[#fff1ee]/50 dark:hover:bg-[#F76F53]/6 transition-colors text-xs font-medium"
                title="Reorder columns"
              >
                <GripIcon size={13} />
                Reorder
              </button>
            </div>
          )}

          {/* Add column */}
          <div className="w-[82vw] max-w-[320px] sm:w-72 flex-shrink-0">
            {addingCol ? (
              <div className="rounded-2xl bg-[#F2F0E3] dark:bg-[#282828] shadow-sm p-4 space-y-3">
                <input
                  autoFocus
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addColumn();
                    if (e.key === "Escape") { setAddingCol(false); setNewColTitle(""); }
                  }}
                  placeholder="Column name..."
                  className="w-full text-sm p-2.5 rounded-xl bg-[#ECEADA] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] outline-none focus:border-[#F76F53] dark:focus:border-[#F76F53] focus:ring-2 focus:ring-[#ffddd6] dark:focus:ring-[#F76F53]/20 transition"
                />
                <div className="flex gap-2">
                  <button onClick={addColumn} className="flex-1 py-1.5 text-xs font-semibold bg-[#F76F53] hover:bg-[#e55c40] text-white rounded-lg transition-colors shadow-sm">
                    Add Column
                  </button>
                  <button onClick={() => { setAddingCol(false); setNewColTitle(""); }} className="flex-1 py-1.5 text-xs font-semibold bg-[#F2F0E3] dark:bg-[#313131] hover:bg-[#E0DDD0] dark:hover:bg-[#38383f] text-[#5C5849] dark:text-[#a09890] rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingCol(true)}
                className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#C8C4B2] dark:border-[#3a3a3a] text-[#9C9888] dark:text-[#5e5a55] hover:border-[#F76F53] dark:hover:border-[#F76F53]/60 hover:text-[#F76F53] dark:hover:text-[#f99080] hover:bg-[#fff1ee]/50 dark:hover:bg-[#F76F53]/6 transition-colors text-sm font-medium"
              >
                <PlusIcon size={16} />
                Add Column
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trash zone */}
      <div
        data-trash="true" className={`mx-2 mb-3 sm:mx-6 sm:mb-6 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 py-5 transition-all duration-200 ${
          dragging
            ? dragOverTrash
              ? "border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 scale-[1.01] shadow-lg"
              : "border-red-300 dark:border-red-800 text-red-300 dark:text-red-700 bg-red-50/50 dark:bg-red-950/20"
            : "border-[#DDD9C8] dark:border-[#313131] text-[#BCB8A8] dark:text-[#383430]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOverTrash(true); setDragOverColId(null); }}
        onDragLeave={() => setDragOverTrash(false)}
        onDrop={onTrashDrop}
      >
        <TrashIcon size={18} />
        <span className="text-sm font-medium">
          {dragging ? (dragOverTrash ? "Release to delete" : "Drop here to delete") : "Trash — drag tasks here to delete"}
        </span>
      </div>

      {/* Board context menu */}
      {boardCtxMenu && (
        <div
          ref={boardCtxRef}
          className="fixed z-50 min-w-[140px] rounded-xl bg-white dark:bg-[#282828] border border-[#DDD9C8] dark:border-[#3a3a3a] shadow-xl shadow-[#D8D5C4]/50 dark:shadow-[#1f1f1f]/80 py-1.5 overflow-hidden"
          style={{ top: boardCtxMenu.y, left: boardCtxMenu.x }}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-[#3D3A30] dark:text-[#ccc8c0] hover:bg-[#F2F0E3] dark:hover:bg-[#313131] transition-colors"
            onClick={() => {
              const board = boards.find((b) => b.id === boardCtxMenu.boardId);
              if (board) { setRenamingBoardId(board.id); setRenamingBoardName(board.name); setActiveBoardId(board.id); }
              setBoardCtxMenu(null);
            }}
          >
            Rename
          </button>
          {boards.length > 1 && boardCtxMenu.boardId !== TODAY_BOARD_ID && (
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              onClick={() => { deleteBoard(boardCtxMenu.boardId); setBoardCtxMenu(null); }}
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Reorder columns dialog */}
      {reorderOpen && (
        <ReorderColumnsDialog
          columns={columns}
          onSave={reorderColumns}
          onClose={() => setReorderOpen(false)}
        />
      )}

      {/* Card context menu */}
      {cardCtxMenu && (
        <div
          ref={cardCtxRef}
          className="fixed z-50 min-w-[160px] rounded-xl bg-white dark:bg-[#282828] border border-[#DDD9C8] dark:border-[#3a3a3a] shadow-xl shadow-[#D8D5C4]/50 dark:shadow-[#1f1f1f]/80 py-1.5 overflow-hidden"
          style={{ top: cardCtxMenu.y, left: cardCtxMenu.x }}
        >
          <button
            className="w-full text-left px-3 py-2 text-sm text-[#3D3A30] dark:text-[#ccc8c0] hover:bg-[#fff1ee] dark:hover:bg-[#F76F53]/10 hover:text-[#F76F53] dark:hover:text-[#f99080] transition-colors flex items-center gap-2"
            onClick={() => {
              moveTaskToToday(cardCtxMenu.taskId, cardCtxMenu.colId);
              setCardCtxMenu(null);
            }}
          >
            <CalendarIcon size={13} />
            Move to Today
          </button>
        </div>
      )}
    </div>
  );
}
