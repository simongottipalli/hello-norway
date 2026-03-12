"use client";

import { useState, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated?: () => void;
}

export function AddTaskDialog({
  open,
  onOpenChange,
  onTaskCreated,
}: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [links, setLinks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const generateSlug = (text: string): string => {
    return (
      text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") + `-${Date.now()}`
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Task name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse links if provided (expecting comma-separated or newline-separated URLs)
      const officialLinks: Record<string, string> = {};
      if (links.trim()) {
        const linksList = links
          .split(/[\n,]+/)
          .map((link) => link.trim())
          .filter((link) => link.length > 0);

        linksList.forEach((link, index) => {
          // Try to extract a meaningful key from the URL
          try {
            const url = new URL(link);
            const hostname = url.hostname.replace("www.", "");
            officialLinks[hostname] = link;
          } catch {
            // If not a valid URL, just use a generic key
            officialLinks[`link${index + 1}`] = link;
          }
        });
      }

      const taskData = {
        slug: generateSlug(title),
        title: title.trim(),
        shortDescription: description.trim() || title.trim(),
        body: description.trim() || title.trim(),
        category: category,
        sortOrder: Math.floor(Math.random() * 30000), // Bounded to fit SmallInt
        officialLinks: officialLinks,
        ...(dueDate && { dueDate: new Date(dueDate).toISOString() }),
      };

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create task");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setDueDate("");
      setCategory("OTHER");
      setLinks("");

      // Close dialog and notify parent
      onOpenChange(false);
      if (onTaskCreated) {
        onTaskCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a custom task with all the details you need to track.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-name">Task Name *</Label>
            <Input
              id="task-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task name..."
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description..."
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due-date">Due Date</Label>
            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-category">Category</Label>
            <Select
              id="task-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="HOUSING">Housing</option>
              <option value="WORK">Work</option>
              <option value="BANKING">Banking</option>
              <option value="HEALTHCARE">Healthcare</option>
              <option value="EDUCATION">Education</option>
              <option value="TRANSPORT">Transport</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-links">Links / URLs</Label>
            <Textarea
              id="task-links"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="Enter relevant links (one per line or comma-separated)..."
              disabled={isSubmitting}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Add helpful links or resources related to this task
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
