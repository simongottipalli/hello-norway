"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileView } from "@/components/ProfileView";

export default function ProfilePage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <main className="min-h-screen bg-background px-6 py-12">
        <div className="max-w-2xl mx-auto text-muted-foreground">Loading profile...</div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Please log in to manage your profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/login">Go to login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <ProfileView />
      </div>
    </main>
  );
}
