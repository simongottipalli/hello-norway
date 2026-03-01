"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      <div className="text-center py-12 text-muted-foreground">
        No tasks yet. Add your first task above!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/30"
        >
          <div className="flex flex-1 items-center gap-3">
            <h3 className="text-sm font-medium">{task.title}</h3>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {task.category}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(task.id)}
            disabled={deletingId === task.id}
            className="ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {deletingId === task.id ? "Deleting..." : "Delete"}
          </Button>
        </div>
      ))}
    </div>
  );
}
