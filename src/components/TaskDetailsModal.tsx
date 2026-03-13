"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskTrackingControls } from "@/components/TaskTrackingControls";
import type { Task, TaskTrackingState } from "@/types/task";
import {
  getInitialTaskState,
  isApiErrorResponse,
  extractWhyItMatters,
  getTaskDescription,
  getOfficialLinks,
  formatRecurrenceInfo,
} from "@/lib/taskHelpers";

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export default function TaskDetailsModal({ task, onClose, onTaskUpdated }: TaskDetailsModalProps) {
  const [trackingState, setTrackingState] = useState<TaskTrackingState>(() =>
    getInitialTaskState(task),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTrackingState(getInitialTaskState(task));
  }, [task]);

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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()} className="max-w-2xl">
      <DialogContent
        className="w-full max-h-[90vh] overflow-y-auto"
        aria-labelledby="task-details-title"
        aria-describedby="task-details-description"
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Task details</p>
              <DialogTitle id="task-details-title" className="text-xl">
                {task.title}
              </DialogTitle>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div id="task-details-description">
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
      </DialogContent>
    </Dialog>
  );
}
