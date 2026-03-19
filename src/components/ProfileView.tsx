"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EMPLOYMENT_STATUS_OPTIONS, type EmploymentStatusValue } from "@/lib/employmentStatus";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

type ProfileUser = {
  name: string;
  arrivalDate: string | null;
  employmentStatus: EmploymentStatusValue | null;
  hasChildren: boolean | null;
};

const MIN_ARRIVAL_YEAR = 1900;
const MAX_ARRIVAL_YEAR = 2100;

interface ProfileViewProps {
  onBack?: () => void;
}

export function ProfileView({ onBack }: ProfileViewProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, refreshSession } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [name, setName] = useState("");
  const [arrivalYear, setArrivalYear] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [hasChildren, setHasChildren] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
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

      toast.success("Profile updated successfully");
      await refreshSession();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "DELETE",
        credentials: "include",
      });

      let data: { error?: string } | null = null;
      try {
        data = await response.json();
      } catch {
        // Ignore JSON parse errors; response body may be empty or non-JSON
      }

      if (!response.ok) {
        const errorMessage =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to delete profile";
        setError(errorMessage);
        setShowDeleteDialog(false);
        return;
      }

      // Profile deleted successfully, logout and redirect
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Refresh session to clear auth state
      await refreshSession();

      // Redirect to home page
      router.push("/");
    } catch {
      setError("Network error. Please try again.");
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {onBack && (
        <Button
          variant="ghost"
          className="mb-4 -ml-2 lg:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>View and edit your profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          {isAuthLoading || isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner size="sm" />
              <span>Loading profile...</span>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-arrivalYear">Arrival year</Label>
                <Input
                  id="profile-arrivalYear"
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
                <Label htmlFor="profile-employmentStatus">Employment status</Label>
                <Select
                  id="profile-employmentStatus"
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
                <Label htmlFor="profile-hasChildren">Has children</Label>
                <Select
                  id="profile-hasChildren"
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

              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Delete Profile</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your profile and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              Delete Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your profile? This will permanently delete:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 my-4">
            <li>Your profile information</li>
            <li>All your tasks and progress</li>
            <li>All your personal notes</li>
          </ul>
          <p className="text-sm font-semibold text-destructive">
            This action cannot be undone and your data will not be recoverable.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProfile}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
