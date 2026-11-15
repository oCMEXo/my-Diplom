import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@collab/db";
import { presenceFileMessageSchema } from "@collab/shared";
import { requireProjectRole } from "../../lib/authorization.js";
import { verifyAccessToken } from "../../lib/jwt.js";
import { hub } from "../../lib/hub.js";
import { notePresence, recordActive } from "../../lib/usage.js";

const querySchema = z.object({
  token: z.string().min(1),
  projectId: z.string().uuid(),
});

export const CLOSE_UNAUTHORIZED = 4401;
export const CLOSE_FORBIDDEN = 4403;

export const realtimeRoutes: FastifyPluginAsync = async (app) => {
  app.get("/ws", { websocket: true }, async (socket, request) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      socket.close(CLOSE_UNAUTHORIZED, "invalid query");
      return;
    }

    let userId: string;
    try {
      userId = verifyAccessToken(parsed.data.token).sub;
    } catch {
      socket.close(CLOSE_UNAUTHORIZED, "invalid token");
      return;
    }

    try {
      await requireProjectRole(parsed.data.projectId, userId, "viewer");
    } catch {
      socket.close(CLOSE_FORBIDDEN, "not a project member");
      return;
    }

    if (socket.readyState !== socket.OPEN) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, isGuest: true },
    });
    if (socket.readyState !== socket.OPEN) return;

    const projectId = parsed.data.projectId;
    const subscription = hub.subscribe(projectId, socket, user);
    recordActive(userId);
    notePresence(projectId, hub.presence(projectId).length);
    const unsubscribe = () => {
      subscription();
      notePresence(projectId, hub.presence(projectId).length);
    };
    socket.on("message", (raw: Buffer) => {
      try {
        const message = presenceFileMessageSchema.safeParse(JSON.parse(raw.toString()));
        if (message.success) hub.setFile(parsed.data.projectId, socket, message.data.fileId);
      } catch {
        // not ours: nothing else is expected on this socket
      }
    });
    socket.on("close", unsubscribe);
    socket.on("error", unsubscribe);
  });
};
