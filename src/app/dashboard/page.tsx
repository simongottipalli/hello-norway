"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TaskCategory } from "@/generated/prisma/enums";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { DashboardSidebar, type ActiveView } from "@/components/DashboardSidebar";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import { ProfileView } from "@/components/ProfileView";
import {
  isTaskOverdue,
  isTaskUpcoming,
  formatDueDateWithTimezone,
} from "@/lib/dateUtils";
import type { Task } from "@/types/task";
import { cn, formatEnumKey } from "@/lib/utils";
import {
  filterTasksByStatus,
  sortTasksByDueDate,
  getStatusBadgeVariant,
  getStatusLabel,
  type StatusFilter,
} from "@/lib/taskHelpers";

// Use the TaskCategory enum from Prisma instead of duplicating the list
const TASK_CATEGORIES = Object.values(TaskCategory);

function TaskListItem({
  task,
  variant = "default",
  onViewTask,
}: {
  task: Task;
  variant?: "default" | "overdue";
  onViewTask: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
        variant === "overdue" ? "border-destructive/30 bg-destructive/5" : "bg-card",
      )}
    >
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium">{task.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {formatEnumKey(task.category)}
          </Badge>
          {variant !== "overdue" && task.status && (
            <Badge variant={getStatusBadgeVariant(task.status)} className="text-xs">
              {getStatusLabel(task.status)}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{task.shortDescription}</p>
        {task.dueDate && (
          <p
            className={cn(
              "text-xs",
              variant === "overdue" ? "font-medium text-destructive" : "text-muted-foreground",
            )}
          >
            Due: {formatDueDateWithTimezone(task.dueDate)}
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={() => onViewTask(task.id)}>
        View
      </Button>
    </div>
  );
}

function OverdueTasksCard({
  tasks,
  onViewTask,
}: {
  tasks: Task[];
  onViewTask: (id: string) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Overdue Tasks ({tasks.length})</CardTitle>
        <CardDescription>These tasks are past their due date</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskListItem key={task.id} task={task} variant="overdue" onViewTask={onViewTask} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingTasksCard({
  tasks,
  onViewTask,
}: {
  tasks: Task[];
  onViewTask: (id: string) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Tasks ({tasks.length})</CardTitle>
        <CardDescription>Tasks due in the next 14 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskListItem key={task.id} task={task} onViewTask={onViewTask} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);

  const handleShowDashboard = useCallback(() => {
    setShowProfile(false);
    setShowAllTasks(false);
  }, []);

  const handleShowAllTasks = useCallback(() => {
    setShowProfile(false);
    setSelectedCategory("ALL");
    setSelectedStatus("PENDING");
    setShowAllTasks(true);
    setMoreExpanded(false);
  }, []);

  const activeView: ActiveView = showProfile ? "profile" : showAllTasks ? "allTasks" : "dashboard";

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

  const overdueTasks = useMemo(() => sortTasksByDueDate(tasks.filter(isTaskOverdue)), [tasks]);

  const upcomingTasks = useMemo(() => sortTasksByDueDate(tasks.filter(isTaskUpcoming)), [tasks]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (selectedCategory !== "ALL") {
      filtered = filtered.filter((task) => task.category === selectedCategory);
    }

    filtered = filterTasksByStatus(filtered, selectedStatus);

    // Sort by ascending due date; tasks without a due date go last
    return sortTasksByDueDate(filtered);
  }, [tasks, selectedCategory, selectedStatus]);

  // Tasks for the "More" section: filtered tasks excluding those already shown in Overdue/Upcoming
  const moreTasks = useMemo(() => {
    const overdueIds = new Set(overdueTasks.map((t) => t.id));
    const upcomingIds = new Set(upcomingTasks.map((t) => t.id));
    return filteredTasks.filter((task) => !overdueIds.has(task.id) && !upcomingIds.has(task.id));
  }, [filteredTasks, overdueTasks, upcomingTasks]);

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
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left Sidebar */}
          <DashboardSidebar
            stats={stats}
            overdueCount={overdueTasks.length}
            upcomingCount={upcomingTasks.length}
            activeView={activeView}
            onTaskCreated={fetchTasks}
            onShowDashboard={handleShowDashboard}
            onShowAllTasks={handleShowAllTasks}
            onShowProfile={() => setShowProfile(true)}
          />

          {/* Main Content */}
          <div className="flex-1 space-y-8 min-w-0">
            {showProfile ? (
              <ProfileView onBack={() => setShowProfile(false)} />
            ) : showAllTasks ? (
              <>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">All Tasks</h1>
                  <p className="text-muted-foreground">
                    Browse, filter, and manage all your tasks
                  </p>
                </div>

                {/* Overdue Tasks */}
                <OverdueTasksCard tasks={overdueTasks} onViewTask={setSelectedTaskId} />

                {/* Upcoming Tasks */}
                <UpcomingTasksCard tasks={upcomingTasks} onViewTask={setSelectedTaskId} />

                {/* More Tasks */}
                <Card>
                  <CardHeader>
                    <CardTitle>More</CardTitle>
                    <CardDescription>
                      Browse and filter the rest of your tasks
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
                              {formatEnumKey(category)}
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
                          onChange={(e) => setSelectedStatus(e.target.value as StatusFilter)}
                          className="mt-2"
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="PENDING">Pending</option>
                          <option value="DONE">Completed</option>
                        </Select>
                      </div>
                    </div>

                    {/* Task List */}
                    {moreTasks.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        {selectedCategory !== "ALL" || selectedStatus !== "ALL"
                          ? "No tasks match the selected filters."
                          : "No tasks available. Complete your onboarding to get personalized tasks."}
                      </div>
                    ) : (
                      <>
                        <div id="more-tasks-list" className="space-y-3">
                          {(moreExpanded ? moreTasks : moreTasks.slice(0, 3)).map((task) => (
                            <TaskListItem
                              key={task.id}
                              task={task}
                              onViewTask={setSelectedTaskId}
                            />
                          ))}
                        </div>
                        {moreTasks.length > 3 && (
                          <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => setMoreExpanded((prev) => !prev)}
                            aria-expanded={moreExpanded}
                            aria-controls="more-tasks-list"
                          >
                            {moreExpanded
                              ? "Show less ↑"
                              : `Show ${moreTasks.length - 3} more task${moreTasks.length - 3 === 1 ? "" : "s"} ↓`}
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
              <p className="text-muted-foreground">
                Track your progress and manage your tasks
              </p>
            </div>

            {/* Overdue Tasks */}
            <OverdueTasksCard tasks={overdueTasks} onViewTask={setSelectedTaskId} />

            {/* Upcoming Tasks */}
            <UpcomingTasksCard tasks={upcomingTasks} onViewTask={setSelectedTaskId} />

            {/* Empty state when no overdue or upcoming tasks */}
            {overdueTasks.length === 0 && upcomingTasks.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No Time-Sensitive Tasks</CardTitle>
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
            </>
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
