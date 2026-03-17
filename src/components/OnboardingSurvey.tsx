"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { countries } from "@/data/countries";
import {
  buildFallbackTaskPreview,
  deriveTaskProfileFromOnboardingAnswers,
  ONBOARDING_PROFILE_STORAGE_KEY,
} from "@/lib/onboardingProfile";

type AnswerMap = Record<string, string>;

type Question = {
  id: string;
  title: string;
  description?: string;
  type: "country" | "country-list" | "choice" | "number";
  options?: string[];
  shouldShow?: (answers: AnswerMap) => boolean;
};

type PreviewTask = ReturnType<typeof buildFallbackTaskPreview>[number];


const questions: Question[] = [
  {
    id: "applyingFrom",
    title: "Where are you applying from?",
    description: "Type and choose a country from the list.",
    type: "country",
  },
  {
    id: "citizenships",
    title: "What citizenships do you have?",
    description: "Use comma-separated countries from the same list.",
    type: "country-list",
  },
  {
    id: "applyingAs",
    title: "What are you applying as?",
    type: "choice",
    options: ["Student", "Refugee", "Skilled worker", "Family reunification"],
  },
  {
    id: "age",
    title: "How old are you?",
    type: "number",
  },
  {
    id: "jobOffer",
    title: "Do you already have a job offer in Norway?",
    type: "choice",
    options: ["Yes", "No"],
    shouldShow: (answers) => answers.applyingAs === "Skilled worker",
  },
];

const PREVIEW_TASK_COUNT = 3;

function isCountryListValid(value: string) {
  const entries = value.split(",").map((item) => item.trim()).filter(Boolean);
  return entries.length > 0 && entries.every((country) => countries.includes(country));
}

function isAnswered(question: Question, answers: AnswerMap) {
  const value = answers[question.id] ?? "";
  if (!value) return false;
  if (question.type === "country") return countries.includes(value);
  if (question.type === "country-list") return isCountryListValid(value);
  if (question.type === "number") {
    const numericValue = Number(value);
    return value.trim() !== "" && Number.isInteger(numericValue) && numericValue > 0;
  }
  if (question.type === "choice") {
    return (question.options ?? []).includes(value);
  }
  return true;
}

export function OnboardingSurvey() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<PreviewTask[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasExistingTasks, setHasExistingTasks] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState("");

  const visibleQuestions = useMemo(
    () => questions.filter((question) => !question.shouldShow || question.shouldShow(answers)),
    [answers]
  );
  const safeQuestionIndex = Math.min(currentQuestion, Math.max(0, visibleQuestions.length - 1));

  const progress = visibleQuestions.length
    ? (visibleQuestions.filter((question) => isAnswered(question, answers)).length / visibleQuestions.length) * 100
    : 0;

  // Check if authenticated user has existing tasks
  useEffect(() => {
    const checkExistingTasks = async () => {
      if (!isAuthenticated || isAuthLoading) {
        return;
      }

      try {
        const response = await fetch("/api/tasks/personalized");
        if (response.ok) {
          const tasks = await response.json();
          // Check if user has existing TODO tasks that might be replaced
          setHasExistingTasks(
            Array.isArray(tasks) && tasks.some((task: { status?: string }) => task.status === "TODO")
          );
        }
      } catch {
        // Ignore errors when checking existing tasks
      }
    };

    checkExistingTasks();
  }, [isAuthenticated, isAuthLoading]);

  const handleNext = () => {
    if (safeQuestionIndex >= visibleQuestions.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentQuestion((previous) => previous + 1);
  };

  const handleBack = () => {
    setCompleted(false);
    setCurrentQuestion((previous) => Math.max(0, previous - 1));
  };

  const handleSaveForAuthenticatedUser = async () => {
    if (!isAuthenticated) {
      return;
    }

    setIsSavingProfile(true);
    setSaveError("");
    try {
      const taskProfile = deriveTaskProfileFromOnboardingAnswers(answers);

      // Only send fields that have been inferred (omit null/undefined to avoid clearing existing data)
      const sanitizedTaskProfile = Object.fromEntries(
        Object.entries(taskProfile).filter(([, value]) => value !== null && value !== undefined),
      );

      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedTaskProfile),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      // Clear any stored profile from localStorage since we've saved it
      try {
        localStorage.removeItem(ONBOARDING_PROFILE_STORAGE_KEY);
      } catch {
        // Ignore localStorage errors
      }

      // Redirect to tasks page on success
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to save onboarding profile:", error);
      setSaveError("Failed to save your onboarding profile. Please try again or update your profile later from the Profile page.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const question = visibleQuestions[safeQuestionIndex];
  const canContinue = question ? isAnswered(question, answers) : false;
  const visibleTaskPreview = isExpanded ? previewTasks : previewTasks.slice(0, PREVIEW_TASK_COUNT);
  const hasMoreTasks = previewTasks.length > PREVIEW_TASK_COUNT;

  useEffect(() => {
    if (!completed) {
      return;
    }

    const taskProfile = deriveTaskProfileFromOnboardingAnswers(answers);
    setIsPreviewLoading(true);
    setPreviewError("");

    try {
      localStorage.setItem(ONBOARDING_PROFILE_STORAGE_KEY, JSON.stringify(taskProfile));
    } catch {
      // Ignore local storage failures.
    }

    const fetchPreviewTasks = async () => {
      try {
        const response = await fetch("/api/onboarding/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(taskProfile),
        });

        if (!response.ok) {
          throw new Error("Failed to load your task list.");
        }

        const payload = await response.json();
        if (!Array.isArray(payload)) {
          throw new Error("Unexpected response while loading tasks.");
        }

        setPreviewTasks(payload);
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : "Failed to load your task list.");
        setPreviewTasks(buildFallbackTaskPreview(taskProfile));
      } finally {
        setIsPreviewLoading(false);
      }
    };

    fetchPreviewTasks();
  }, [answers, completed]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <datalist id="country-options">
        {countries.map((country) => (
          <option key={country} value={country} />
        ))}
      </datalist>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <BadgeHeader />
        <p className="sr-only" aria-live="polite">
          {completed ? "Questionnaire completed" : question ? `Current question: ${question.title}` : ""}
        </p>

        <Card className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${safeQuestionIndex * 100}%)` }}
          >
            {visibleQuestions.map((item) => (
              <CardContent key={item.id} className="min-w-full p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>{item.title}</CardTitle>
                  {item.description && <CardDescription>{item.description}</CardDescription>}
                </CardHeader>

                {item.type === "country" && (
                  <div className="space-y-2">
                    <Label htmlFor={item.id}>Country</Label>
                    <Input
                      id={item.id}
                      list="country-options"
                      value={answers[item.id] ?? ""}
                      onChange={(event) => setAnswers((previous) => ({ ...previous, [item.id]: event.target.value }))}
                      placeholder="Start typing a country"
                      aria-invalid={Boolean(answers[item.id]) && !countries.includes(answers[item.id])}
                      aria-describedby={
                        answers[item.id] && !countries.includes(answers[item.id])
                          ? `${item.id}-error`
                          : undefined
                      }
                    />
                    {answers[item.id] && !countries.includes(answers[item.id]) && (
                      <p id={`${item.id}-error`} className="text-sm text-destructive">Please select a listed country.</p>
                    )}
                  </div>
                )}

                {item.type === "country-list" && (
                  <div className="space-y-2">
                    <Label htmlFor={item.id}>Citizenships</Label>
                    <Input
                      id={item.id}
                      list="country-options"
                      value={answers[item.id] ?? ""}
                      onChange={(event) => setAnswers((previous) => ({ ...previous, [item.id]: event.target.value }))}
                      placeholder="India, Norway"
                      aria-invalid={Boolean(answers[item.id]) && !isCountryListValid(answers[item.id] ?? "")}
                      aria-describedby={
                        answers[item.id] && !isCountryListValid(answers[item.id] ?? "")
                          ? `${item.id}-error`
                          : undefined
                      }
                    />
                    {answers[item.id] && !isCountryListValid(answers[item.id]) && (
                      <p id={`${item.id}-error`} className="text-sm text-destructive">Use only countries from the list, separated by commas.</p>
                    )}
                  </div>
                )}

                {item.type === "number" && (
                  <div className="space-y-2">
                    <Label htmlFor={item.id}>Age</Label>
                    <Input
                      id={item.id}
                      type="number"
                      min={1}
                      step={1}
                      value={answers[item.id] ?? ""}
                      onChange={(event) => setAnswers((previous) => ({ ...previous, [item.id]: event.target.value }))}
                    />
                  </div>
                )}

                {item.type === "choice" && (
                  <div role="group" aria-label={item.title} className="grid gap-2 sm:grid-cols-2">
                    {(item.options ?? []).map((option) => {
                      const selected = answers[item.id] === option;
                      return (
                        <Button
                          key={option}
                          variant={selected ? "default" : "outline"}
                          aria-pressed={selected}
                          onClick={() => setAnswers((previous) => ({ ...previous, [item.id]: option }))}
                        >
                          {option}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            ))}
          </div>
        </Card>

        {completed ? (
          <Card>
            <CardHeader>
              <CardTitle>Your first Norway tasks</CardTitle>
              <CardDescription>
                Based on your onboarding answers, here are the first things to focus on.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPreviewLoading ? (
                <p className="text-sm text-muted-foreground">Loading your task list...</p>
              ) : previewTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching tasks right now.</p>
              ) : (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-md border border-border">
                    <ul className="divide-y divide-border">
                      {visibleTaskPreview.map((task) => (
                        <li key={task.id} className="px-4 py-3">
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{task.shortDescription}</p>
                        </li>
                      ))}
                    </ul>
                    {!isExpanded && hasMoreTasks && (
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  {hasMoreTasks && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExpanded((current) => !current)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded
                        ? "Show fewer tasks"
                        : `Show ${previewTasks.length - PREVIEW_TASK_COUNT} more tasks`}
                    </Button>
                  )}
                </div>
              )}
              {previewError && (
                <p className="text-xs text-muted-foreground">
                  Couldn&apos;t load full personalized tasks. Showing a starter list for now.
                </p>
              )}

              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Save your progress</li>
                <li>• Get personalized due dates and reminders</li>
                <li>• Keep private notes and add extra tasks manually</li>
              </ul>

              {isAuthenticated ? (
                <>
                  {hasExistingTasks && (
                    <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                      ⚠️ Warning: Updating your onboarding profile may replace or update your TODO task list with personalized tasks based on your answers. Saved and completed tasks will be kept.
                    </div>
                  )}
                  {saveError && (
                    <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
                      {saveError}
                    </div>
                  )}
                  <Button
                    onClick={handleSaveForAuthenticatedUser}
                    className="w-full"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? "Saving..." : "Save and continue to tasks"}
                  </Button>
                </>
              ) : (
                <Button asChild className="w-full">
                  <Link href="/login?from=onboarding">Login to save progress...</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={safeQuestionIndex === 0}
              aria-label="Go to previous question"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canContinue}
              aria-label={safeQuestionIndex === visibleQuestions.length - 1 ? "Finish questionnaire" : "Go to next question"}
            >
              {safeQuestionIndex === visibleQuestions.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-8 border-t border-border bg-background/95 py-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-2xl">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              role="progressbar"
              aria-label="Onboarding progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function BadgeHeader() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Onboarding questionnaire</p>
      <h1 className="text-3xl font-semibold tracking-tight">Let&apos;s personalize your path to Norway</h1>
    </div>
  );
}
