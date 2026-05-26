"use client";

import { useState } from "react";
import { Task, Column } from "./types";
import { ExternalLinkIcon, DotsVerticalIcon } from "./icons";
import { TaskModal } from "./TaskModal";

export function TaskCard({
  task,
  isDone,
  onUpdate,
  onMouseDown,
  isDragging,
  isHolding,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  columns,
  currentColId,
  onMove,
  onContextMenu,
  onMenuButtonClick,
}: {
  task: Task;
  isDone: boolean;
  onUpdate: (updated: Task) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
  isHolding: boolean;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  columns: Column[];
  currentColId: string;
  onMove: (targetColId: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMenuButtonClick?: (x: number, y: number) => void;
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
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => setModalOpen(true)}
        onContextMenu={onContextMenu}
        style={{ touchAction: isDragging || isHolding ? "none" : "pan-x pan-y" }}
        className={`group p-3 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
          isDragging
            ? "opacity-40 scale-95 bg-[#F2F0E3] dark:bg-[#313131] border-[#DDD9C8] dark:border-[#3a3a3a]"
            : isHolding
            ? "bg-[#F2F0E3] dark:bg-[#313131] border-[#F76F53] dark:border-[#F76F53] scale-[1.02] shadow-lg shadow-[#F76F53]/20 ring-2 ring-[#F76F53]/30"
            : "bg-[#F2F0E3] dark:bg-[#313131] border-[#DDD9C8] dark:border-[#3a3a3a] hover:border-[#f59a87] dark:hover:border-[#F76F53]/50 hover:shadow-md hover:shadow-[#D8D5C4]/50 dark:hover:shadow-[#1f1f1f]/50"
        }`}
      >
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">
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
          </div>
          {onMenuButtonClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                onMenuButtonClick(rect.left, rect.bottom + 4);
              }}
              className="flex-shrink-0 p-0.5 -mr-0.5 rounded-md text-[#BCB8A8] dark:text-[#4a4641] opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:text-[#5C5849] dark:hover:text-[#a09890] hover:bg-[#DDD9C8]/60 dark:hover:bg-[#3a3a3a] transition-all"
              title="Options"
            >
              <DotsVerticalIcon size={14} />
            </button>
          )}
        </div>
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
