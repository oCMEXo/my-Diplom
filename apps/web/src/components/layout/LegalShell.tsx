import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "../ui/Logo";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-2 text-base leading-relaxed text-muted">{children}</div>
    </section>
  );
}

/** The page frame of the privacy notice and the terms of use: open to everyone, also without an account. */
export function LegalShell({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="relative min-h-screen px-5 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <main className="mx-auto w-full max-w-2xl space-y-8">
        <Link to="/" aria-label="Home" className="inline-block">
          <Wordmark />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-base text-muted">{intro}</p>
        </div>
        {children}
        <p className="border-t border-line pt-4 text-sm text-faint">
          <Link to="/privacy" className="underline hover:text-fg">
            Data and privacy
          </Link>
          {" · "}
          <Link to="/terms" className="underline hover:text-fg">
            Terms of use
          </Link>
        </p>
      </main>
    </div>
  );
}
