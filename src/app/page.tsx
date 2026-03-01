import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    title: "App Router",
    description:
      "File-based routing with layouts, loading states, and server components.",
  },
  {
    title: "Tailwind CSS v4",
    description: "Utility-first styling with dark mode support out of the box.",
  },
  {
    title: "Self-Hostable",
    description:
      "Runs anywhere Node.js is supported — Docker, VPS, or any cloud provider.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <Badge variant="secondary" className="uppercase tracking-wide">
            Next.js · Tailwind · TypeScript
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight">
            Hello, Norway 🇳🇴
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            A clean Next.js boilerplate with App Router, Tailwind CSS, and
            TypeScript.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <a
              href="https://nextjs.org/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the Docs →
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-sm">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
