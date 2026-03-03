"use client";

import { useAuth } from "@/components/AuthProvider";

export function Header() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Hello Norway
        </span>

        {!isLoading && isAuthenticated && user && (
          <span className="text-sm text-muted-foreground">
            Hey {user.email} 👋
          </span>
        )}
      </div>
    </header>
  );
}
