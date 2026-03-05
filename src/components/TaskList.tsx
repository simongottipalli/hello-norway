"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  officialLinks?: unknown;
  minDaysFromArrival?: number | null;
  maxDaysFromArrival?: number | null;
}

interface TaskListProps {
  tasks: Task[];
  onTaskDeleted: () => void;
  onTaskUpdated: () => void;
  initialSelectedTaskId?: string;
}

interface TaskTrackingState {
  status: "not_started" | "in_progress" | "completed";
  dueDate: string;
  personalNotes: string;
}

interface ApiErrorResponse {
  error: string;
}

type OfficialLink = {
  label: string;
  url: string;
};

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

export const extractWhyItMatters = (body: string) => {
  const marker = "Why it matters:";
  const markerIndex = body.indexOf(marker);

  if (markerIndex === -1) {
    return "";
  }

  return body.slice(markerIndex + marker.length).trim();
};

export const getTaskDescription = (body: string) => {
  const marker = "Why it matters:";
  const markerIndex = body.indexOf(marker);

  if (markerIndex === -1) {
    return body.trim();
  }

  return body.slice(0, markerIndex).trim();
};

export const getOfficialLinks = (value: unknown): OfficialLink[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const label = "label" in entry && typeof entry.label === "string" ? entry.label : null;
    const url = "url" in entry && typeof entry.url === "string" ? entry.url : null;

    if (!label || !url) {
      return [];
    }

    return [{ label, url }];
  });
};

export const formatRecurrenceInfo = (
  minDaysFromArrival?: number | null,
  maxDaysFromArrival?: number | null,
) => {
  if (minDaysFromArrival == null && maxDaysFromArrival == null) {
    return "No timing window specified.";
  }

  if (minDaysFromArrival != null && maxDaysFromArrival != null) {
    return `Recommended timing: ${minDaysFromArrival} to ${maxDaysFromArrival} days from arrival.`;
  }

  if (minDaysFromArrival != null) {
    return `Recommended timing: from ${minDaysFromArrival} days from arrival onward.`;
  }

  return `Recommended timing: up to ${maxDaysFromArrival} days from arrival.`;
};

export default function TaskList({
  tasks,
  onTaskDeleted,
  onTaskUpdated,
  initialSelectedTaskId,
}: TaskListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingByTaskId, setSavingByTaskId] = useState<Record<string, boolean>>({});
  const [trackingByTaskId, setTrackingByTaskId] = useState<Record<string, TaskTrackingState>>({});
  const [errorByTaskId, setErrorByTaskId] = useState<Record<string, string>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialSelectedTaskId ?? null);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    setTrackingByTaskId(
      tasks.reduce<Record<string, TaskTrackingState>>((acc, task) => {
        acc[task.id] = getInitialTaskState(task);
        return acc;
      }, {}),
    );
  }, [tasks]);

  useEffect(() => {
    if (!initialSelectedTaskId) {
      return;
    }

    setSelectedTaskId(initialSelectedTaskId);
  }, [initialSelectedTaskId]);

  useEffect(() => {
    if (!selectedTaskId) {
      return;
    }

    const taskExists = tasks.some((task) => task.id === selectedTaskId);
    if (taskExists) {
      setDetailError("");
      return;
    }

    setSelectedTaskId(null);
    setDetailError("Task not found.");
    router.replace(pathname);
  }, [pathname, router, selectedTaskId, tasks]);

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

    setSavingByTaskId((current) => ({ ...current, [taskId]: true }));
    setErrorByTaskId((current) => ({ ...current, [taskId]: "" }));
    const trimmedPersonalNotes = trackingState.personalNotes.trim();

    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: trackingState.status,
          dueDate: trackingState.dueDate || null,
          personalNotes: trimmedPersonalNotes || null,
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
      setSavingByTaskId((current) => ({ ...current, [taskId]: false }));
    }
  };

  const closeDetails = () => {
    setSelectedTaskId(null);
    router.replace(pathname);
  };

  const selectedTask = selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) : null;
  const selectedTaskDescription = selectedTask ? getTaskDescription(selectedTask.body) : "";
  const selectedTaskWhyItMatters = selectedTask ? extractWhyItMatters(selectedTask.body) : "";
  const selectedTaskOfficialLinks = selectedTask ? getOfficialLinks(selectedTask.officialLinks) : [];

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
              variant="outline"
              size="sm"
              onClick={() => {
                setDetailError("");
                setSelectedTaskId(task.id);
                router.replace(`${pathname}?taskId=${task.id}`);
              }}
            >
              View details
            </Button>

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
              <Button
                size="sm"
                onClick={() => handleTrackingSave(task.id)}
                disabled={Boolean(savingByTaskId[task.id])}
              >
                {savingByTaskId[task.id] ? "Saving..." : "Save progress"}
              </Button>
            </div>
          </div>
        </div>
      ))}

      {detailError && <p className="text-sm text-destructive">{detailError}</p>}

      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Task details for ${selectedTask.title}`}
        >
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border bg-card p-6 shadow-lg">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Task details</p>
                <h2 className="text-xl font-semibold">{selectedTask.title}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={closeDetails}>
                Back to dashboard
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Description</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedTask.shortDescription}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Full information</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedTaskDescription || selectedTask.body}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Category</h3>
                <Badge variant="secondary" className="mt-1">
                  {selectedTask.category}
                </Badge>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Why it matters</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedTaskWhyItMatters || "No additional context provided."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Official links</h3>
                {selectedTaskOfficialLinks.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">No official links provided.</p>
                ) : (
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {selectedTaskOfficialLinks.map((link) => (
                      <li key={link.url}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary underline underline-offset-2"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold">Recurrence information</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatRecurrenceInfo(selectedTask.minDaysFromArrival, selectedTask.maxDaysFromArrival)}
                </p>
              </div>

              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor={`detail-status-${selectedTask.id}`}>Status</Label>
                <Select
                  id={`detail-status-${selectedTask.id}`}
                  value={trackingByTaskId[selectedTask.id]?.status ?? "not_started"}
                  onChange={(event) =>
                    handleTrackingFieldChange(
                      selectedTask.id,
                      "status",
                      event.target.value as TaskTrackingState["status"],
                    )
                  }
                >
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </Select>
              </div>

              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor={`detail-dueDate-${selectedTask.id}`}>Personal due date</Label>
                <Input
                  id={`detail-dueDate-${selectedTask.id}`}
                  type="date"
                  value={trackingByTaskId[selectedTask.id]?.dueDate ?? ""}
                  onChange={(event) => handleTrackingFieldChange(selectedTask.id, "dueDate", event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`detail-notes-${selectedTask.id}`}>Private notes</Label>
                <Textarea
                  id={`detail-notes-${selectedTask.id}`}
                  value={trackingByTaskId[selectedTask.id]?.personalNotes ?? ""}
                  onChange={(event) => handleTrackingFieldChange(selectedTask.id, "personalNotes", event.target.value)}
                  rows={4}
                  placeholder="Add your notes for this task"
                />
              </div>

              {selectedTask.completedAt && (
                <p className="text-xs text-muted-foreground">
                  Completed on {new Date(selectedTask.completedAt).toLocaleDateString("en-CA")}
                </p>
              )}

              {errorByTaskId[selectedTask.id] && (
                <p className="text-sm text-destructive">{errorByTaskId[selectedTask.id]}</p>
              )}

              <Button
                onClick={() => handleTrackingSave(selectedTask.id)}
                disabled={Boolean(savingByTaskId[selectedTask.id])}
              >
                {savingByTaskId[selectedTask.id] ? "Saving..." : "Save progress"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
