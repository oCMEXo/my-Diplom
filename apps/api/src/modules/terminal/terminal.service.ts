import { randomBytes } from "node:crypto";
import { prisma } from "@collab/db";
import type { TerminalTicket, TerminalTicketData } from "@collab/shared";
import { requireProjectRole } from "../../lib/authorization.js";
import { activeBranch } from "../../lib/branch.js";
import { storeTerminalTicket } from "../../lib/terminal-tickets.js";
import { projectTextFiles } from "../runs/runs.service.js";
import { takeRunSlot } from "../../lib/limits.js";

export async function openTerminal(
  userId: string,
  projectId: string,
  store: (ticket: string, data: TerminalTicketData) => Promise<void> = storeTerminalTicket,
): Promise<TerminalTicket> {
  await requireProjectRole(projectId, userId, "editor");
  takeRunSlot(userId);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const files = await projectTextFiles(projectId, await activeBranch(projectId));

  const ticket = randomBytes(24).toString("base64url");
  await store(ticket, { userId, userName: user.name, projectId, files });
  return { ticket };
}
