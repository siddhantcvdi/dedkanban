"use client";

import { useState, useRef, useCallback } from "react";
import { Task, TaskLink, Column, genId } from "./types";
import { useClickOutside } from "./hooks";
import { PlusIcon, ExternalLinkIcon, LinkIcon } from "./icons";
import { TaskCard } from "./TaskCard";

export function KanbanColumn({
  col,
  isToday,
  isDragOver,
  dragging,
  holdingCardId,
  columns,
  dragOverTaskId,
  dragOverPosition,
  onDelete,
  onRename,
  onAddTask,
  onUpdateTask,
  onMoveTask,
  onCardMouseDown,
  onCardTouchStart,
  onCardTouchMove,
  onCardTouchEnd,
  onCardContextMenu,
  onCardMenuButton,
}: {
  col: Column;
  isToday: boolean;
  isDragOver: boolean;
  dragging: { taskId: string; colId: string } | null;
  holdingCardId: string | null;
  columns: Column[];
  dragOverTaskId: string | null;
  dragOverPosition: "before" | "after";
  onDelete: () => void;
  onRename: (title: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (updated: Task) => void;
  onMoveTask: (taskId: string, targetColId: string) => void;
  onCardMouseDown: (e: React.MouseEvent, taskId: string) => void;
  onCardTouchStart: (e: React.TouchEvent, taskId: string) => void;
  onCardTouchMove: (e: React.TouchEvent) => void;
  onCardTouchEnd: (e: React.TouchEvent) => void;
  onCardContextMenu?: (taskId: string, x: number, y: number) => void;
  onCardMenuButton?: (taskId: string, x: number, y: number) => void;
}) {
  const isDone = col.title.trim().toLowerCase() === "done";

  const [editingTitle, setEditingTitle] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState("");
  const [newTaskLinks, setNewTaskLinks] = useState<TaskLink[]>([]);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");

  const linkPopoverRef = useRef<HTMLDivElement>(null);
  useClickOutside(linkPopoverRef, useCallback(() => { setLinkPopoverOpen(false); setNewLinkUrl(""); setNewLinkLabel(""); }, []));

  function handleAddTask() {
    const content = newTaskContent.trim();
    if (!content) return;
    onAddTask({ id: genId(), content, links: newTaskLinks });
    setNewTaskContent("");
    setNewTaskLinks([]);
    setLinkPopoverOpen(false);
    setNewLinkUrl("");
    setNewLinkLabel("");
    setAddingTask(false);
  }

  function handleCancelAddTask() {
    setNewTaskContent("");
    setNewTaskLinks([]);
    setLinkPopoverOpen(false);
    setAddingTask(false);
  }

  function handleAddLink() {
    const url = newLinkUrl.trim();
    if (!url) return;
    setNewTaskLinks((prev) => [...prev, { id: genId(), url, label: newLinkLabel.trim() || url }]);
    setNewLinkUrl("");
    setNewLinkLabel("");
    setLinkPopoverOpen(false);
  }

  return (
    <div
      data-colid={col.id}
      className={`flex flex-col w-[82vw] max-w-[320px] sm:w-72 rounded-2xl transition-all duration-200 ${
        isDragOver
          ? "bg-[#fff1ee] dark:bg-[#F76F53]/10 ring-2 ring-[#F76F53] dark:ring-[#F76F53] shadow-lg"
          : "bg-[#E6E4D7] dark:bg-[#282828] shadow-sm shadow-[#D8D5C4]/60 dark:shadow-[#1f1f1f]/60"
      }`}
    >
      {/* Column header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              defaultValue={col.title}
              className="w-full text-sm font-semibold bg-transparent border-b-2 border-[#F76F53] dark:border-[#F76F53] text-[#2C2A22] dark:text-[#e5e2db] outline-none pb-0.5 pr-1"
              onBlur={(e) => { onRename(e.target.value); setEditingTitle(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onRename(e.currentTarget.value); setEditingTitle(false); }
                if (e.key === "Escape") setEditingTitle(false);
              }}
            />
          ) : (
            <button className="group flex items-center gap-2 text-left" onClick={() => setEditingTitle(true)} title="Click to rename">
              <span className="text-sm font-semibold text-[#3D3A30] dark:text-[#ccc8c0] group-hover:text-[#1E1C16] dark:group-hover:text-white transition-colors truncate">{col.title}</span>
              <span className="text-xs font-medium text-[#9C9888] dark:text-[#5e5a55] bg-[#D8D5C4] dark:bg-[#313131] rounded-full px-1.5 py-0.5 tabular-nums">{col.tasks.length}</span>
            </button>
          )}
        </div>
        {!isToday && (
          <button
            onClick={onDelete}
            className="p-1 rounded-md text-[#BCB8A8] dark:text-[#4a4641] hover:text-red-400 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex-shrink-0"
            title="Delete column"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="mx-4 mb-2 h-px bg-[#D8D5C4] dark:bg-[#313131]" />

      {/* Tasks */}
      <div className="flex flex-col gap-2 px-3 min-h-[2px] overflow-y-auto no-scrollbar max-h-[calc(100svh-280px)]">
        {col.tasks.map((task) => {
          const isTarget = !!dragging && dragOverTaskId === task.id && dragging.taskId !== task.id;
          return (
            <div
              key={task.id}
              data-taskid={task.id}
              className="relative"
            >
              <div className={`absolute inset-x-0 -top-1 h-0.5 bg-[#F76F53] rounded-full pointer-events-none z-10 transition-opacity duration-75 ${isTarget && dragOverPosition === "before" ? "opacity-100" : "opacity-0"}`} />
              <div className={`absolute inset-x-0 -bottom-1 h-0.5 bg-[#F76F53] rounded-full pointer-events-none z-10 transition-opacity duration-75 ${isTarget && dragOverPosition === "after" ? "opacity-100" : "opacity-0"}`} />
              <TaskCard
                task={task}
                isDone={isDone}
                onUpdate={onUpdateTask}
                onMouseDown={(e) => onCardMouseDown(e, task.id)}
                isDragging={dragging?.taskId === task.id}
                isHolding={holdingCardId === task.id}
                onTouchStart={(e) => onCardTouchStart(e, task.id)}
                onTouchMove={onCardTouchMove}
                onTouchEnd={onCardTouchEnd}
                columns={columns}
                currentColId={col.id}
                onMove={(targetColId) => onMoveTask(task.id, targetColId)}
                onContextMenu={onCardContextMenu ? (e) => { e.preventDefault(); onCardContextMenu(task.id, e.clientX, e.clientY); } : undefined}
                onMenuButtonClick={onCardMenuButton ? (x, y) => onCardMenuButton(task.id, x, y) : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* Add task */}
      <div className="p-3">
        {addingTask ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={newTaskContent}
              onChange={(e) => setNewTaskContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddTask(); }
                if (e.key === "Escape") handleCancelAddTask();
              }}
              placeholder="Task description..."
              rows={2}
              className="w-full text-sm p-2.5 rounded-xl bg-[#ECEADA] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] dark:placeholder-[#5e5a55] outline-none focus:border-[#F76F53] dark:focus:border-[#F76F53] focus:ring-2 focus:ring-[#ffddd6] dark:focus:ring-[#F76F53]/20 resize-none transition"
            />
            {newTaskLinks.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {newTaskLinks.map((link) => (
                  <span key={link.id} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[#fff1ee] dark:bg-[#F76F53]/10 border border-[#f9b9ac] dark:border-[#F76F53]/30 text-[#F76F53] text-xs font-medium max-w-[160px]">
                    <ExternalLinkIcon size={9} />
                    <span className="truncate">{link.label}</span>
                    <button onClick={() => setNewTaskLinks((prev) => prev.filter((l) => l.id !== link.id))} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="relative" ref={linkPopoverRef}>
                <button
                  onClick={() => setLinkPopoverOpen((o) => !o)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${linkPopoverOpen ? "bg-[#fff1ee] dark:bg-[#F76F53]/10 text-[#F76F53]" : "text-[#9C9888] dark:text-[#5e5a55] hover:text-[#F76F53] hover:bg-[#fff1ee] dark:hover:bg-[#F76F53]/8"}`}
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
                        if (e.key === "Enter") { e.preventDefault(); handleAddLink(); }
                        if (e.key === "Escape") setLinkPopoverOpen(false);
                      }}
                      placeholder="https://..."
                      className="w-full text-xs px-2.5 py-2 rounded-lg bg-[#F2F0E3] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] outline-none focus:border-[#F76F53] dark:focus:border-[#F76F53] transition"
                    />
                    <input
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleAddLink(); }
                        if (e.key === "Escape") setLinkPopoverOpen(false);
                      }}
                      placeholder="Label (optional)"
                      className="w-full text-xs px-2.5 py-2 rounded-lg bg-[#F2F0E3] dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] outline-none focus:border-[#F76F53] dark:focus:border-[#F76F53] transition"
                    />
                    <button
                      onClick={handleAddLink}
                      className="w-full py-1.5 text-xs font-semibold bg-[#F76F53] hover:bg-[#e55c40] text-white rounded-lg transition-colors"
                    >
                      Add Link
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 flex gap-2">
                <button onClick={handleAddTask} className="flex-1 py-1.5 text-xs font-semibold bg-[#F76F53] hover:bg-[#e55c40] text-white rounded-lg transition-colors shadow-sm">Add Task</button>
                <button onClick={handleCancelAddTask} className="flex-1 py-1.5 text-xs font-semibold bg-[#F2F0E3] dark:bg-[#313131] hover:bg-[#E0DDD0] dark:hover:bg-[#38383f] text-[#5C5849] dark:text-[#a09890] rounded-lg transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-[#9C9888] dark:text-[#5e5a55] hover:text-[#F76F53] dark:hover:text-[#f99080] hover:bg-[#fff1ee] dark:hover:bg-[#F76F53]/8 rounded-xl transition-colors"
          >
            <PlusIcon />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}
