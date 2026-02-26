"use client";

import { useState, useEffect } from "react";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";

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

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Tasks
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage your tasks with a simple interface.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Add New Task
          </h2>
          <TaskForm onTaskCreated={handleTaskCreated} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Your Tasks
          </h2>
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              Loading tasks...
            </div>
          ) : (
            <TaskList tasks={tasks} onTaskDeleted={handleTaskDeleted} />
          )}
        </div>
      </div>
    </main>
  );
}
