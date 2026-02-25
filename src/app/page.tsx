export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-zinc-950 px-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <span className="inline-block rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 tracking-wide uppercase">
            Next.js · Tailwind · TypeScript
          </span>
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Hello, Norway 🇳🇴
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            A clean Next.js boilerplate with App Router, Tailwind CSS, and
            TypeScript.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm transition hover:bg-zinc-700 dark:hover:bg-zinc-100"
          >
            Read the Docs →
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {[
            {
              title: "App Router",
              description: "File-based routing with layouts, loading states, and server components.",
            },
            {
              title: "Tailwind CSS v4",
              description: "Utility-first styling with dark mode support out of the box.",
            },
            {
              title: "Self-Hostable",
              description: "Runs anywhere Node.js is supported — Docker, VPS, or any cloud provider.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5 text-left space-y-1.5"
            >
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                {feature.title}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
