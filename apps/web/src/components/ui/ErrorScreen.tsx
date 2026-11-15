import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { Button } from "./Button";

export function ErrorScreen({
  title,
  message,
  onRetry,
  extra,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md animate-pop rounded-xl bg-surface p-8 text-center shadow-card">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warn/15 text-warn">
          <TriangleAlert size={24} />
        </span>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mb-5 mt-1.5 text-base text-muted">{message}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              Try again
            </Button>
          )}
          <Link to="/">
            <Button>To my projects</Button>
          </Link>
        </div>
        {extra}
      </div>
    </div>
  );
}
