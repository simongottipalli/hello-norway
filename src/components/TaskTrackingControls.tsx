/**
 * Shared TaskTrackingControls component
 * Used by both TaskList and TaskDetailsModal to provide consistent task tracking UI
 */

import { type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TaskTrackingState } from "@/types/task";

export interface TaskTrackingControlsProps {
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

export function TaskTrackingControls({
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
