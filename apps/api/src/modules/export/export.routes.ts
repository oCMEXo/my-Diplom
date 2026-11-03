import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { exportProject } from "./export.service.js";

const params = z.object({ projectId: z.string().uuid() });

export const exportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get(
    "/:projectId/export",
    { schema: { tags: ["files"], params } },
    async (request, reply) => {
      const { name, zip } = await exportProject(request.userId, request.params.projectId);
      return reply
        .header("Content-Type", "application/zip")
        .header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(`${name}.zip`)}`)
        .send(zip);
    },
  );
};
