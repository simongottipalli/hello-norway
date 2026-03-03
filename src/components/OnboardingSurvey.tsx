"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AnswerMap = Record<string, string>;

type Question = {
  id: string;
  title: string;
  description?: string;
  type: "country" | "country-list" | "choice" | "number";
  options?: string[];
  shouldShow?: (answers: AnswerMap) => boolean;
};

const countries = [
  "Norway",
  "Sweden",
  "Denmark",
  "Finland",
  "Germany",
  "France",
  "Spain",
  "United Kingdom",
  "United States",
  "India",
  "Pakistan",
  "Ukraine",
];

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

function isCountryListValid(value: string) {
  const entries = value.split(",").map((item) => item.trim()).filter(Boolean);
  return entries.length > 0 && entries.every((country) => countries.includes(country));
}

function isAnswered(question: Question, answers: AnswerMap) {
  const value = answers[question.id] ?? "";
  if (!value) return false;
  if (question.type === "country") return countries.includes(value);
  if (question.type === "country-list") return isCountryListValid(value);
  if (question.type === "number") return Number(value) > 0;
  return true;
}

export function OnboardingSurvey() {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [completed, setCompleted] = useState(false);

  const visibleQuestions = useMemo(
    () => questions.filter((question) => !question.shouldShow || question.shouldShow(answers)),
    [answers]
  );

  const progress = visibleQuestions.length
    ? (visibleQuestions.filter((question) => isAnswered(question, answers)).length / visibleQuestions.length) * 100
    : 0;

  const handleNext = () => {
    if (currentQuestion >= visibleQuestions.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentQuestion((previous) => previous + 1);
  };

  const handleBack = () => {
    setCompleted(false);
    setCurrentQuestion((previous) => Math.max(0, previous - 1));
  };

  const question = visibleQuestions[currentQuestion];
  const canContinue = question ? isAnswered(question, answers) : false;

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <datalist id="country-options">
        {countries.map((country) => (
          <option key={country} value={country} />
        ))}
      </datalist>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <BadgeHeader />

        <Card className="overflow-hidden">
          <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${currentQuestion * 100}%)` }}>
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
                    />
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
                    />
                  </div>
                )}

                {item.type === "number" && (
                  <div className="space-y-2">
                    <Label htmlFor={item.id}>Age</Label>
                    <Input
                      id={item.id}
                      type="number"
                      min={1}
                      value={answers[item.id] ?? ""}
                      onChange={(event) => setAnswers((previous) => ({ ...previous, [item.id]: event.target.value }))}
                    />
                  </div>
                )}

                {item.type === "choice" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(item.options ?? []).map((option) => {
                      const selected = answers[item.id] === option;
                      return (
                        <Button
                          key={option}
                          variant={selected ? "default" : "outline"}
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
              <CardTitle>Great! You&apos;re all set.</CardTitle>
              <CardDescription>We will use these answers to guide your next steps.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end">
              <Button asChild>
                <Link href="/signup">Continue</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleBack} disabled={currentQuestion === 0}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={!canContinue}>
              {currentQuestion === visibleQuestions.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-8 border-t border-border bg-background/95 py-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-2xl">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
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
