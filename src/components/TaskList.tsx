"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskTrackingControls } from "@/components/TaskTrackingControls";
import type { Task, TaskTrackingState } from "@/types/task";
import {
  getInitialTaskState,
  isApiErrorResponse,
  extractWhyItMatters,
  getTaskDescription,
  getOfficialLinks,
  formatRecurrenceInfo,
  DEFAULT_TRACKING_STATE,
} from "@/lib/taskHelpers";
import type { OfficialLink } from "@/lib/taskHelpers";

export {
  extractWhyItMatters,
  getTaskDescription,
  getOfficialLinks,
  formatRecurrenceInfo,
};
export type { OfficialLink };
interface TaskListProps {
  tasks: Task[];
  onTaskDeleted: () => void;
  onTaskUpdated: () => void;
  initialSelectedTaskId?: string;
}

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
            <TaskTrackingControls
              taskId={task.id}
              idPrefix="task"
              trackingState={trackingByTaskId[task.id]}
              completedAt={task.completedAt}
              error={errorByTaskId[task.id]}
              isSaving={Boolean(savingByTaskId[task.id])}
              notesRows={3}
              saveButtonSize="sm"
              onFieldChange={(field, value) => handleTrackingFieldChange(task.id, field, value)}
              onSave={() => handleTrackingSave(task.id)}
            />
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
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeDetails();
            }
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDetails();
            }
          }}
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

              <TaskTrackingControls
                taskId={selectedTask.id}
                idPrefix="detail-task"
                trackingState={trackingByTaskId[selectedTask.id]}
                completedAt={selectedTask.completedAt}
                error={errorByTaskId[selectedTask.id]}
                isSaving={Boolean(savingByTaskId[selectedTask.id])}
                notesRows={4}
                onFieldChange={(field, value) =>
                  handleTrackingFieldChange(selectedTask.id, field, value)
                }
                onSave={() => handleTrackingSave(selectedTask.id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
