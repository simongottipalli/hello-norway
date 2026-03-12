"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TaskCategory } from "@/generated/prisma/enums";
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

// Use the TaskCategory enum from Prisma instead of duplicating the list
const TASK_CATEGORIES = Object.values(TaskCategory);

function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}



export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
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

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (selectedCategory !== "ALL") {
      filtered = filtered.filter((task) => task.category === selectedCategory);
    }

    if (selectedStatus !== "ALL") {
      filtered = filtered.filter((task) => task.status === selectedStatus);
    }

    // Create a copy before sorting to avoid mutating state
    return [...filtered].sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.sortOrder - b.sortOrder;
    });
  }, [tasks, selectedCategory, selectedStatus]);

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null),
    [selectedTaskId, tasks],
  );

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

            {/* Progress Summary */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Tasks</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl">{stats.completed}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {stats.percentComplete}% complete
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>To Do</CardDescription>
              <CardTitle className="text-3xl">{stats.todo}</CardTitle>
            </CardHeader>
          </Card>
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
                              {formatCategory(task.category)}
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
                              {formatCategory(task.category)}
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

            {/* Task Filters */}
            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
                <CardDescription>
                  Filter and view all your tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Label htmlFor="category-filter">
                      Filter by Category
                    </Label>
                    <Select
                      id="category-filter"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="mt-2"
                    >
                      <option value="ALL">All Categories</option>
                      {TASK_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {formatCategory(category)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="status-filter">
                      Filter by Status
                    </Label>
                    <Select
                      id="status-filter"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="mt-2"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="TODO">To Do</option>
                      <option value="SAVED">In Progress</option>
                      <option value="DONE">Completed</option>
                    </Select>
                  </div>
                </div>

                {/* Task Grid */}
                {filteredTasks.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    {selectedCategory !== "ALL" || selectedStatus !== "ALL"
                      ? "No tasks match the selected filters."
                      : "No tasks available. Complete your onboarding to get personalized tasks."}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredTasks.map((task) => (
                      <Card key={task.id} className="hover:bg-accent/30 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <CardTitle className="text-base">{task.title}</CardTitle>
                            <Badge
                              variant={
                                task.status === "DONE"
                                  ? "default"
                                  : task.status === "SAVED"
                                    ? "default"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {task.status === "DONE"
                                ? "Completed"
                                : task.status === "SAVED"
                                  ? "In Progress"
                                  : "To Do"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Badge variant="secondary" className="text-xs">
                              {formatCategory(task.category)}
                            </Badge>
                            {isTaskOverdue(task) && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {task.shortDescription}
                          </p>
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground">
                              Due: {formatDueDateWithTimezone(task.dueDate)}
                            </p>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setSelectedTaskId(task.id)}
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {selectedTaskId &&
        (() => {
          const task = tasks.find((t) => t.id === selectedTaskId);
          if (!task) return null;
          return (
            <TaskDetailsModal
              task={task}
              onClose={() => setSelectedTaskId(null)}
              onTaskUpdated={fetchTasks}
            />
          );
        })()}
    </main>
  );
}
