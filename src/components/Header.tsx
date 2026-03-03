"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!response.ok) {
        console.error(`Failed to logout: ${response.status} ${response.statusText}`);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch (error: unknown) {
      console.error("Failed to logout", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Hello Norway
        </span>

        {!isLoading && isAuthenticated && user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Hey {user.email} 👋
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
