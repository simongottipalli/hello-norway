"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, refreshSession } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsMobileMenuOpen(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!response.ok) {
        console.error(`Failed to logout: ${response.status} ${response.statusText}`);
        return;
      }
      await refreshSession();
      router.push("/");
    } catch (error: unknown) {
      console.error("Failed to logout", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActivePath = (path: string) => {
    if (path === "/") return pathname === path;
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground hover:text-foreground/80">
          Hello Norway
        </Link>

        {!isLoading && (
          <>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-3">
              {isAuthenticated && user ? (
                <>
                  <span className="text-sm text-muted-foreground hidden lg:inline">
                    Hey {user.email} 👋
                  </span>
                  <Button 
                    variant={isActivePath("/dashboard") ? "secondary" : "ghost"} 
                    size="sm" 
                    asChild
                  >
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <Button 
                    variant={isActivePath("/tasks") ? "secondary" : "ghost"} 
                    size="sm" 
                    asChild
                  >
                    <Link href="/tasks">Tasks</Link>
                  </Button>
                  <Button 
                    variant={isActivePath("/profile") ? "secondary" : "ghost"} 
                    size="sm" 
                    asChild
                  >
                    <Link href="/profile">Profile</Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/onboarding">Start</Link>
                  </Button>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {!isLoading && isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background" data-testid="mobile-nav" id="mobile-nav">
          <nav className="mx-auto max-w-7xl px-4 py-4 space-y-2">{isAuthenticated && user ? (
              <>
                <div className="pb-2 mb-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">
                    Hey {user.email} 👋
                  </span>
                </div>
                <Button 
                  variant={isActivePath("/dashboard") ? "secondary" : "ghost"} 
                  size="sm" 
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/dashboard" onClick={closeMobileMenu} data-testid="mobile-dashboard-link">Dashboard</Link>
                </Button>
                <Button 
                  variant={isActivePath("/tasks") ? "secondary" : "ghost"} 
                  size="sm" 
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/tasks" onClick={closeMobileMenu} data-testid="mobile-tasks-link">Tasks</Link>
                </Button>
                <Button 
                  variant={isActivePath("/profile") ? "secondary" : "ghost"} 
                  size="sm" 
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/profile" onClick={closeMobileMenu} data-testid="mobile-profile-link">Profile</Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleLogout} 
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/login" onClick={closeMobileMenu}>Login</Link>
                </Button>
                <Button 
                  size="sm" 
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/onboarding" onClick={closeMobileMenu}>Start</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
