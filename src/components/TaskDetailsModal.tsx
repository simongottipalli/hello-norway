"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
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
    return `Recommended timing: From ${minDaysFromArrival} days from arrival.`;
  }

  return `Recommended timing: Up to ${maxDaysFromArrival} days from arrival.`;
};

interface TaskTrackingControlsProps {
  taskId: string;
  idPrefix: string;
  trackingState?: TaskTrackingState;
  completedAt?: string | null;
  error?: string;
  isSaving: boolean;
  notesRows: number;
  saveButtonSize?: ComponentProps<typeof Button>["size"];
  onFieldChange: <K extends keyof TaskTrackingState>(field: K, value: TaskTrackingState[K]) => void;
  onSave: () => void;
}

function TaskTrackingControls({
  taskId,
  idPrefix,
  trackingState,
  completedAt,
  error,
  isSaving,
  notesRows,
  saveButtonSize,
  onFieldChange,
  onSave,
}: TaskTrackingControlsProps) {
  return (
    <>
      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor={`${idPrefix}-status-${taskId}`}>Status</Label>
        <Select
          id={`${idPrefix}-status-${taskId}`}
          value={trackingState?.status ?? "not_started"}
          onChange={(event) =>
            onFieldChange("status", event.target.value as TaskTrackingState["status"])
          }
        >
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </Select>
      </div>

      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor={`${idPrefix}-dueDate-${taskId}`}>Personal due date</Label>
        <Input
          id={`${idPrefix}-dueDate-${taskId}`}
          type="date"
          value={trackingState?.dueDate ?? ""}
          onChange={(event) => onFieldChange("dueDate", event.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-notes-${taskId}`}>Private notes</Label>
        <Textarea
          id={`${idPrefix}-notes-${taskId}`}
          value={trackingState?.personalNotes ?? ""}
          onChange={(event) => onFieldChange("personalNotes", event.target.value)}
          rows={notesRows}
          placeholder="Add your notes for this task"
        />
      </div>

      {completedAt && (
        <p className="text-xs text-muted-foreground">
          Completed on {new Date(completedAt).toLocaleDateString("en-CA")}
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button size={saveButtonSize} onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save progress"}
        </Button>
      </div>
    </>
  );
}

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export default function TaskDetailsModal({ task, onClose, onTaskUpdated }: TaskDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [trackingState, setTrackingState] = useState<TaskTrackingState>(() =>
    getInitialTaskState(task),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTrackingState(getInitialTaskState(task));
  }, [task]);

  // Focus trap: ensure focus stays within the modal
  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;

    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modalElement.addEventListener("keydown", handleTabKey);
    firstElement?.focus();

    return () => {
      modalElement.removeEventListener("keydown", handleTabKey);
    };
  }, []);

  const handleTrackingFieldChange = <K extends keyof TaskTrackingState>(
    field: K,
    value: TaskTrackingState[K],
  ) => {
    setTrackingState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTrackingSave = async () => {
    setIsSaving(true);
    setError("");
    const trimmedPersonalNotes = trackingState.personalNotes.trim();

    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task tracking");
    } finally {
      setIsSaving(false);
    }
  };

  const taskDescription = getTaskDescription(task.body);
  const taskWhyItMatters = extractWhyItMatters(task.body);
  const taskOfficialLinks = getOfficialLinks(task.officialLinks);

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Task details for ${task.title}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Task details</p>
            <h2 className="text-xl font-semibold">{task.title}</h2>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Description</h3>
            <p className="mt-1 text-sm text-muted-foreground">{task.shortDescription}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Full information</h3>
            <p className="mt-1 text-sm text-muted-foreground">{taskDescription || task.body}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Category</h3>
            <Badge variant="secondary" className="mt-1">
              {task.category}
            </Badge>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Why it matters</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {taskWhyItMatters || "No additional context provided."}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Official links</h3>
            {taskOfficialLinks.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No official links provided.</p>
            ) : (
              <ul className="mt-1 list-inside list-disc space-y-1">
                {taskOfficialLinks.map((link) => (
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
              {formatRecurrenceInfo(task.minDaysFromArrival, task.maxDaysFromArrival)}
            </p>
          </div>

          <TaskTrackingControls
            taskId={task.id}
            idPrefix="detail-task"
            trackingState={trackingState}
            completedAt={task.completedAt}
            error={error}
            isSaving={isSaving}
            notesRows={4}
            onFieldChange={handleTrackingFieldChange}
            onSave={handleTrackingSave}
          />
        </div>
      </div>
    </div>
  );
}
