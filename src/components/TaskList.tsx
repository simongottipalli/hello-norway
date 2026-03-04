"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
  userTaskId?: string;
  status?: "TODO" | "SAVED" | "DONE";
  dueDate?: string | null;
  personalNotes?: string | null;
  completedAt?: string | null;
}

interface TaskListProps {
  tasks: Task[];
  onTaskDeleted: () => void;
  onTaskUpdated: () => void;
}

interface TaskTrackingState {
  status: "not_started" | "in_progress" | "completed";
  dueDate: string;
  personalNotes: string;
}

interface ApiErrorResponse {
  error: string;
}

const DEFAULT_TRACKING_STATE: TaskTrackingState = {
  status: "not_started",
  dueDate: "",
  personalNotes: "",
};

const toDateInputValue = (value?: string | null) => {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
};

const getInitialTaskState = (task: Task): TaskTrackingState => ({
  status:
    task.status === "DONE" ? "completed" : task.status === "SAVED" ? "in_progress" : "not_started",
  dueDate: toDateInputValue(task.dueDate),
  personalNotes: task.personalNotes ?? "",
});

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  return Boolean(
    value &&
      typeof value === "object" &&
      "error" in value &&
      typeof (value as { error?: unknown }).error === "string",
  );
};

export default function TaskList({ tasks, onTaskDeleted, onTaskUpdated }: TaskListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [trackingByTaskId, setTrackingByTaskId] = useState<Record<string, TaskTrackingState>>({});
  const [errorByTaskId, setErrorByTaskId] = useState<Record<string, string>>({});

  useEffect(() => {
    setTrackingByTaskId(
      tasks.reduce<Record<string, TaskTrackingState>>((acc, task) => {
        acc[task.id] = getInitialTaskState(task);
        return acc;
      }, {}),
    );
  }, [tasks]);

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

  const handleTrackingFieldChange = <K extends keyof TaskTrackingState>(
    taskId: string,
    field: K,
    value: TaskTrackingState[K],
  ) => {
    setTrackingByTaskId((current) => ({
      ...current,
      [taskId]: {
        ...(current[taskId] ?? DEFAULT_TRACKING_STATE),
        [field]: value,
      },
    }));
  };

  const handleTrackingSave = async (taskId: string) => {
    const trackingState = trackingByTaskId[taskId];
    if (!trackingState) {
      return;
    }

    setSavingId(taskId);
    setErrorByTaskId((current) => ({ ...current, [taskId]: "" }));

    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: trackingState.status,
          dueDate: trackingState.dueDate || null,
          personalNotes: trackingState.personalNotes.trim() ? trackingState.personalNotes : null,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        throw new Error(
          isApiErrorResponse(responseBody) ? responseBody.error : "Failed to update task tracking",
        );
      }

      onTaskUpdated();
    } catch (error) {
      setErrorByTaskId((current) => ({
        ...current,
        [taskId]: error instanceof Error ? error.message : "Failed to update task tracking",
      }));
    } finally {
      setSavingId(null);
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
          className="rounded-lg border bg-card px-4 py-4 transition-colors hover:bg-accent/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <h3 className="text-sm font-medium">{task.title}</h3>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {task.category}
              </Badge>
              <Badge variant={task.status === "DONE" ? "default" : "outline"}>
                {task.status === "DONE"
                  ? "Completed"
                  : task.status === "SAVED"
                    ? "In progress"
                    : "Not started"}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(task.id)}
              disabled={deletingId === task.id}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deletingId === task.id ? "Deleting..." : "Delete"}
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor={`status-${task.id}`}>Status</Label>
              <Select
                id={`status-${task.id}`}
                value={trackingByTaskId[task.id]?.status ?? "not_started"}
                onChange={(event) =>
                  handleTrackingFieldChange(task.id, "status", event.target.value as TaskTrackingState["status"])
                }
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </Select>
            </div>

            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor={`dueDate-${task.id}`}>Personal due date</Label>
              <Input
                id={`dueDate-${task.id}`}
                type="date"
                value={trackingByTaskId[task.id]?.dueDate ?? ""}
                onChange={(event) => handleTrackingFieldChange(task.id, "dueDate", event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`notes-${task.id}`}>Private notes</Label>
              <Textarea
                id={`notes-${task.id}`}
                value={trackingByTaskId[task.id]?.personalNotes ?? ""}
                onChange={(event) => handleTrackingFieldChange(task.id, "personalNotes", event.target.value)}
                rows={3}
                placeholder="Add your notes for this task"
              />
            </div>

            {task.completedAt && (
              <p className="text-xs text-muted-foreground">
                Completed on {new Date(task.completedAt).toLocaleDateString("en-CA")}
              </p>
            )}

            {errorByTaskId[task.id] && <p className="text-sm text-destructive">{errorByTaskId[task.id]}</p>}

            <div>
              <Button size="sm" onClick={() => handleTrackingSave(task.id)} disabled={savingId === task.id}>
                {savingId === task.id ? "Saving..." : "Save progress"}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
