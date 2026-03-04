"use client";

import { useState, useEffect } from "react";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTasks = async () => {
    try {
      setError("");
      const response = await fetch("/api/tasks");

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Unexpected response while loading tasks");
      }
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleTaskCreated = () => {
    fetchTasks();
  };

  const handleTaskDeleted = () => {
    fetchTasks();
  };

  const handleTaskUpdated = () => {
    fetchTasks();
  };

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks with a simple interface.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm onTaskCreated={handleTaskCreated} />
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-4">Your Tasks</h2>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading tasks...
            </div>
          ) : (
            <TaskList
              tasks={tasks}
              onTaskDeleted={handleTaskDeleted}
              onTaskUpdated={handleTaskUpdated}
            />
          )}
        </div>
      </div>
    </main>
  );
}
