"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { User } from "firebase/auth";
import { Board, ThemeMode, TODAY_BOARD_ID } from "./types";
import { useClickOutside } from "./hooks";
import { SunIcon, MoonIcon, PlusIcon, CalendarIcon, DotsVerticalIcon } from "./icons";

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return mode === "dark" ? <MoonIcon size={16} /> : <SunIcon size={16} />;
}

export function KanbanHeader({
  boards,
  activeBoardId,
  onBoardChange,
  onAddBoard,
  onDeleteBoard,
  onRenameBoard,
  syncing,
  user,
  onSignOut,
  themeMode,
  onThemeToggle,
}: {
  boards: Board[];
  activeBoardId: string;
  onBoardChange: (id: string) => void;
  onAddBoard: (name: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onRenameBoard: (boardId: string, name: string) => void;
  syncing: boolean;
  user: User | null;
  onSignOut: () => void;
  themeMode: ThemeMode;
  onThemeToggle: () => void;
}) {
  const [addingBoard, setAddingBoard] = useState(false);
  const [addingBoardName, setAddingBoardName] = useState("");
  const [boardCtxMenu, setBoardCtxMenu] = useState<{ boardId: string; x: number; y: number } | null>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renamingBoardName, setRenamingBoardName] = useState("");

  const newBoardInputRef = useRef<HTMLDivElement>(null);
  const boardCtxRef = useRef<HTMLDivElement>(null);

  useClickOutside(newBoardInputRef, useCallback(() => { setAddingBoard(false); setAddingBoardName(""); }, []));
  useClickOutside(boardCtxRef, useCallback(() => setBoardCtxMenu(null), []));

  useEffect(() => {
    if (!boardCtxMenu) return;
    const close = () => setBoardCtxMenu(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [boardCtxMenu]);

  function handleAddBoard() {
    const name = addingBoardName.trim();
    if (!name) return;
    onAddBoard(name);
    setAddingBoardName("");
    setAddingBoard(false);
  }

  function commitRenameBoard(boardId: string, name: string) {
    onRenameBoard(boardId, name);
    setRenamingBoardId(null);
    setRenamingBoardName("");
  }

  return (
    <div className="sticky top-0 z-20 px-4 max-md:px-2 pt-4 pb-0 pointer-events-none">
      <header className="pointer-events-auto flex items-center bg-[#E6E4D7]/90 dark:bg-[#282828]/90 backdrop-blur-md border border-[#DDD9C8] dark:border-[#313131] shadow-sm shadow-[#D8D5C4]/60 dark:shadow-[#1f1f1f]/60 rounded-2xl h-14 overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 flex-shrink-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#F76F53] to-[#c94523] flex items-center justify-center shadow-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="11" rx="1" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-[#9C9888] dark:text-[#5e5a55] tracking-tight hidden sm:block select-none">DedKanban</span>
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
              onClick={() => onBoardChange(b.id)}
              onContextMenu={(e) => { e.preventDefault(); setBoardCtxMenu({ boardId: b.id, x: e.clientX, y: e.clientY }); }}
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
              {b.id !== TODAY_BOARD_ID && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setBoardCtxMenu({ boardId: b.id, x: rect.left, y: rect.bottom + 4 });
                  }}
                  className="flex-shrink-0 p-0.5 -mr-1 rounded opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                  title="Options"
                >
                  <DotsVerticalIcon size={12} />
                </button>
              )}
            </div>
          ))}

          {addingBoard ? (
            <div ref={newBoardInputRef} className="flex items-center gap-1 px-2 h-9 flex-shrink-0">
              <input
                autoFocus
                value={addingBoardName}
                onChange={(e) => setAddingBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddBoard();
                  if (e.key === "Escape") { setAddingBoard(false); setAddingBoardName(""); }
                }}
                placeholder="Board name…"
                className="text-xs px-2 py-1 rounded-lg bg-[#F2F0E3] dark:bg-[#313131] border border-[#F76F53] dark:border-[#F76F53] text-[#2C2A22] dark:text-[#e5e2db] placeholder-[#9C9888] outline-none w-32 transition"
              />
              <button onClick={handleAddBoard} className="text-xs px-2 py-1 bg-[#F76F53] hover:bg-[#e55c40] text-white rounded-lg transition-colors font-semibold">Add</button>
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

        {/* Sync + auth + theme */}
        <div className="flex items-center gap-1 flex-shrink-0 pr-3">
          {syncing && (
            <svg className="animate-spin text-[#9C9888] dark:text-[#5e5a55]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
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
                onClick={onSignOut}
                className="px-2 py-1 rounded-lg text-xs text-[#9C9888] dark:text-[#5e5a55] hover:text-red-400 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Sign out"
              >
                Out
              </button>
            </div>
          )}
          <button
            onClick={onThemeToggle}
            className="flex items-center px-2 py-1.5 rounded-lg text-[#9C9888] dark:text-[#5e5a55] hover:bg-[#F2F0E3] dark:hover:bg-[#313131] hover:text-[#5C5849] dark:hover:text-[#a09890] transition-colors"
            title={`Theme: ${themeMode}`}
          >
            <ThemeIcon mode={themeMode} />
          </button>
        </div>
      </header>

      {boardCtxMenu && (
        <div
          ref={boardCtxRef}
          className="fixed z-50 pointer-events-auto min-w-[140px] rounded-xl bg-white dark:bg-[#282828] border border-[#DDD9C8] dark:border-[#3a3a3a] shadow-xl shadow-[#D8D5C4]/50 dark:shadow-[#1f1f1f]/80 py-1.5 overflow-hidden"
          style={{
            top: Math.min(boardCtxMenu.y, window.innerHeight - 96),
            left: Math.min(boardCtxMenu.x, window.innerWidth - 148),
          }}
        >
          {boardCtxMenu.boardId !== TODAY_BOARD_ID && (
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-[#3D3A30] dark:text-[#ccc8c0] hover:bg-[#F2F0E3] dark:hover:bg-[#313131] transition-colors"
              onClick={() => {
                const board = boards.find((b) => b.id === boardCtxMenu.boardId);
                if (board) {
                  setRenamingBoardId(board.id);
                  setRenamingBoardName(board.name);
                  onBoardChange(board.id);
                }
                setBoardCtxMenu(null);
              }}
            >
              Rename
            </button>
          )}
          {boards.length > 1 && boardCtxMenu.boardId !== TODAY_BOARD_ID && (
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              onClick={() => { onDeleteBoard(boardCtxMenu.boardId); setBoardCtxMenu(null); }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
