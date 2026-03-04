import Link from "next/link";
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

const footerLinks = [
  {
    label: "🤝 Contribute",
    href: "https://github.com/simongottipalli/hello-norway/pulls",
  },
  {
    label: "🐛 Report an issue",
    href: "https://github.com/simongottipalli/hello-norway/issues/new/choose",
  },
  {
    label: "🧠 Collaborate",
    href: "https://github.com/simongottipalli/hello-norway/discussions",
  },
  {
    label: "💖 Donate",
    href: "https://github.com/sponsors/simongottipalli",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="space-y-4">
          <Badge variant="secondary">For new immigrants in Norway</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Settle in, faster.
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Your first steps in Norway, in one clear plan.
          </p>
          <Button asChild size="lg">
            <Link href="/onboarding">Start</Link>
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
                    <CardTitle as="h3" className="text-sm">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </CardContent>
          </Card>
        </section>

        <section aria-label="Call to action" className="flex justify-center">
          <Button asChild size="lg" className="h-14 px-10 text-lg shadow-lg">
            <Link href="/onboarding">Start</Link>
          </Button>
        </section>

        <footer className="border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            🏙️ Made in Oslo 🇳🇴
          </p>
          <nav
            aria-label="Footer links"
            className="mt-4 flex flex-wrap justify-center gap-2"
          >
            {footerLinks.map((footerLink) => {
              const [emoji, ...textParts] = String(footerLink.label).split(" ");
              const textLabel = textParts.join(" ") || String(footerLink.label);

              return (
                <Button key={footerLink.label} asChild variant="link" size="sm">
                  <Link href={footerLink.href} aria-label={textLabel}>
                    <span aria-hidden="true">{emoji}</span>
                    {textParts.length > 0 && ` ${textLabel}`}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </footer>
      </div>
    </main>
  );
}
