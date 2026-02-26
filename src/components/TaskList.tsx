"use client";

import { useState } from "react";

interface Task {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  body: string;
  category: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskListProps {
  tasks: Task[];
  onTaskDeleted: () => void;
}

export default function TaskList({ tasks, onTaskDeleted }: TaskListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    setDeletingId(taskId);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      onTaskDeleted();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete task");
    } finally {
      setDeletingId(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
        No tasks yet. Add your first task above!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 transition"
        >
          <div className="flex-1">
            <h3 className="text-base font-medium text-zinc-900 dark:text-white">
              {task.title}
            </h3>
          </div>

          <button
            onClick={() => handleDelete(task.id)}
            disabled={deletingId === task.id}
            className="ml-4 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deletingId === task.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}
