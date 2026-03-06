"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EMPLOYMENT_STATUS_OPTIONS, type EmploymentStatusValue } from "@/lib/employmentStatus";

type ProfileUser = {
  name: string;
  arrivalDate: string | null;
  employmentStatus: EmploymentStatusValue | null;
  hasChildren: boolean | null;
};

const MIN_ARRIVAL_YEAR = 1900;
const MAX_ARRIVAL_YEAR = 2100;

export default function ProfilePage() {
  const { isAuthenticated, isLoading: isAuthLoading, refreshSession } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [arrivalYear, setArrivalYear] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [hasChildren, setHasChildren] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isAuthLoading) {
      // Wait for auth to finish before changing loading state or loading profile
      return;
    }

    if (!isAuthenticated) {
      // Auth is resolved and user is not authenticated; no profile to load
      setIsLoading(false);
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/auth/profile", { method: "GET", credentials: "include" });
        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
          await refreshSession();
          return;
        }

        if (!response.ok) {
          setError(data.error || "Failed to load profile");
          return;
        }

        const user: ProfileUser = data.user;
        setName(user.name ?? "");
        setArrivalYear(user.arrivalDate ? String(new Date(user.arrivalDate).getUTCFullYear()) : "");
        setEmploymentStatus(user.employmentStatus ?? "");
        setHasChildren(
          user.hasChildren === null || user.hasChildren === undefined ? "" : user.hasChildren ? "yes" : "no"
        );
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [isAuthLoading, isAuthenticated, refreshSession]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    const parsedArrivalYear = Number(arrivalYear);
    if (
      arrivalYear &&
      (!Number.isInteger(parsedArrivalYear) || parsedArrivalYear < MIN_ARRIVAL_YEAR || parsedArrivalYear > MAX_ARRIVAL_YEAR)
    ) {
      setError(`Arrival year must be between ${MIN_ARRIVAL_YEAR} and ${MAX_ARRIVAL_YEAR}`);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          arrivalDate: arrivalYear ? `${arrivalYear}-01-01` : null,
          employmentStatus: employmentStatus || null,
          hasChildren: hasChildren === "" ? null : hasChildren === "yes",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to update profile");
        return;
      }

      setSuccessMessage("Profile updated successfully");
      await refreshSession();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>View and edit your profile information.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading profile...</p>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your full name"
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arrivalYear">Arrival year</Label>
                  <Input
                    id="arrivalYear"
                    type="number"
                    min={MIN_ARRIVAL_YEAR}
                    max={MAX_ARRIVAL_YEAR}
                    step={1}
                    value={arrivalYear}
                    onChange={(event) => setArrivalYear(event.target.value)}
                    placeholder="2026"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employmentStatus">Employment status</Label>
                  <Select
                    id="employmentStatus"
                    value={employmentStatus}
                    onChange={(event) => setEmploymentStatus(event.target.value)}
                  >
                    <option value="">Select status</option>
                    {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hasChildren">Has children</Label>
                  <Select
                    id="hasChildren"
                    value={hasChildren}
                    onChange={(event) => setHasChildren(event.target.value)}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Select>
                </div>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                {successMessage && (
                  <p className="text-sm text-primary" role="status">
                    {successMessage}
                  </p>
                )}

                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save profile"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
