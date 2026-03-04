import Link from "next/link";
import { Button } from "@/components/ui/button";

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

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-6 text-center sm:px-6">
      <p className="text-sm text-muted-foreground">🏙️ Made in Oslo 🇳🇴</p>
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
  );
}
