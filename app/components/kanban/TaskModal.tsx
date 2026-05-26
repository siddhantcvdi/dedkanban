"use client";

import { useState, useEffect, useRef } from "react";
import { Task, TaskLink, Column } from "./types";
import { genId } from "./types";
import { ExternalLinkIcon, LinkIcon } from "./icons";

export function TaskModal({
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
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
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
