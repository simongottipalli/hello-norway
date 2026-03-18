"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { LayoutDashboard, ListTodo, Plus, User } from "lucide-react";

interface DashboardSidebarProps {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    percentComplete: number;
  };
  overdueCount: number;
  upcomingCount: number;
  onTaskCreated?: () => void;
  onShowDashboard?: () => void;
  onShowAllTasks?: () => void;
  onShowProfile?: () => void;
}

export function DashboardSidebar({
  stats,
  overdueCount,
  upcomingCount,
  onTaskCreated,
  onShowDashboard,
  onShowAllTasks,
  onShowProfile,
}: DashboardSidebarProps) {
  const router = useRouter();
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);

  const handleTaskCreated = async () => {
    // Call the parent's fetch function to reload tasks
    if (onTaskCreated) {
      await onTaskCreated();
    }
    // Refresh router cache as well for good measure
    router.refresh();
  };

  return (
    <aside className="w-full lg:w-64 lg:flex-shrink-0" aria-label="Dashboard sidebar">
      {/* Mobile layout: horizontal quick actions + compact stats */}
      <div className="lg:hidden space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onShowDashboard ?? (() => {})}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShowAllTasks ?? (() => {})}
          >
            <ListTodo className="mr-2 h-4 w-4" />
            All Tasks
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShowProfile}
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsAddTaskDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${stats.percentComplete}%` }}
              role="progressbar"
              aria-label="Task completion progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stats.percentComplete}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {stats.completed}/{stats.total} done · {stats.percentComplete}%
          </span>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="text-xs">{overdueCount} overdue</Badge>
          )}
        </div>
      </div>

      {/* Desktop layout: sticky vertical sidebar */}
      <div className="hidden lg:block sticky top-24 space-y-4">
        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Tasks</span>
              <Badge variant="secondary">{stats.total}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completed</span>
              <Badge variant="default">{stats.completed}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">In Progress</span>
              <Badge variant="default">{stats.inProgress}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">To Do</span>
              <Badge variant="outline">{stats.todo}</Badge>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-destructive font-medium">Overdue</span>
                <Badge variant="destructive">{overdueCount}</Badge>
              </div>
            )}
            {upcomingCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Upcoming</span>
                <Badge variant="secondary">{upcomingCount}</Badge>
              </div>
            )}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">{stats.percentComplete}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${stats.percentComplete}%` }}
                  role="progressbar"
                  aria-label="Task completion progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={stats.percentComplete}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onShowDashboard ?? (() => {})}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onShowAllTasks ?? (() => {})}
            >
              <ListTodo className="mr-2 h-4 w-4" />
              All Tasks
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onShowProfile}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button
              variant="default"
              className="w-full justify-start"
              onClick={() => setIsAddTaskDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </CardContent>
        </Card>
      </div>

      <AddTaskDialog
        open={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
        onTaskCreated={handleTaskCreated}
      />
    </aside>
  );
}
