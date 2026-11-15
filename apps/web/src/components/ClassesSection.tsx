import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import type { Classroom } from "@collab/shared";
import { api } from "../lib/api";

/** The classes this person teaches; nothing at all for someone who teaches none. */
export function ClassesSection() {
  const { data } = useQuery({ queryKey: ["classes"], queryFn: () => api.get<Classroom[]>("/classes") });
  if (!data || data.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-faint">Your classes</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((classroom) => (
          <li key={classroom.id}>
            <Link
              to={`/classes/${classroom.id}`}
              className="flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card transition hover:bg-raised"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-ink">
                <GraduationCap size={22} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-medium">{classroom.name}</span>
                <span className="block text-sm text-muted">
                  {classroom.studentCount === 1 ? "1 student" : `${classroom.studentCount} students`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
