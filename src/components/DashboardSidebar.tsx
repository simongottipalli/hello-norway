"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
}

export function DashboardSidebar({
  stats,
  overdueCount,
  upcomingCount,
}: DashboardSidebarProps) {
  return (
    <aside className="hidden lg:block w-64 flex-shrink-0" aria-label="Dashboard sidebar">
      <div className="sticky top-24 space-y-4">
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
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Navigation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/tasks"
              className="block px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              All Tasks
            </Link>
            <Link
              href="/profile"
              className="block px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              Profile Settings
            </Link>
            <Link
              href="/onboarding"
              className="block px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              Onboarding
            </Link>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
