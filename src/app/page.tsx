import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    title: "Step-by-step tasks",
    description: "Know what to do next.",
  },
  {
    title: "Trusted guidance",
    description: "Built for Norway newcomers.",
  },
  {
    title: "Simple progress tracking",
    description: "Save and complete essentials.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <nav className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Hello Norway</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <a href="/login">Login</a>
            </Button>
            <Button asChild>
              <a href="/signup">Sign up</a>
            </Button>
          </div>
        </nav>

        <section className="space-y-4">
          <Badge variant="secondary">For new immigrants in Norway</Badge>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Settle in, faster.
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Your first steps in Norway, in one clear plan.
          </p>
          <Button asChild size="lg">
            <a href="/signup">Start</a>
          </Button>
        </section>

        <section aria-labelledby="problem-title">
          <Card>
            <CardHeader>
              <CardTitle id="problem-title">The problem</CardTitle>
              <CardDescription>
                Paperwork and systems are hard to navigate alone.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section aria-labelledby="solution-title">
          <Card>
            <CardHeader>
              <CardTitle id="solution-title">The solution</CardTitle>
              <CardDescription>
                Hello Norway gives you a simple checklist with guidance.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section aria-labelledby="features-title">
          <Card>
            <CardHeader>
              <CardTitle id="features-title">Key features</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <CardTitle className="text-sm">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </CardContent>
          </Card>
        </section>

        <section aria-label="Call to action" className="flex justify-center">
          <Button asChild size="lg">
            <a href="/signup">Start</a>
          </Button>
        </section>
      </div>
    </main>
  );
}
