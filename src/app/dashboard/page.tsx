"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import {
  parseUtcDate,
  isTaskOverdue,
  isTaskUpcoming,
  formatDueDateWithTimezone,
} from "@/lib/dateUtils";
import type { Task } from "@/types/task";
import { formatEnumKey } from "@/lib/utils";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setError("");
      const response = await fetch("/api/tasks/personalized");

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
    if (isAuthenticated && !authLoading) {
      fetchTasks();
    }
  }, [isAuthenticated, authLoading]);

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === "DONE").length;
    const inProgressTasks = tasks.filter((task) => task.status === "SAVED").length;
    const todoTasks = tasks.filter((task) => task.status === "TODO").length;

    return {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      todo: todoTasks,
      percentComplete: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    return tasks.filter(isTaskOverdue).sort((a, b) => {
      const dateA = a.dueDate ? parseUtcDate(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? parseUtcDate(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    return tasks.filter(isTaskUpcoming).sort((a, b) => {
      const dateA = a.dueDate ? parseUtcDate(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? parseUtcDate(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [tasks]);

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null),
    [selectedTaskId, tasks],
  );

  useEffect(() => {
    if (!selectedTaskId) {
      return;
    }

    const exists = tasks.some((t) => t.id === selectedTaskId);
    if (!exists) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, tasks]);
  if (authLoading || (isAuthenticated && isLoading)) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <DashboardSidebar
            stats={stats}
            overdueCount={overdueTasks.length}
            upcomingCount={upcomingTasks.length}
            onTaskCreated={fetchTasks}
          />

          {/* Main Content */}
          <div className="flex-1 space-y-8 min-w-0">
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
              <p className="text-muted-foreground">
                Track your progress and manage your tasks
              </p>
            </div>

            {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">
                    Overdue Tasks ({overdueTasks.length})
                  </CardTitle>
                  <CardDescription>
                    These tasks are past their due date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overdueTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-medium">{task.title}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {formatEnumKey(task.category)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {task.shortDescription}
                          </p>
                          <p className="text-xs font-medium text-destructive">
                            Due: {task.dueDate ? formatDueDateWithTimezone(task.dueDate) : "N/A"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Tasks */}
            {upcomingTasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Tasks ({upcomingTasks.length})</CardTitle>
                  <CardDescription>
                    Tasks due in the next 14 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-medium">{task.title}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {formatEnumKey(task.category)}
                            </Badge>
                            <Badge
                              variant={task.status === "SAVED" ? "default" : "outline"}
                              className="text-xs"
                            >
                              {task.status === "SAVED" ? "In Progress" : "To Do"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {task.shortDescription}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Due: {task.dueDate ? formatDueDateWithTimezone(task.dueDate) : "N/A"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state when no overdue or upcoming tasks */}
            {overdueTasks.length === 0 && upcomingTasks.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No Upcoming Tasks</CardTitle>
                  <CardDescription>
                    You have no overdue or upcoming tasks right now.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  <p className="text-sm">
                    Add a task with a due date to track it here.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={fetchTasks}
        />
      )}
    </main>
  );
}
