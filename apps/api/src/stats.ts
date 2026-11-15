// Prints the usage numbers of the last 7 days for the site owner:
//   pnpm --filter @collab/api stats
//   docker compose -f infra/gcp/docker-compose.yml exec api pnpm --filter @collab/api stats
import { prisma } from "@collab/db";
import { usageStats } from "./lib/usage.js";

const stats = await usageStats();
const rows: [string, string | number][] = [
  ["Active people (7 days)", stats.activeUsers],
  ["  of them also active the week before", stats.returningUsers],
  ["Active people the week before", stats.activeLastWeek],
  ["New accounts / new guests", `${stats.newAccounts} / ${stats.newGuests}`],
  ["Projects created", stats.projectsCreated],
  ["Sessions with 2+ people", stats.sharedSessions],
  ["Code runs", stats.runs],
  ["Students who joined a class", stats.classJoins],
  ["New projects (30 days) that had 2+ people", `${stats.sharedProjects30d} of ${stats.newProjects30d}`],
  [
    "Median time to the first shared session",
    stats.medianMinutesToSharedSession === null ? "no data yet" : `${stats.medianMinutesToSharedSession.toFixed(1)} min`,
  ],
];
const width = Math.max(...rows.map(([label]) => label.length));
for (const [label, value] of rows) console.log(`${label.padEnd(width)}  ${value}`);
await prisma.$disconnect();
