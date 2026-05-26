"use client";

import { TrashIcon } from "./icons";

export function TrashZone({
  dragging,
  dragOverTrash,
}: {
  dragging: boolean;
  dragOverTrash: boolean;
}) {
  return (
    <div
      data-trash="true"
      className={`mx-2 mt-2 mb-2 sm:mx-6 sm:mt-1 sm:mb-2 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 py-5 transition-all duration-200 ${
        dragging
          ? dragOverTrash
            ? "border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 scale-[1.01] shadow-lg"
            : "border-red-300 dark:border-red-800 text-red-300 dark:text-red-700 bg-red-50/50 dark:bg-red-950/20"
          : "border-[#DDD9C8] dark:border-[#313131] text-[#BCB8A8] dark:text-[#383430]"
      }`}
    >
      <TrashIcon size={18} />
      <span className="text-sm font-medium">
        {dragging ? (dragOverTrash ? "Release to delete" : "Drop here to delete") : "Trash — drag tasks here to delete"}
      </span>
    </div>
  );
}
