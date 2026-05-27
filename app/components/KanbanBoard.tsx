"use client";

import { useState, useRef, useCallback, useEffect } from "react";

import {
  Task, Column,
  TODAY_BOARD_ID, TODAY_COL_TODO_ID,
  genId,
} from "./kanban/types";
import { useClickOutside } from "./kanban/hooks";
import { CalendarIcon, PlusIcon, GripIcon } from "./kanban/icons";
import { useKanbanData } from "./kanban/useKanbanData";
import { SignInPage } from "./kanban/SignInPage";
import { KanbanHeader } from "./kanban/KanbanHeader";
import { KanbanColumn } from "./kanban/KanbanColumn";
import { TrashZone } from "./kanban/TrashZone";
import { ReorderColumnsDialog } from "./kanban/ReorderColumnsDialog";

export default function KanbanBoard() {
  const {
    boards, setBoards,
    activeBoardId, setActiveBoardId,
    themeMode, setThemeMode,
    mounted, user,
    syncing, signingIn,
    boardsLoaded,
    handleGoogleSignIn, handleSignOut,
  } = useKanbanData();

  // Drag state
  const [dragging, setDragging] = useState<{ taskId: string; colId: string } | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"before" | "after">("after");

  // Touch DnD
  const [holdingCardId, setHoldingCardId] = useState<string | null>(null);
  const touchRef = useRef<{ taskId: string; colId: string; ghost: HTMLElement | null; startX: number; startY: number; active: boolean; holdReady: boolean; holdTimer: ReturnType<typeof setTimeout> | null } | null>(null);
  // Mouse DnD
  const mouseRef = useRef<{ taskId: string; colId: string; el: HTMLElement; ghost: HTMLElement | null; startX: number; startY: number; offsetX: number; offsetY: number; active: boolean } | null>(null);
  const dragOverRef = useRef<{ taskId: string | null; position: "before" | "after" }>({ taskId: null, position: "after" });
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);

  // Add column state
  const [addingCol, setAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  // Card context menu
  const [cardCtxMenu, setCardCtxMenu] = useState<{ taskId: string; colId: string; x: number; y: number } | null>(null);
  const cardCtxRef = useRef<HTMLDivElement>(null);

  // Reorder columns dialog
  const [reorderOpen, setReorderOpen] = useState(false);

  useClickOutside(cardCtxRef, useCallback(() => setCardCtxMenu(null), []));

  useEffect(() => {
    if (!cardCtxMenu) return;
    const close = () => setCardCtxMenu(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [cardCtxMenu]);

  // Latest-ref pattern so mouse handlers (registered once) always see current state
  const latestRef = useRef({ onColumnDrop: (_id: string) => {}, onTrashDrop: () => {}, clearDragState: () => {} });
  latestRef.current.onColumnDrop = onColumnDrop;
  latestRef.current.onTrashDrop = onTrashDrop;
  latestRef.current.clearDragState = clearDragState;

  useEffect(() => {
    function onTouchMoveDoc(e: TouchEvent) {
      if (touchRef.current?.active) e.preventDefault();
    }
    window.addEventListener("touchmove", onTouchMoveDoc, { passive: false });

    function onMove(e: MouseEvent) {
      const s = mouseRef.current;
      if (!s) return;
      if (!s.active) {
        if (Math.hypot(e.clientX - s.startX, e.clientY - s.startY) < 4) return;
        const rect = s.el.getBoundingClientRect();
        s.offsetX = s.startX - rect.left;
        s.offsetY = s.startY - rect.top;
        const ghost = s.el.cloneNode(true) as HTMLElement;
        Object.assign(ghost.style, { position: "fixed", top: rect.top + "px", left: rect.left + "px", width: rect.width + "px", opacity: "0.85", zIndex: "9999", pointerEvents: "none", transform: "scale(1.03)", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", transition: "none" });
        document.body.appendChild(ghost);
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        s.ghost = ghost;
        s.active = true;
        setDragging({ taskId: s.taskId, colId: s.colId });
      }
      if (!s.ghost) return;
      s.ghost.style.top = (e.clientY - s.offsetY) + "px";
      s.ghost.style.left = (e.clientX - s.offsetX) + "px";
      const board = boardScrollRef.current;
      if (board) {
        if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
        const edge = 72, speed = 10;
        const bRect = board.getBoundingClientRect();
        const dl = e.clientX - bRect.left, dr = bRect.right - e.clientX;
        if (dl < edge || dr < edge) {
          const scroll = () => {
            if (!mouseRef.current?.active) return;
            if (dl < edge) board.scrollLeft -= speed * (1 - dl / edge);
            if (dr < edge) board.scrollLeft += speed * (1 - dr / edge);
            scrollAnimRef.current = requestAnimationFrame(scroll);
          };
          scrollAnimRef.current = requestAnimationFrame(scroll);
        }
      }
      s.ghost.style.display = "none";
      const under = document.elementFromPoint(e.clientX, e.clientY);
      s.ghost.style.display = "";
      setDragOverColId(under?.closest("[data-colid]")?.getAttribute("data-colid") ?? null);
      setDragOverTrash(!!under?.closest("[data-trash]"));
      const taskEl = under?.closest<HTMLElement>("[data-taskid]");
      if (taskEl && taskEl.dataset.taskid !== s.taskId) {
        const r = taskEl.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        const buf = 6;
        const prev = dragOverRef.current;
        let pos: "before" | "after";
        if (e.clientY < mid - buf) pos = "before";
        else if (e.clientY > mid + buf) pos = "after";
        else pos = prev.position; // dead zone — keep last
        const tid = taskEl.dataset.taskid ?? null;
        if (tid !== prev.taskId || pos !== prev.position) {
          dragOverRef.current = { taskId: tid, position: pos };
          setDragOverTaskId(tid);
          setDragOverPosition(pos);
        }
      } else if (dragOverRef.current.taskId !== null) {
        dragOverRef.current = { taskId: null, position: "after" };
        setDragOverTaskId(null);
      }
    }

    function onUp(e: MouseEvent) {
      if (scrollAnimRef.current) { cancelAnimationFrame(scrollAnimRef.current); scrollAnimRef.current = null; }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const s = mouseRef.current;
      if (!s) return;
      mouseRef.current = null;
      if (!s.active) return;
      s.ghost!.style.display = "none";
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if (s.ghost) document.body.removeChild(s.ghost);
      if (under?.closest("[data-trash]")) { latestRef.current.onTrashDrop(); }
      else {
        const targetId = under?.closest("[data-colid]")?.getAttribute("data-colid");
        if (targetId) latestRef.current.onColumnDrop(targetId);
        else latestRef.current.clearDragState();
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("touchmove", onTouchMoveDoc);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Helpers ----
  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const columns = activeBoard?.columns ?? [];
  const isToday = activeBoardId === TODAY_BOARD_ID;

  function updateColumns(updater: (cols: Column[]) => Column[]) {
    setBoards((prev) =>
      prev.map((b) => (b.id === activeBoardId ? { ...b, columns: updater(b.columns) } : b))
    );
  }

  // ---- Drag & Drop ----
  function onCardMouseDown(e: React.MouseEvent, taskId: string, colId: string) {
    if (e.button !== 0) return;
    mouseRef.current = { taskId, colId, el: e.currentTarget as HTMLElement, ghost: null, startX: e.clientX, startY: e.clientY, offsetX: 0, offsetY: 0, active: false };
  }

  function clearDragState() {
    setDragging(null);
    setDragOverColId(null);
    setDragOverTrash(false);
    setDragOverTaskId(null);
    dragOverRef.current = { taskId: null, position: "after" };
  }

  function onColumnDrop(targetColId: string) {
    if (!dragging) { clearDragState(); return; }
    // Allow same-column drop only when targeting a specific task position
    if (dragging.colId === targetColId && !dragOverTaskId) { clearDragState(); return; }
    moveTask(dragging.taskId, dragging.colId, targetColId, dragOverTaskId, dragOverPosition);
    clearDragState();
  }

  function onTrashDrop() {
    if (!dragging) return;
    updateColumns((cols) =>
      cols.map((col) =>
        col.id === dragging.colId ? { ...col, tasks: col.tasks.filter((t) => t.id !== dragging.taskId) } : col
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
      const board = boardScrollRef.current;
      if (board) {
        if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
        const edge = 72, speed = 10;
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
      const taskEl = under?.closest<HTMLElement>("[data-taskid]");
      if (taskEl && taskEl.dataset.taskid !== s.taskId) {
        const r = taskEl.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        const buf = 6;
        const prev = dragOverRef.current;
        let pos: "before" | "after";
        if (t.clientY < mid - buf) pos = "before";
        else if (t.clientY > mid + buf) pos = "after";
        else pos = prev.position;
        const tid = taskEl.dataset.taskid ?? null;
        if (tid !== prev.taskId || pos !== prev.position) {
          dragOverRef.current = { taskId: tid, position: pos };
          setDragOverTaskId(tid);
          setDragOverPosition(pos);
        }
      } else if (dragOverRef.current.taskId !== null) {
        dragOverRef.current = { taskId: null, position: "after" };
        setDragOverTaskId(null);
      }
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
        else clearDragState();
      }
    }
    clearDragState();
    touchRef.current = null;
  }

  function onCardTouchCancel() {
    if (scrollAnimRef.current) { cancelAnimationFrame(scrollAnimRef.current); scrollAnimRef.current = null; }
    const s = touchRef.current;
    if (!s) return;
    if (s.holdTimer) clearTimeout(s.holdTimer);
    if (s.ghost && document.body.contains(s.ghost)) document.body.removeChild(s.ghost);
    setHoldingCardId(null);
    clearDragState();
    touchRef.current = null;
  }

  // ---- Column actions ----
  function addColumn() {
    const title = newColTitle.trim();
    if (!title) return;
    updateColumns((cols) => [...cols, { id: genId(), title, tasks: [] }]);
    setNewColTitle("");
    setAddingCol(false);
  }

  function reorderColumns(reordered: Column[]) { updateColumns(() => reordered); }

  // ---- Task actions ----
  function addTask(colId: string, task: Task) {
    updateColumns((cols) =>
      cols.map((col) => col.id === colId ? { ...col, tasks: [...col.tasks, task] } : col)
    );
  }

  function moveTask(taskId: string, fromColId: string, toColId: string, insertNearTaskId?: string | null, insertPosition?: "before" | "after") {
    const task = columns.find((c) => c.id === fromColId)?.tasks.find((t) => t.id === taskId);
    const targetColTitle = columns.find((c) => c.id === toColId)?.title;

    function insertTask(tasks: Task[], t: Task): Task[] {
      if (!insertNearTaskId) return [...tasks, t];
      const nearIdx = tasks.findIndex((x) => x.id === insertNearTaskId);
      if (nearIdx === -1) return [...tasks, t];
      const idx = insertPosition === "before" ? nearIdx : nearIdx + 1;
      const next = [...tasks];
      next.splice(idx, 0, t);
      return next;
    }

    updateColumns((cols) => {
      const srcTask = cols.find((c) => c.id === fromColId)?.tasks.find((t) => t.id === taskId);
      if (!srcTask) return cols;
      if (fromColId === toColId) {
        return cols.map((col) => {
          if (col.id !== fromColId) return col;
          const filtered = col.tasks.filter((t) => t.id !== taskId);
          return { ...col, tasks: insertTask(filtered, srcTask) };
        });
      }
      return cols.map((col) => {
        if (col.id === fromColId) return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
        if (col.id === toColId) return { ...col, tasks: insertTask(col.tasks, srcTask) };
        return col;
      });
    });

    // When moving in Today, mirror the move in the source board if a matching column exists
    if (isToday && task?.sourceBoardId && task?.sourceTaskId && targetColTitle) {
      const { sourceBoardId, sourceTaskId } = task;
      setBoards((prev) => prev.map((board) => {
        if (board.id !== sourceBoardId) return board;
        const sourceColId = board.columns.find((c) => c.tasks.some((t) => t.id === sourceTaskId))?.id;
        const targetCol = board.columns.find((c) => c.title.trim().toLowerCase() === targetColTitle.trim().toLowerCase());
        if (!sourceColId || !targetCol || sourceColId === targetCol.id) return board;
        const sourceTask = board.columns.find((c) => c.id === sourceColId)?.tasks.find((t) => t.id === sourceTaskId);
        if (!sourceTask) return board;
        return {
          ...board,
          columns: board.columns.map((col) => {
            if (col.id === sourceColId) return { ...col, tasks: col.tasks.filter((t) => t.id !== sourceTaskId) };
            if (col.id === targetCol.id) return { ...col, tasks: [...col.tasks, sourceTask] };
            return col;
          }),
        };
      }));
    }
  }

  function updateTask(colId: string, updated: Task) {
    updateColumns((cols) =>
      cols.map((col) => col.id === colId ? { ...col, tasks: col.tasks.map((t) => (t.id === updated.id ? updated : t)) } : col)
    );
  }

  // ---- Board actions ----
  function addBoard(name: string) {
    const newBoard = {
      id: genId(), name, columns: [
        { id: genId(), title: "To Do", tasks: [] },
        { id: genId(), title: "In Progress", tasks: [] },
        { id: genId(), title: "Done", tasks: [] },
      ],
    };
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
  }

  function deleteBoard(boardId: string) {
    if (boardId === TODAY_BOARD_ID) return;
    if (boards.length === 1) return;
    const remaining = boards.filter((b) => b.id !== boardId);
    setBoards(remaining);
    if (activeBoardId === boardId) setActiveBoardId(remaining[0].id);
  }

  function renameBoard(boardId: string, name: string) {
    const trimmed = name.trim();
    if (trimmed) setBoards((prev) => prev.map((b) => b.id === boardId ? { ...b, name: trimmed } : b));
  }

  function moveTaskToToday(taskId: string, fromColId: string) {
    const sourceBoard = boards.find((b) => b.id === activeBoardId);
    if (!sourceBoard) return;
    const task = sourceBoard.columns.find((c) => c.id === fromColId)?.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const taskCopy: Task = { ...task, id: genId(), sourceBoardName: sourceBoard.name, sourceBoardId: sourceBoard.id, sourceTaskId: task.id };
    setBoards((prev) =>
      prev.map((board) =>
        board.id === TODAY_BOARD_ID
          ? { ...board, columns: board.columns.map((col) => col.id === TODAY_COL_TODO_ID ? { ...col, tasks: [...col.tasks, taskCopy] } : col) }
          : board
      )
    );
  }

  // ---- Render gates ----
  if (!mounted) return <div className="min-h-screen bg-[#F2F0E3] dark:bg-[#1f1f1f]" />;

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
    return <SignInPage signingIn={signingIn} onSignIn={handleGoogleSignIn} />;
  }

  return (
    <div className="h-dvh flex flex-col bg-[#F2F0E3] dark:bg-[#1f1f1f] transition-colors duration-300">
      <KanbanHeader
        boards={boards}
        activeBoardId={activeBoardId}
        onBoardChange={setActiveBoardId}
        onAddBoard={addBoard}
        onDeleteBoard={deleteBoard}
        onRenameBoard={renameBoard}
        syncing={syncing}
        user={user}
        onSignOut={handleSignOut}
        themeMode={themeMode}
        onThemeToggle={() => setThemeMode((m) => m === "light" ? "dark" : "light")}
      />

      {/* Board canvas */}
      <div ref={boardScrollRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden no-scrollbar">
        <div className="flex gap-3 px-2 pt-3 pb-6 sm:gap-4 sm:px-4 sm:pt-4 items-start min-w-max">
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              isToday={isToday}
              isDragOver={dragOverColId === col.id}
              dragging={dragging}
              holdingCardId={holdingCardId}
              columns={columns}
              dragOverTaskId={dragOverTaskId}
              dragOverPosition={dragOverPosition}
              onDelete={() => updateColumns((cols) => cols.filter((c) => c.id !== col.id))}
              onRename={(title) => updateColumns((cols) => cols.map((c) => c.id === col.id ? { ...c, title: title.trim() || "Untitled" } : c))}
              onAddTask={(task) => addTask(col.id, task)}
              onUpdateTask={(updated) => updateTask(col.id, updated)}
              onMoveTask={(taskId, targetColId) => moveTask(taskId, col.id, targetColId)}
              onCardMouseDown={(e, taskId) => onCardMouseDown(e, taskId, col.id)}
              onCardTouchStart={(e, taskId) => onCardTouchStart(e, taskId, col.id)}
              onCardTouchMove={onCardTouchMove}
              onCardTouchEnd={onCardTouchEnd}
              onCardTouchCancel={onCardTouchCancel}
              onCardContextMenu={!isToday ? (taskId, x, y) => setCardCtxMenu({ taskId, colId: col.id, x, y }) : undefined}
              onCardMenuButton={!isToday ? (taskId, x, y) => setCardCtxMenu({ taskId, colId: col.id, x, y }) : undefined}
            />
          ))}

          {/* Reorder columns */}
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
                  <button onClick={addColumn} className="flex-1 py-1.5 text-xs font-semibold bg-[#F76F53] hover:bg-[#e55c40] text-white rounded-lg transition-colors shadow-sm">Add Column</button>
                  <button onClick={() => { setAddingCol(false); setNewColTitle(""); }} className="flex-1 py-1.5 text-xs font-semibold bg-[#F2F0E3] dark:bg-[#313131] hover:bg-[#E0DDD0] dark:hover:bg-[#38383f] text-[#5C5849] dark:text-[#a09890] rounded-lg transition-colors">Cancel</button>
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

      <TrashZone
        dragging={!!dragging}
        dragOverTrash={dragOverTrash}
      />

      {reorderOpen && (
        <ReorderColumnsDialog
          columns={columns}
          onSave={reorderColumns}
          onClose={() => setReorderOpen(false)}
        />
      )}

      {cardCtxMenu && (
        <div
          ref={cardCtxRef}
          className="fixed z-50 min-w-[160px] rounded-xl bg-white dark:bg-[#282828] border border-[#DDD9C8] dark:border-[#3a3a3a] shadow-xl shadow-[#D8D5C4]/50 dark:shadow-[#1f1f1f]/80 py-1.5 overflow-hidden"
          style={{
            top: Math.min(cardCtxMenu.y, window.innerHeight - 56),
            left: Math.min(cardCtxMenu.x, window.innerWidth - 168),
          }}
        >
          <button
            className="w-full text-left px-3 py-2 text-sm text-[#3D3A30] dark:text-[#ccc8c0] hover:bg-[#fff1ee] dark:hover:bg-[#F76F53]/10 hover:text-[#F76F53] dark:hover:text-[#f99080] transition-colors flex items-center gap-2"
            onClick={() => { moveTaskToToday(cardCtxMenu.taskId, cardCtxMenu.colId); setCardCtxMenu(null); }}
          >
            <CalendarIcon size={13} />
            Move to Today
          </button>
        </div>
      )}
    </div>
  );
}
