export type TaskLink = { id: string; url: string; label: string };
export type Task = { id: string; content: string; links: TaskLink[]; sourceBoardName?: string };
export type Column = { id: string; title: string; tasks: Task[] };
export type Board = { id: string; name: string; columns: Column[] };
export type ThemeMode = "light" | "dark";

export const ACTIVE_BOARD_KEY = "kanban-active-board";
export const THEME_KEY = "kanban-theme";
export const TODAY_BOARD_ID = "board-today";
export const TODAY_COL_TODO_ID = "today-col-todo";

export const TODAY_COLUMNS: Column[] = [
  { id: TODAY_COL_TODO_ID, title: "To Do", tasks: [] },
  { id: "today-col-progress", title: "In Progress", tasks: [] },
  { id: "today-col-done", title: "Done", tasks: [] },
];

export const DEFAULT_BOARDS: Board[] = [
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

export function genId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);
}
